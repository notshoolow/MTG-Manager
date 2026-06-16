import { cookies } from "next/headers";
import { prisma } from "./db";

/**
 * Autenticación simulada (Mock) para el Producto Mínimo Viable (MVP).
 * En un entorno de producción real, se implementaría un proveedor como NextAuth o Clerk.
 */
export async function getMockUserId() {
  const cookieStore = await cookies();
  const mockUserId = cookieStore.get("mock_user_id")?.value;

  if (mockUserId) {
    const user = await prisma.user.findUnique({ where: { id: mockUserId } });
    if (user) return user.id;
  }

  // Mecanismo de contingencia para buscar o registrar un usuario de prueba
  let user = await prisma.user.findFirst({ where: { email: "player@mtgmanager.local" } });
  if (!user) {
    user = await prisma.user.create({ 
      data: { 
        name: "Test Player", 
        email: "player@mtgmanager.local",
        role: "PLAYER" 
      } 
    });
  }
  
  // Configuración de la cookie para solicitudes subsecuentes
  return user.id;
}
