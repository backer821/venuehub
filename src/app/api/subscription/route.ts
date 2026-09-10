import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { venues, bookings, subscriptionInvoices } from "@/db/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [venue] = await db
    .select()
    .from(venues)
    .where(eq(venues.id, session.venueId))
    .limit(1);

  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Current cycle bookings count
  const cycleStart = venue.currentCycleStart || new Date().toISOString().split("T")[0];
  const [cycleBookings] = await db
    .select({ count: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.venueId, session.venueId),
        eq(bookings.status, "confirmed"),
        eq(bookings.countedForBilling, true),
        gte(bookings.createdAt, new Date(cycleStart))
      )
    );

  const invoices = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.venueId, session.venueId))
    .orderBy(sql`${subscriptionInvoices.createdAt} DESC`);

  const freeQuota = venue.freeBookingQuota || 5;
  const usedBookings = cycleBookings.count;
  const overageBookings = Math.max(0, usedBookings - freeQuota);
  const perBookingRate = parseFloat(String(venue.perBookingRate || 99));

  return NextResponse.json({
    venue: {
      id: venue.id,
      name: venue.name,
      subscriptionStatus: venue.subscriptionStatus,
      subscriptionPlan: venue.subscriptionPlan,
      trialStartDate: venue.trialStartDate,
      currentCycleStart: venue.currentCycleStart,
      freeBookingQuota: freeQuota,
      perBookingRate: venue.perBookingRate,
    },
    usage: {
      usedBookings,
      freeQuota,
      overageBookings,
      estimatedOverageFee: overageBookings * perBookingRate,
    },
    invoices,
  });
}
