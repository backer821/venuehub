import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, customers, halls, users, venues } from "@/db/schema";
import { eq, and, gte, lte, sql, desc, or, ilike } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateBookingRef } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const hallId = searchParams.get("hallId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const conditions = [eq(bookings.venueId, session.venueId)];

  if (status && status !== "all") {
    conditions.push(sql`${bookings.status} = ${status}`);
  }
  if (hallId) conditions.push(eq(bookings.hallId, parseInt(hallId)));
  if (from) conditions.push(gte(bookings.eventDate, from));
  if (to) conditions.push(lte(bookings.eventDate, to));

  const rows = await db
    .select({
      id: bookings.id,
      bookingRef: bookings.bookingRef,
      eventDate: bookings.eventDate,
      sessionType: bookings.sessionType,
      eventType: bookings.eventType,
      status: bookings.status,
      source: bookings.source,
      guestCount: bookings.guestCount,
      totalAmount: bookings.totalAmount,
      paidAmount: bookings.paidAmount,
      balanceDue: bookings.balanceDue,
      specialRequirements: bookings.specialRequirements,
      createdAt: bookings.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerId: bookings.customerId,
      hallName: halls.name,
      hallId: bookings.hallId,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(halls, eq(bookings.hallId, halls.id))
    .where(and(...conditions))
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ bookings: rows, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Check subscription status for new bookings
  const [venue] = await db
    .select({ subscriptionStatus: venues.subscriptionStatus })
    .from(venues)
    .where(eq(venues.id, session.venueId))
    .limit(1);

  if (venue?.subscriptionStatus === "blocked" || venue?.subscriptionStatus === "suspended") {
    const msg =
      session.role === "owner"
        ? "Your subscription is blocked. Please resolve billing to create new bookings."
        : "New bookings are temporarily unavailable. Please contact the venue owner.";
    return NextResponse.json({ error: msg, subscriptionBlocked: true }, { status: 402 });
  }

  // Check availability
  const conflict = await db
    .select({ id: bookings.id, bookingRef: bookings.bookingRef })
    .from(bookings)
    .where(
      and(
        eq(bookings.hallId, body.hallId),
        eq(bookings.eventDate, body.eventDate),
        body.sessionType === "full_day"
          ? sql`${bookings.status} NOT IN ('cancelled')`
          : and(
              sql`${bookings.sessionType} IN (${body.sessionType}, 'full_day')`,
              sql`${bookings.status} NOT IN ('cancelled')`
            )
      )
    )
    .limit(1);

  if (conflict.length > 0) {
    return NextResponse.json(
      {
        error: `Hall is already booked for this date/session. Conflicting booking: ${conflict[0].bookingRef}`,
        conflict: conflict[0],
      },
      { status: 409 }
    );
  }

  const bookingRef = generateBookingRef();

  const [newBooking] = await db
    .insert(bookings)
    .values({
      venueId: session.venueId,
      hallId: body.hallId,
      customerId: body.customerId,
      bookingRef,
      eventDate: body.eventDate,
      sessionType: body.sessionType,
      startTime: body.startTime,
      endTime: body.endTime,
      eventType: body.eventType,
      guestCount: body.guestCount,
      packageId: body.packageId || null,
      totalAmount: body.totalAmount,
      advanceAmount: body.advanceAmount,
      paidAmount: "0",
      balanceDue: body.totalAmount,
      securityDeposit: body.securityDeposit || "0",
      status: body.status || "enquiry",
      source: body.source || "phone",
      specialRequirements: body.specialRequirements,
      internalNotes: body.internalNotes,
      addOns: body.addOns,
      countedForBilling: false,
      createdBy: session.userId,
      statusHistory: [
        {
          status: body.status || "enquiry",
          date: new Date().toISOString().split("T")[0],
          by: session.name,
        },
      ],
    })
    .returning();

  return NextResponse.json({ booking: newBooking }, { status: 201 });
}
