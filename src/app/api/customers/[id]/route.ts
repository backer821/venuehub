import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, bookings, communicationLogs, halls } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customerId = parseInt(id);

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.venueId, session.venueId)))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customerBookings = await db
    .select({
      id: bookings.id,
      bookingRef: bookings.bookingRef,
      eventDate: bookings.eventDate,
      sessionType: bookings.sessionType,
      eventType: bookings.eventType,
      status: bookings.status,
      totalAmount: bookings.totalAmount,
      paidAmount: bookings.paidAmount,
      balanceDue: bookings.balanceDue,
      hallName: halls.name,
    })
    .from(bookings)
    .leftJoin(halls, eq(bookings.hallId, halls.id))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.eventDate));

  const logs = await db
    .select()
    .from(communicationLogs)
    .where(eq(communicationLogs.customerId, customerId))
    .orderBy(desc(communicationLogs.createdAt));

  return NextResponse.json({ customer, bookings: customerBookings, communicationLogs: logs });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [updated] = await db
    .update(customers)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(customers.id, parseInt(id)), eq(customers.venueId, session.venueId)))
    .returning();

  return NextResponse.json({ customer: updated });
}
