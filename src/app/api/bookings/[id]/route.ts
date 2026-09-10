import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  bookings,
  customers,
  halls,
  payments,
  bookingTasks,
  bookingStaff,
  bookingAssets,
  bookingVendors,
  expenses,
  staff,
  assets,
  vendors,
  depositDeductions,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bookingId = parseInt(id);

  const [booking] = await db
    .select()
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(halls, eq(bookings.hallId, halls.id))
    .where(and(eq(bookings.id, bookingId), eq(bookings.venueId, session.venueId)))
    .limit(1);

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bookingPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId));

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
    .where(eq(bookingTasks.bookingId, bookingId));

  const staffAssignments = await db
    .select({
      id: bookingStaff.id,
      role: bookingStaff.role,
      staffId: bookingStaff.staffId,
      staffName: staff.name,
      staffPhone: staff.phone,
    })
    .from(bookingStaff)
    .leftJoin(staff, eq(bookingStaff.staffId, staff.id))
    .where(eq(bookingStaff.bookingId, bookingId));

  const assetAllocations = await db
    .select({
      id: bookingAssets.id,
      quantityAllocated: bookingAssets.quantityAllocated,
      returnStatus: bookingAssets.returnStatus,
      damageNotes: bookingAssets.damageNotes,
      assetId: bookingAssets.assetId,
      assetName: assets.name,
      category: assets.category,
    })
    .from(bookingAssets)
    .leftJoin(assets, eq(bookingAssets.assetId, assets.id))
    .where(eq(bookingAssets.bookingId, bookingId));

  const vendorEngagements = await db
    .select({
      id: bookingVendors.id,
      serviceDetails: bookingVendors.serviceDetails,
      agreedAmount: bookingVendors.agreedAmount,
      paidAmount: bookingVendors.paidAmount,
      paymentStatus: bookingVendors.paymentStatus,
      vendorId: bookingVendors.vendorId,
      vendorName: vendors.name,
      vendorCategory: vendors.category,
      vendorPhone: vendors.phone,
    })
    .from(bookingVendors)
    .leftJoin(vendors, eq(bookingVendors.vendorId, vendors.id))
    .where(eq(bookingVendors.bookingId, bookingId));

  const bookingExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.bookingId, bookingId));

  const deductions = await db
    .select()
    .from(depositDeductions)
    .where(eq(depositDeductions.bookingId, bookingId));

  return NextResponse.json({
    booking: {
      ...booking.bookings,
      customer: booking.customers,
      hall: booking.halls,
    },
    payments: bookingPayments,
    tasks,
    staffAssignments,
    assetAllocations,
    vendorEngagements,
    expenses: bookingExpenses,
    depositDeductions: deductions,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bookingId = parseInt(id);
  const body = await req.json();

  const [existing] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.venueId, session.venueId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle status change
  if (body.status && body.status !== existing.status) {
    const history = (existing.statusHistory as Array<{ status: string; date: string; by: string }>) || [];
    history.push({
      status: body.status,
      date: new Date().toISOString().split("T")[0],
      by: session.name,
    });
    body.statusHistory = history;

    // Auto-set countedForBilling
    if (body.status === "confirmed") {
      body.countedForBilling = true;
    }
    if (body.status === "cancelled") {
      body.countedForBilling = false;
    }
  }

  const [updated] = await db
    .update(bookings)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))
    .returning();

  return NextResponse.json({ booking: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["owner"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(bookings.id, parseInt(id)),
        eq(bookings.venueId, session.venueId)
      )
    );

  return NextResponse.json({ success: true });
}
