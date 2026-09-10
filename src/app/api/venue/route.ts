import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { venues, licenceDocuments, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

  const licences = await db
    .select()
    .from(licenceDocuments)
    .where(eq(licenceDocuments.venueId, session.venueId));

  const venueUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.venueId, session.venueId));

  return NextResponse.json({ venue, licences, users: venueUsers });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const [updated] = await db
    .update(venues)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(venues.id, session.venueId))
    .returning();

  return NextResponse.json({ venue: updated });
}
