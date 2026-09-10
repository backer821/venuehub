import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden - Owner only" }, { status: 403 });
  }

  const body = await req.json();

  // Check duplicate
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.venueId, session.venueId),
        or(
          body.email ? eq(users.email, body.email) : undefined,
          body.phone ? eq(users.phone, body.phone) : undefined
        )!
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: "User with this email/phone already exists" }, { status: 409 });
  }

  const hash = await bcrypt.hash(body.password || "password123", 10);

  const [user] = await db
    .insert(users)
    .values({
      venueId: session.venueId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      passwordHash: hash,
      role: body.role,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ user: { ...user, passwordHash: undefined } }, { status: 201 });
}
