import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Se reutiliza la instancia existente del cliente Prisma registrada en globalThis, si está disponible.
// En entorno de desarrollo (dev), el reinicio en caliente (hot-reload) de módulos de Next.js genera nuevos contextos de módulo
// pero globalThis persiste. Este patrón previene la inicialización recurrente de múltiples reservas de conexiones (connection pools).
// En entorno de producción, asegura la existencia de un cliente único por proceso de Node.js.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (!globalForPrisma.prisma) {
  prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;').catch((err) => {
    console.error("Failed to set SQLite journal mode to WAL:", err);
  });
}

globalForPrisma.prisma = prisma;
