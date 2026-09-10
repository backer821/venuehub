import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, staff } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions = [eq(attendance.venueId, session.venueId)];
  if (date) conditions.push(eq(attendance.date, date));
  if (from) conditions.push(gte(attendance.date, from));
  if (to) conditions.push(lte(attendance.date, to));

  const rows = await db
    .select({
      id: attendance.id,
      date: attendance.date,
      status: attendance.status,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      notes: attendance.notes,
      staffId: attendance.staffId,
      staffName: staff.name,
      staffRole: staff.role,
    })
    .from(attendance)
    .leftJoin(staff, eq(attendance.staffId, staff.id))
    .where(and(...conditions));

  return NextResponse.json({ attendance: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Upsert attendance
  const [existing] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(
      and(eq(attendance.staffId, body.staffId), eq(attendance.date, body.date))
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(attendance)
      .set({
        status: body.status,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        notes: body.notes,
      })
      .where(eq(attendance.id, existing.id))
      .returning();
    return NextResponse.json({ attendance: updated });
  }

  const [record] = await db
    .insert(attendance)
    .values({
      staffId: body.staffId,
      venueId: session.venueId,
      date: body.date,
      status: body.status || "present",
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      notes: body.notes,
    })
    .returning();

  return NextResponse.json({ attendance: record }, { status: 201 });
}
