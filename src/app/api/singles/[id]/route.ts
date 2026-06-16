import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { populatePrices } from "@/lib/pricing-engine";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const item = await prisma.stockItem.findUnique({
      where: { id: resolvedParams.id },
      include: { scryfallCard: true }
    });

    if (!item) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const relatedItems = await prisma.stockItem.findMany({
      where: {
        scryfallCard: {
          oracleId: item.scryfallCard.oracleId
        },
        id: { not: item.id }
      },
      include: { scryfallCard: true }
    });

    const populatedItem = (await populatePrices([item]))[0];
    const populatedRelated = await populatePrices(relatedItems);

    return NextResponse.json({ item: populatedItem, relatedItems: populatedRelated });
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
