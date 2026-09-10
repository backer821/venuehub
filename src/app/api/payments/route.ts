import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, bookings, customers, halls } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");

  if (bookingId) {
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, parseInt(bookingId)))
      .orderBy(desc(payments.createdAt));
    return NextResponse.json({ payments: rows });
  }

  // Outstanding dues
  const outstanding = await db
    .select({
      bookingId: bookings.id,
      bookingRef: bookings.bookingRef,
      eventDate: bookings.eventDate,
      sessionType: bookings.sessionType,
      eventType: bookings.eventType,
      status: bookings.status,
      totalAmount: bookings.totalAmount,
      paidAmount: bookings.paidAmount,
      balanceDue: bookings.balanceDue,
      customerName: customers.name,
      customerPhone: customers.phone,
      hallName: halls.name,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(halls, eq(bookings.hallId, halls.id))
    .where(
      and(
        eq(bookings.venueId, session.venueId),
        sql`CAST(${bookings.balanceDue} AS NUMERIC) > 0`,
        sql`${bookings.status} IN ('confirmed', 'tentative')`
      )
    )
    .orderBy(bookings.eventDate);

  return NextResponse.json({ outstanding });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "accountant", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, body.bookingId), eq(bookings.venueId, session.venueId)))
    .limit(1);

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: body.bookingId,
      venueId: session.venueId,
      type: body.type,
      amount: body.amount,
      mode: body.mode,
      paymentDate: body.paymentDate,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      createdBy: session.userId,
    })
    .returning();

  // Update booking payment totals
  const currentPaid = parseFloat(String(booking.paidAmount || 0));
  const paymentAmount = parseFloat(String(body.amount || 0));
  const totalAmount = parseFloat(String(booking.totalAmount || 0));

  let newPaid = currentPaid;
  if (body.type === "advance" || body.type === "balance") {
    newPaid = currentPaid + paymentAmount;
  } else if (body.type === "refund" || body.type === "deposit_refund") {
    newPaid = currentPaid - paymentAmount;
  }

  const newBalance = Math.max(0, totalAmount - newPaid);

  const updateData: Record<string, unknown> = {
    paidAmount: newPaid.toString(),
    balanceDue: newBalance.toString(),
    updatedAt: new Date(),
  };

  // Auto-confirm on advance payment
  if (
    (body.type === "advance" || body.type === "balance") &&
    booking.status === "tentative"
  ) {
    updateData.status = "confirmed";
    updateData.countedForBilling = true;
    const history = (booking.statusHistory as Array<{ status: string; date: string; by: string }>) || [];
    history.push({
      status: "confirmed",
      date: new Date().toISOString().split("T")[0],
      by: "System (payment received)",
    });
    updateData.statusHistory = history;
  }

  await db.update(bookings).set(updateData).where(eq(bookings.id, body.bookingId));

  return NextResponse.json({ payment }, { status: 201 });
}
