import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { staff, attendance } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.venueId, session.venueId))
    .orderBy(staff.name);

  return NextResponse.json({ staff: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const [member] = await db
    .insert(staff)
    .values({
      venueId: session.venueId,
      name: body.name,
      role: body.role,
      phone: body.phone,
      email: body.email,
      joiningDate: body.joiningDate,
      notes: body.notes,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ staff: member }, { status: 201 });
}
