import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, bookings } from "@/db/schema";
import { eq, and, gte, lte, sum, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");

  const conditions = [eq(expenses.venueId, session.venueId)];
  if (from) conditions.push(gte(expenses.expenseDate, from));
  if (to) conditions.push(lte(expenses.expenseDate, to));
  if (category && category !== "all") conditions.push(eq(expenses.category, category as "electricity" | "salaries" | "property_tax" | "maintenance" | "marketing" | "other"));

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate));

  const [totalAmount] = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(...conditions));

  return NextResponse.json({ expenses: rows, total: totalAmount.total });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "accountant"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const [expense] = await db
    .insert(expenses)
    .values({
      venueId: session.venueId,
      bookingId: body.bookingId || null,
      category: body.category,
      description: body.description,
      amount: body.amount,
      expenseDate: body.expenseDate,
      isRecurring: body.isRecurring || false,
      frequency: body.frequency,
      createdBy: session.userId,
    })
    .returning();

  return NextResponse.json({ expense }, { status: 201 });
}
