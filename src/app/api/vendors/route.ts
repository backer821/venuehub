import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.venueId, session.venueId), eq(vendors.isActive, true)))
    .orderBy(vendors.name);

  return NextResponse.json({ vendors: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const [vendor] = await db
    .insert(vendors)
    .values({
      venueId: session.venueId,
      name: body.name,
      category: body.category,
      phone: body.phone,
      email: body.email,
      address: body.address,
      rateCard: body.rateCard,
      rating: body.rating,
      notes: body.notes,
    })
    .returning();

  return NextResponse.json({ vendor }, { status: 201 });
}
