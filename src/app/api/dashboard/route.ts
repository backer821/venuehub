import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, payments, customers, halls, expenses } from "@/db/schema";
import { eq, and, gte, lte, count, sum, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = session;
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const [totalBookings] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(eq(bookings.venueId, venueId), eq(bookings.status, "confirmed")));

  const [todayBookings] = await db
    .select({ count: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.venueId, venueId),
        eq(bookings.eventDate, today),
        sql`${bookings.status} IN ('confirmed', 'tentative')`
      )
    );

  const [monthRevenue] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(
      and(
        eq(payments.venueId, venueId),
        gte(payments.paymentDate, monthStartStr),
        sql`${payments.type} NOT IN ('refund', 'deposit_refund')`
      )
    );

  const [pendingDues] = await db
    .select({ total: sum(bookings.balanceDue) })
    .from(bookings)
    .where(
      and(
        eq(bookings.venueId, venueId),
        sql`${bookings.status} IN ('confirmed', 'tentative')`,
        sql`CAST(${bookings.balanceDue} AS NUMERIC) > 0`
      )
    );

  const [totalCustomers] = await db
    .select({ count: count() })
    .from(customers)
    .where(eq(customers.venueId, venueId));

  const [totalHalls] = await db
    .select({ count: count() })
    .from(halls)
    .where(and(eq(halls.venueId, venueId), eq(halls.isActive, true)));

  const [monthExpenses] = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(
      and(
        eq(expenses.venueId, venueId),
        gte(expenses.expenseDate, monthStartStr)
      )
    );

  const upcomingBookings = await db
    .select({
      id: bookings.id,
      bookingRef: bookings.bookingRef,
      eventDate: bookings.eventDate,
      sessionType: bookings.sessionType,
      eventType: bookings.eventType,
      status: bookings.status,
      guestCount: bookings.guestCount,
      totalAmount: bookings.totalAmount,
      balanceDue: bookings.balanceDue,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.venueId, venueId),
        gte(bookings.eventDate, today),
        sql`${bookings.status} IN ('confirmed', 'tentative')`
      )
    )
    .limit(5);

  const recentPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      type: payments.type,
      mode: payments.mode,
      paymentDate: payments.paymentDate,
      bookingId: payments.bookingId,
    })
    .from(payments)
    .where(eq(payments.venueId, venueId))
    .orderBy(sql`${payments.createdAt} DESC`)
    .limit(5);

  const statusBreakdown = await db
    .select({
      status: bookings.status,
      count: count(),
    })
    .from(bookings)
    .where(eq(bookings.venueId, venueId))
    .groupBy(bookings.status);

  const revenueVsExpenses = {
    revenue: parseFloat(String(monthRevenue.total || 0)),
    expenses: parseFloat(String(monthExpenses.total || 0)),
    profit:
      parseFloat(String(monthRevenue.total || 0)) -
      parseFloat(String(monthExpenses.total || 0)),
  };

  return NextResponse.json({
    kpis: {
      totalBookings: totalBookings.count,
      todayBookings: todayBookings.count,
      monthRevenue: parseFloat(String(monthRevenue.total || 0)),
      pendingDues: parseFloat(String(pendingDues.total || 0)),
      totalCustomers: totalCustomers.count,
      totalHalls: totalHalls.count,
      monthExpenses: parseFloat(String(monthExpenses.total || 0)),
    },
    upcomingBookings,
    recentPayments,
    statusBreakdown,
    revenueVsExpenses,
  });
}
