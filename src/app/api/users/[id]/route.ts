import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden - Owner only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const [updated] = await db
    .update(users)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(users.id, parseInt(id)), eq(users.venueId, session.venueId)))
    .returning();

  return NextResponse.json({ user: { ...updated, passwordHash: undefined } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden - Owner only" }, { status: 403 });
  }

  const { id } = await params;

  // Don't allow deleting self
  if (parseInt(id) === session.userId) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  await db
    .update(users)
    .set({ isActive: false })
    .where(and(eq(users.id, parseInt(id)), eq(users.venueId, session.venueId)));

  return NextResponse.json({ success: true });
}
