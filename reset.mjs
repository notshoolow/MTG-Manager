import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Clearing registrations...')
  await prisma.matchPlayer.deleteMany()
  await prisma.match.deleteMany()
  await prisma.playerRegistration.deleteMany()
  console.log('Done.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); })
