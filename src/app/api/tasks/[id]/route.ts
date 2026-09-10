import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookingTasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
  if (body.status === "done" && !body.completedAt) {
    updateData.completedAt = new Date();
  }

  const [updated] = await db
    .update(bookingTasks)
    .set(updateData)
    .where(eq(bookingTasks.id, parseInt(id)))
    .returning();

  return NextResponse.json({ task: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(bookingTasks).where(eq(bookingTasks.id, parseInt(id)));

  return NextResponse.json({ success: true });
}
