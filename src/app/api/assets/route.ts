import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assets, maintenanceLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(assets)
    .where(and(eq(assets.venueId, session.venueId), eq(assets.isActive, true)));

  return NextResponse.json({ assets: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const [asset] = await db
    .insert(assets)
    .values({
      venueId: session.venueId,
      name: body.name,
      category: body.category,
      totalQuantity: body.totalQuantity || 1,
      availableQuantity: body.totalQuantity || 1,
      purchaseDate: body.purchaseDate,
      purchaseCost: body.purchaseCost,
      condition: body.condition || "good",
      notes: body.notes,
    })
    .returning();

  return NextResponse.json({ asset }, { status: 201 });
}
