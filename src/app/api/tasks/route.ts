import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookingTasks, taskTemplates, staff } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");

  if (bookingId) {
    const tasks = await db
      .select({
        id: bookingTasks.id,
        title: bookingTasks.title,
        description: bookingTasks.description,
        status: bookingTasks.status,
        dueTime: bookingTasks.dueTime,
        completedAt: bookingTasks.completedAt,
        assignedStaffId: bookingTasks.assignedStaffId,
        staffName: staff.name,
      })
      .from(bookingTasks)
      .leftJoin(staff, eq(bookingTasks.assignedStaffId, staff.id))
      .where(eq(bookingTasks.bookingId, parseInt(bookingId)));
    return NextResponse.json({ tasks });
  }

  const templates = await db
    .select()
    .from(taskTemplates)
    .where(and(eq(taskTemplates.venueId, session.venueId), eq(taskTemplates.isActive, true)));

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.type === "template") {
    const [template] = await db
      .insert(taskTemplates)
      .values({
        venueId: session.venueId,
        name: body.name,
        description: body.description,
        tasks: body.tasks,
      })
      .returning();
    return NextResponse.json({ template }, { status: 201 });
  }

  // Create task
  const [task] = await db
    .insert(bookingTasks)
    .values({
      bookingId: body.bookingId,
      title: body.title,
      description: body.description,
      assignedStaffId: body.assignedStaffId || null,
      status: "pending",
      dueTime: body.dueTime,
    })
    .returning();

  return NextResponse.json({ task }, { status: 201 });
}
