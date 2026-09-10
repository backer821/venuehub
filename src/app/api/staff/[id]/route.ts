import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { staff, attendance, bookingStaff, bookingTasks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // Never hard delete - use status flag
  if (body.delete) {
    const [updated] = await db
      .update(staff)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(staff.id, parseInt(id)), eq(staff.venueId, session.venueId)))
      .returning();
    return NextResponse.json({ staff: updated });
  }

  const [updated] = await db
    .update(staff)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(staff.id, parseInt(id)), eq(staff.venueId, session.venueId)))
    .returning();

  return NextResponse.json({ staff: updated });
}
