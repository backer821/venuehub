import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { halls, hallPhotos, pricingRules, packages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(halls)
    .where(and(eq(halls.venueId, session.venueId), eq(halls.isActive, true)));

  const result = await Promise.all(
    rows.map(async (hall) => {
      const photos = await db
        .select()
        .from(hallPhotos)
        .where(eq(hallPhotos.hallId, hall.id));
      const pricing = await db
        .select()
        .from(pricingRules)
        .where(and(eq(pricingRules.hallId, hall.id), eq(pricingRules.isActive, true)));
      const pkgs = await db
        .select()
        .from(packages)
        .where(and(eq(packages.hallId, hall.id), eq(packages.isActive, true)));
      return { ...hall, photos, pricing, packages: pkgs };
    })
  );

  return NextResponse.json({ halls: result });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const [hall] = await db
    .insert(halls)
    .values({
      venueId: session.venueId,
      name: body.name,
      capacity: body.capacity,
      hasAc: body.hasAc || false,
      parkingCount: body.parkingCount || 0,
      stageSize: body.stageSize,
      stageType: body.stageType,
      cateringRule: body.cateringRule || "outside_allowed",
      hasGeneratorBackup: body.hasGeneratorBackup || false,
      hasBridalRoom: body.hasBridalRoom || false,
      hasProjector: body.hasProjector || false,
      hasAv: body.hasAv || false,
      isAccessible: body.isAccessible || false,
      description: body.description,
      isBookable: false, // Until requirements met
    })
    .returning();

  return NextResponse.json({ hall }, { status: 201 });
}
