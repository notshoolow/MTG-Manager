import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("=== USERS ===");
  console.log(users.map(u => ({ id: u.id, name: u.name, storeCredit: u.storeCredit })));

  const requests = await prisma.buylistRequest.findMany({
    include: { items: true }
  });
  console.log("\n=== BUYLIST REQUESTS ===");
  console.log(requests.map(r => ({
    id: r.id,
    userId: r.userId,
    status: r.status,
    totalPrice: r.totalPrice,
    tradeType: r.tradeType,
    itemsCount: r.items.length
  })));
}

main().catch(console.error);
