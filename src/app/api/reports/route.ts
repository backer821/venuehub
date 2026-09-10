import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, payments, expenses, halls, customers } from "@/db/schema";
import { eq, and, gte, lte, sql, count, sum } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "revenue";
  const from = searchParams.get("from") || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
  const { venueId } = session;

  if (type === "revenue") {
    const revenueData = await db
      .select({
        month: sql<string>`TO_CHAR(${payments.paymentDate}::date, 'Mon YYYY')`,
        total: sum(payments.amount),
      })
      .from(payments)
      .where(
        and(
          eq(payments.venueId, venueId),
          gte(payments.paymentDate, from),
          lte(payments.paymentDate, to),
          sql`${payments.type} NOT IN ('refund', 'deposit_refund')`
        )
      )
      .groupBy(sql`TO_CHAR(${payments.paymentDate}::date, 'Mon YYYY'), DATE_TRUNC('month', ${payments.paymentDate}::date)`)
      .orderBy(sql`DATE_TRUNC('month', ${payments.paymentDate}::date)`);

    const expenseData = await db
      .select({
        month: sql<string>`TO_CHAR(${expenses.expenseDate}::date, 'Mon YYYY')`,
        total: sum(expenses.amount),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.venueId, venueId),
          gte(expenses.expenseDate, from),
          lte(expenses.expenseDate, to)
        )
      )
      .groupBy(sql`TO_CHAR(${expenses.expenseDate}::date, 'Mon YYYY'), DATE_TRUNC('month', ${expenses.expenseDate}::date)`)
      .orderBy(sql`DATE_TRUNC('month', ${expenses.expenseDate}::date)`);

    return NextResponse.json({ revenueData, expenseData });
  }

  if (type === "occupancy") {
    const allHalls = await db
      .select({ id: halls.id, name: halls.name })
      .from(halls)
      .where(eq(halls.venueId, venueId));

    const occupancyData = await db
      .select({
        hallId: bookings.hallId,
        hallName: halls.name,
        month: sql<string>`TO_CHAR(${bookings.eventDate}::date, 'Mon YYYY')`,
        bookingCount: count(),
      })
      .from(bookings)
      .leftJoin(halls, eq(bookings.hallId, halls.id))
      .where(
        and(
          eq(bookings.venueId, venueId),
          gte(bookings.eventDate, from),
          lte(bookings.eventDate, to),
          sql`${bookings.status} IN ('confirmed', 'completed')`
        )
      )
      .groupBy(
        bookings.hallId,
        halls.name,
        sql`TO_CHAR(${bookings.eventDate}::date, 'Mon YYYY'), DATE_TRUNC('month', ${bookings.eventDate}::date)`
      )
      .orderBy(sql`DATE_TRUNC('month', ${bookings.eventDate}::date)`);

    return NextResponse.json({ occupancyData, halls: allHalls });
  }

  if (type === "outstanding") {
    const outstanding = await db
      .select({
        bookingRef: bookings.bookingRef,
        eventDate: bookings.eventDate,
        eventType: bookings.eventType,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
        paidAmount: bookings.paidAmount,
        balanceDue: bookings.balanceDue,
        customerName: customers.name,
        customerPhone: customers.phone,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .where(
        and(
          eq(bookings.venueId, venueId),
          sql`CAST(${bookings.balanceDue} AS NUMERIC) > 0`,
          sql`${bookings.status} IN ('confirmed', 'tentative')`
        )
      )
      .orderBy(bookings.eventDate);

    return NextResponse.json({ outstanding });
  }

  if (type === "conversion") {
    const conversionData = await db
      .select({
        status: bookings.status,
        count: count(),
        source: bookings.source,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.venueId, venueId),
          gte(bookings.eventDate, from),
          lte(bookings.eventDate, to)
        )
      )
      .groupBy(bookings.status, bookings.source);

    return NextResponse.json({ conversionData });
  }

  if (type === "expenses") {
    const expensesByCategory = await db
      .select({
        category: expenses.category,
        total: sum(expenses.amount),
        count: count(),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.venueId, venueId),
          gte(expenses.expenseDate, from),
          lte(expenses.expenseDate, to)
        )
      )
      .groupBy(expenses.category);

    return NextResponse.json({ expensesByCategory });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
