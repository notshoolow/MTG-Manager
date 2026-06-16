import { PrismaClient } from '../generated/client';
import { subDays, subMonths, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING MOCK DATA FOR BI DASHBOARD ---');

  // 1. Asegurar la existencia del usuario y la tienda por defecto
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('Creating default user...');
    user = await prisma.user.create({
      data: {
        name: 'Gerente de Tienda',
        email: 'gerente@mtgstore.com',
        role: 'ADMIN',
        storeCredit: 500.0,
      },
    });
  }

  let store = await prisma.store.findFirst();
  if (!store) {
    console.log('Creating default store...');
    store = await prisma.store.create({
      data: {
        name: 'MTG Sanctuary',
        ownerId: user.id,
      },
    });
  }

  // 2. Asegurar la existencia de cartas de Scryfall (ScryfallCards)
  let cards = await prisma.scryfallCard.findMany({ take: 5 });
  if (cards.length === 0) {
    console.log('Creating dummy Scryfall cards...');
    const dummyCardsData = [
      {
        id: 'card-1',
        oracleId: 'oracle-1',
        name: 'Black Lotus',
        setCode: '2ed',
        setName: 'Unlimited Edition',
        collectorNumber: '233',
        rarity: 'rare',
        typeLine: 'Artifact',
        colors: '',
        colorIdentity: '',
        imageUris: JSON.stringify({ normal: 'https://cards.scryfall.io/normal/front/9/0/9041b4b1-a57e-4f32-8e37-f8e6b668e278.jpg' }),
        finishes: 'nonfoil',
        scryfallUri: 'https://scryfall.com/card/2ed/233/black-lotus',
        legalities: '{}',
        priceEur: 15000.0,
        priceUsd: 18000.0,
      },
      {
        id: 'card-2',
        oracleId: 'oracle-2',
        name: 'Mox Sapphire',
        setCode: '2ed',
        setName: 'Unlimited Edition',
        collectorNumber: '263',
        rarity: 'rare',
        typeLine: 'Artifact',
        colors: '',
        colorIdentity: '',
        imageUris: JSON.stringify({ normal: 'https://cards.scryfall.io/normal/front/e/a/ea17e25a-43c2-4860-9ca9-54a4c58f001c.jpg' }),
        finishes: 'nonfoil',
        scryfallUri: 'https://scryfall.com/card/2ed/263/mox-sapphire',
        legalities: '{}',
        priceEur: 5000.0,
        priceUsd: 6000.0,
      },
      {
        id: 'card-3',
        oracleId: 'oracle-3',
        name: 'Lightning Bolt',
        setCode: 'a25',
        setName: 'Masters 25',
        collectorNumber: '141',
        rarity: 'common',
        typeLine: 'Instant',
        colors: 'R',
        colorIdentity: 'R',
        imageUris: JSON.stringify({ normal: 'https://cards.scryfall.io/normal/front/f/2/f29ba16f-c8fb-42fe-aabf-87089cb214a7.jpg' }),
        finishes: 'nonfoil,foil',
        scryfallUri: 'https://scryfall.com/card/a25/141/lightning-bolt',
        legalities: '{}',
        priceEur: 2.5,
        priceUsd: 3.0,
      },
      {
        id: 'card-4',
        oracleId: 'oracle-4',
        name: 'Counterspell',
        setCode: 'mh2',
        setName: 'Modern Horizons 2',
        collectorNumber: '267',
        rarity: 'uncommon',
        typeLine: 'Instant',
        colors: 'U',
        colorIdentity: 'U',
        imageUris: JSON.stringify({ normal: 'https://cards.scryfall.io/normal/front/1/9/1920d758-9a86-44a0-acb7-1c31de48a435.jpg' }),
        finishes: 'nonfoil,foil',
        scryfallUri: 'https://scryfall.com/card/mh2/267/counterspell',
        legalities: '{}',
        priceEur: 1.2,
        priceUsd: 1.5,
      },
      {
        id: 'card-5',
        oracleId: 'oracle-5',
        name: 'Sol Ring',
        setCode: 'c21',
        setName: 'Commander 2021',
        collectorNumber: '263',
        rarity: 'uncommon',
        typeLine: 'Artifact',
        colors: '',
        colorIdentity: '',
        imageUris: JSON.stringify({ normal: 'https://cards.scryfall.io/normal/front/4/c/4cac66b2-1130-4e93-8030-f4d1d86d5023.jpg' }),
        finishes: 'nonfoil',
        scryfallUri: 'https://scryfall.com/card/c21/263/sol-ring',
        legalities: '{}',
        priceEur: 1.5,
        priceUsd: 2.0,
      }
    ];

    for (const dCard of dummyCardsData) {
      await prisma.scryfallCard.create({ data: dCard });
    }
    cards = await prisma.scryfallCard.findMany();
  }

  console.log('Cleaning up old transactional mock data...');
  // Eliminación previa de las tablas que contienen claves foráneas
  await prisma.matchPlayer.deleteMany();
  await prisma.match.deleteMany();
  await prisma.playerRegistration.deleteMany();
  await prisma.userPrize.deleteMany();
  await prisma.tournamentPrize.deleteMany();
  await prisma.tournamentMission.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.flashSaleItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.buylistItem.deleteMany();
  await prisma.buylistRequest.deleteMany();
  await prisma.stockItem.deleteMany();

  // 4. Crear elementos de stock (StockItems)
  console.log('Creating stock items...');
  const stockItems = [];
  const finishes = ['nonfoil', 'foil'];
  const conditions = ['NM', 'LP', 'MP'];
  const languages = ['en', 'es'];

  for (const card of cards) {
    for (const finish of finishes) {
      for (const condition of conditions) {
        for (const language of languages) {
          // Cálculo estándar del precio en función del precio base de la carta
          const basePrice = card.priceEur || 10.0;
          const conditionMultiplier = condition === 'NM' ? 1.0 : condition === 'LP' ? 0.9 : 0.8;
          const finishMultiplier = finish === 'foil' ? 1.5 : 1.0;
          const salePrice = Number((basePrice * conditionMultiplier * finishMultiplier).toFixed(2));

          const item = await prisma.stockItem.create({
            data: {
              scryfallCardId: card.id,
              condition,
              finish,
              language,
              quantity: Math.floor(Math.random() * 10) + 1, // Entre 1 y 10 unidades
              salePrice,
              priceMode: 'MANUAL',
            }
          });
          stockItems.push(item);
        }
      }
    }
  }

  // 5. Crear pedidos mock (distribuidos en los últimos 12 meses)
  console.log('Creating mock orders...');
  const now = new Date();
  
  // Creación de pedidos en días diversos de los últimos 12 meses
  const statuses = ['CONFIRMED', 'PENDING', 'CANCELLED'];
  
  for (let i = 0; i < 150; i++) {
    // Fecha aleatoria dentro de los últimos 365 días
    const daysAgo = Math.floor(Math.random() * 365);
    const createdAt = subDays(now, daysAgo);
    
    // Estado ponderado (mayoritariamente CONFIRMED)
    const statusRand = Math.random();
    const status = statusRand < 0.8 ? 'CONFIRMED' : statusRand < 0.95 ? 'PENDING' : 'CANCELLED';

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status,
        createdAt,
        updatedAt: createdAt,
      }
    });

    // Crear entre 1 y 3 artículos por pedido
    const itemsCount = Math.floor(Math.random() * 3) + 1;
    let totalPrice = 0;

    for (let j = 0; j < itemsCount; j++) {
      const stockItem = stockItems[Math.floor(Math.random() * stockItems.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      const priceAtPurchase = stockItem.salePrice || 5.0;

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          stockItemId: stockItem.id,
          quantity: qty,
          priceAtPurchase,
        }
      });
      totalPrice += priceAtPurchase * qty;
    }

    // Actualizar el importe total del pedido
    await prisma.order.update({
      where: { id: order.id },
      data: { totalPrice }
    });
  }

  // 6. Crear torneos y registros de jugadores correspondientes
  console.log('Creating mock tournaments and player registrations...');
  const formats = ['COMMANDER', 'MODERN', 'PIONEER', 'STANDARD'];
  const tournamentStatuses = ['COMPLETED', 'UPCOMING', 'IN_PROGRESS'];

  for (let i = 0; i < 20; i++) {
    const monthsAgo = Math.floor(Math.random() * 12);
    const date = subMonths(now, monthsAgo);
    const statusRand = Math.random();
    const status = statusRand < 0.7 ? 'COMPLETED' : statusRand < 0.9 ? 'UPCOMING' : 'IN_PROGRESS';
    const format = formats[Math.floor(Math.random() * formats.length)];

    const tournament = await prisma.tournament.create({
      data: {
        name: `Torneo Mensual de ${format} - Edición #${i + 1}`,
        format,
        status,
        date,
        storeId: store.id,
        currentRound: status === 'COMPLETED' ? 4 : status === 'IN_PROGRESS' ? 2 : 0,
        totalRounds: 4,
        pairingMode: 'SWISS',
      }
    });

    // Crear registros de participación (por ejemplo, entre 8 y 24 jugadores)
    const playersCount = Math.floor(Math.random() * 17) + 8;
    for (let p = 0; p < playersCount; p++) {
      // Crear un nuevo usuario si p > 0 (en caso contrario, usar el propietario de la tienda)
      let playerUser = user;
      if (p > 0) {
        playerUser = await prisma.user.create({
          data: {
            name: `Jugador MTG #${p + i * 10}`,
            email: `player_${p}_${i}@mtgstore.com`,
            role: 'PLAYER',
            storeCredit: 10.0,
          }
        });
      }

      await prisma.playerRegistration.create({
        data: {
          tournamentId: tournament.id,
          userId: playerUser.id,
          isPaid: Math.random() > 0.15, // 85% de probabilidad de estar pagado
          deckStatus: Math.random() > 0.5 ? 'APPROVED' : 'PENDING',
          deckCost: Math.random() * 200 + 50,
          score: status === 'COMPLETED' ? Math.floor(Math.random() * 12) : 0,
        }
      });
    }
  }

  // 7. Crear solicitudes de compra (Buylist Requests) y sus artículos
  console.log('Creating mock buylist requests...');
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 120);
    const createdAt = subDays(now, daysAgo);
    const statusRand = Math.random();
    const status = statusRand < 0.6 ? 'APPROVED' : statusRand < 0.9 ? 'PENDING' : 'REJECTED';
    const tradeType = Math.random() > 0.5 ? 'CASH' : 'STORE_CREDIT';

    const request = await prisma.buylistRequest.create({
      data: {
        userId: user.id,
        status,
        totalPrice: 0, // Se actualizará a continuación
        defaultRate: 70.0,
        tradeType,
        createdAt,
        updatedAt: createdAt,
      }
    });

    const itemsCount = Math.floor(Math.random() * 4) + 1;
    let totalPrice = 0;

    for (let j = 0; j < itemsCount; j++) {
      const card = cards[Math.floor(Math.random() * cards.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const finish = finishes[Math.floor(Math.random() * finishes.length)];

      const marketPrice = card.priceEur || 10.0;
      const buyPrice = Number((marketPrice * 0.7 * quantity).toFixed(2));

      await prisma.buylistItem.create({
        data: {
          buylistRequestId: request.id,
          scryfallCardId: card.id,
          quantity,
          condition,
          finish,
          language: 'en',
          marketPrice,
          buyPrice,
        }
      });

      totalPrice += buyPrice;
    }

    await prisma.buylistRequest.update({
      where: { id: request.id },
      data: { totalPrice }
    });
  }

  console.log('--- MOCK DATA SEEDED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
