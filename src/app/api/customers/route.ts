import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, bookings } from "@/db/schema";
import { eq, and, ilike, or, count, sum, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const conditions = [eq(customers.venueId, session.venueId)];
  if (search) {
    conditions.push(
      or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
        ilike(customers.email, `%${search}%`)
      )!
    );
  }

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      notes: customers.notes,
      createdAt: customers.createdAt,
      bookingCount: count(bookings.id),
      totalValue: sum(bookings.totalAmount),
    })
    .from(customers)
    .leftJoin(bookings, eq(bookings.customerId, customers.id))
    .where(and(...conditions))
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt));

  return NextResponse.json({ customers: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Check for duplicate phone
  if (body.phone) {
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.venueId, session.venueId),
          eq(customers.phone, body.phone)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Customer with this phone number already exists", existingId: existing.id },
        { status: 409 }
      );
    }
  }

  const [customer] = await db
    .insert(customers)
    .values({
      venueId: session.venueId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
    })
    .returning();

  return NextResponse.json({ customer }, { status: 201 });
}
