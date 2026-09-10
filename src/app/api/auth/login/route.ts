import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, venues } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/phone and password are required" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        venueId: users.venueId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          or(eq(users.email, identifier), eq(users.phone, identifier)),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.venueId) {
      return NextResponse.json(
        { error: "No venue associated with this account" },
        { status: 403 }
      );
    }

    const [venue] = await db
      .select({
        id: venues.id,
        name: venues.name,
        subscriptionStatus: venues.subscriptionStatus,
      })
      .from(venues)
      .where(eq(venues.id, user.venueId))
      .limit(1);

    const token = await signToken({
      userId: user.id,
      venueId: user.venueId,
      role: user.role,
      name: user.name,
      email: user.email || undefined,
    });

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        venueId: user.venueId,
        venueName: venue?.name,
        subscriptionStatus: venue?.subscriptionStatus,
      },
    });

    response.cookies.set("vh_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
