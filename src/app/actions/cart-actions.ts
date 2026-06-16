"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getMockUserId } from "@/lib/auth";

export async function getCartAction() {
  const userId = await getMockUserId();
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          stockItem: {
            include: { scryfallCard: true }
          }
        }
      }
    }
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            stockItem: {
              include: { scryfallCard: true }
            }
          }
        }
      }
    });
  }

  return cart;
}

export async function addToCartAction(stockItemId: string, quantity: number = 1) {
  const cart = await getCartAction();

  const stockItem = await prisma.stockItem.findUnique({ 
    where: { id: stockItemId },
    include: { scryfallCard: true }
  });
  if (!stockItem || stockItem.quantity < quantity) {
    return { success: false, message: "Not enough stock" };
  }

  // Se utiliza el precio de venta (salePrice) directo, evitando la consulta de cálculo dinámico (populatePrices) que resulta costosa en términos de consultas
  const currentPrice = stockItem.salePrice ?? null;

  const existingItem = cart.items.find((item) => item.stockItemId === stockItemId);
  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > stockItem.quantity) {
      return { success: false, message: "Not enough stock" };
    }
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { 
        quantity: newQuantity,
        priceAtAdd: currentPrice
      }
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        stockItemId,
        quantity,
        priceAtAdd: currentPrice
      }
    });
  }

  revalidatePath("/player/singles");
  return { success: true };
}

export async function updateCartItemAction(cartItemId: string, quantity: number) {
  if (quantity <= 0) {
    return removeFromCartAction(cartItemId);
  }

  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { stockItem: true }
  });

  if (!cartItem) return { success: false, message: "Item not found" };

  if (quantity > cartItem.stockItem.quantity) {
    return { success: false, message: "Not enough stock" };
  }

  await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity }
  });

  revalidatePath("/player/singles");
  return { success: true };
}

export async function removeFromCartAction(cartItemId: string) {
  await prisma.cartItem.delete({ where: { id: cartItemId } });
  revalidatePath("/player/singles");
  return { success: true };
}

export async function clearCartAction() {
  const cart = await getCartAction();
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  revalidatePath("/player/singles");
  return { success: true };
}

export async function checkoutAction() {
  const userId = await getMockUserId();
  const cart = await getCartAction();

  if (cart.items.length === 0) {
    return { success: false, message: "Cart is empty" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalPrice = 0;
      const orderItemsData = [];

      for (const item of cart.items) {
        // Recuperación de las existencias actuales de la base de datos en el contexto de la transacción
        const stockItem = await tx.stockItem.findUnique({
          where: { id: item.stockItemId }
        });
        
        if (!stockItem || stockItem.quantity < item.quantity) {
          throw new Error(`No hay suficiente stock de: ${item.stockItem.scryfallCard.name}`);
        }
        
        await tx.stockItem.update({
          where: { id: item.stockItemId },
          data: { quantity: { decrement: item.quantity } }
        });

        const itemPrice = item.priceAtAdd ?? 0;
        totalPrice += itemPrice * item.quantity;

        orderItemsData.push({
          stockItemId: item.stockItemId,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtAdd
        });
      }

      const order = await tx.order.create({
        data: {
          userId,
          status: "PENDING",
          totalPrice,
          items: {
            create: orderItemsData
          }
        }
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });

    revalidatePath("/player/singles");
    revalidatePath("/admin/singles");
    return { success: true, orderId: result.id };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
