import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, venues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      venueId: users.venueId,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || !user.isActive) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  let venueName = "";
  let subscriptionStatus = "active";
  if (user.venueId) {
    const [venue] = await db
      .select({ name: venues.name, subscriptionStatus: venues.subscriptionStatus })
      .from(venues)
      .where(eq(venues.id, user.venueId))
      .limit(1);
    venueName = venue?.name || "";
    subscriptionStatus = venue?.subscriptionStatus || "active";
  }

  return NextResponse.json({
    user: {
      ...user,
      venueName,
      subscriptionStatus,
    },
  });
}
