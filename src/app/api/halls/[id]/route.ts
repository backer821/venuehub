import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { halls, hallPhotos, pricingRules, packages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const hallId = parseInt(id);

  const [hall] = await db
    .select()
    .from(halls)
    .where(and(eq(halls.id, hallId), eq(halls.venueId, session.venueId)))
    .limit(1);

  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await db.select().from(hallPhotos).where(eq(hallPhotos.hallId, hallId));
  const pricing = await db
    .select()
    .from(pricingRules)
    .where(eq(pricingRules.hallId, hallId));
  const pkgs = await db.select().from(packages).where(eq(packages.hallId, hallId));

  return NextResponse.json({ hall: { ...hall, photos, pricing, packages: pkgs } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const hallId = parseInt(id);
  const body = await req.json();

  // Check bookable requirements
  if (body.isBookable) {
    const [hall] = await db.select().from(halls).where(eq(halls.id, hallId)).limit(1);
    const photos = await db.select().from(hallPhotos).where(eq(hallPhotos.hallId, hallId));
    const pricing = await db
      .select()
      .from(pricingRules)
      .where(and(eq(pricingRules.hallId, hallId), eq(pricingRules.isActive, true)));

    if (!hall?.capacity || photos.length === 0 || pricing.length === 0) {
      return NextResponse.json(
        {
          error:
            "Hall requires capacity, at least one pricing rule, and at least one photo to be made bookable",
        },
        { status: 400 }
      );
    }
  }

  const [updated] = await db
    .update(halls)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(halls.id, hallId), eq(halls.venueId, session.venueId)))
    .returning();

  return NextResponse.json({ hall: updated });
}
