import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function main() {
  const card = await prisma.scryfallCard.findFirst();
  if (!card) {
    console.log("No hay cartas en la base de datos.");
    return;
  }

  console.log(`Generando historial para: ${card.name}`);
  
  const basePrice = card.priceEur || 10.0;
  const now = new Date();

  const data = [];
  for (let i = 10; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Fluctuación aleatoria
    const fluctuation = 1 + (Math.random() * 0.2 - 0.1); 
    data.push({
      scryfallCardId: card.id,
      priceEur: basePrice * fluctuation,
      priceEurFoil: (basePrice * 1.5) * fluctuation,
      recordedAt: date
    });
  }

  await prisma.priceHistory.createMany({ data });
  console.log("¡Historial generado con éxito!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
