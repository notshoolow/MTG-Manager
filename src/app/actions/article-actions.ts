'use server';

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getArticlesAction(onlyActive: boolean = true) {
  try {
    const now = new Date();
    
    // Si onlyActive es verdadero, se recuperan únicamente los artículos cuya fecha de expiración (endDate) sea nula o futura
    const whereClause = onlyActive 
      ? {
          OR: [
            { endDate: null },
            { endDate: { gt: now } }
          ]
        }
      : {};

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      data: articles.map(art => ({
        ...art,
        tags: art.tags ? art.tags.split(',') : []
      }))
    };
  } catch (error) {
    console.error("Error fetching articles:", error);
    const message = error instanceof Error ? error.message : "Error al cargar los artículos";
    return { success: false, error: message };
  }
}

export async function getArticleByIdAction(id: string, onlyActive: boolean = true) {
  try {
    const article = await prisma.article.findUnique({
      where: { id }
    });

    if (!article) {
      return { success: false, error: "Artículo no encontrado" };
    }

    if (onlyActive && article.endDate && new Date(article.endDate) <= new Date()) {
      return { success: false, error: "Este artículo ha expirado y ya no está disponible" };
    }

    return {
      success: true,
      data: {
        ...article,
        tags: article.tags ? article.tags.split(',') : []
      }
    };
  } catch (error) {
    console.error("Error fetching article by ID:", error);
    const message = error instanceof Error ? error.message : "Error al cargar el artículo";
    return { success: false, error: message };
  }
}

export async function createArticleAction(data: {
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string | null;
  endDate?: Date | string | null;
}) {
  try {
    if (!data.title.trim()) {
      throw new Error("El título es obligatorio");
    }
    if (!data.content.trim()) {
      throw new Error("El contenido es obligatorio");
    }
    if (data.tags.length === 0) {
      throw new Error("Debes seleccionar al menos una etiqueta");
    }

    const tagsString = data.tags.join(',');
    const parsedEndDate = data.endDate ? new Date(data.endDate) : null;

    const newArticle = await prisma.article.create({
      data: {
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl || null,
        tags: tagsString,
        endDate: parsedEndDate,
      }
    });

    revalidatePath("/admin/articles");
    revalidatePath("/player/articles");
    return { success: true, data: newArticle };
  } catch (error) {
    console.error("Error creating article:", error);
    const message = error instanceof Error ? error.message : "Error al crear el artículo";
    return { success: false, error: message };
  }
}

export async function updateArticleAction(
  id: string,
  data: {
    title: string;
    content: string;
    tags: string[];
    imageUrl?: string | null;
    endDate?: Date | string | null;
  }
) {
  try {
    if (!data.title.trim()) {
      throw new Error("El título es obligatorio");
    }
    if (!data.content.trim()) {
      throw new Error("El contenido es obligatorio");
    }
    if (data.tags.length === 0) {
      throw new Error("Debes seleccionar al menos una etiqueta");
    }

    const tagsString = data.tags.join(',');
    const parsedEndDate = data.endDate ? new Date(data.endDate) : null;

    const updatedArticle = await prisma.article.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl || null,
        tags: tagsString,
        endDate: parsedEndDate,
      }
    });

    revalidatePath("/admin/articles");
    revalidatePath("/player/articles");
    revalidatePath(`/player/articles/${id}`);
    return { success: true, data: updatedArticle };
  } catch (error) {
    console.error("Error updating article:", error);
    const message = error instanceof Error ? error.message : "Error al actualizar el artículo";
    return { success: false, error: message };
  }
}

export async function deleteArticleAction(id: string) {
  try {
    await prisma.article.delete({
      where: { id }
    });

    revalidatePath("/admin/articles");
    revalidatePath("/player/articles");
    revalidatePath(`/player/articles/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting article:", error);
    const message = error instanceof Error ? error.message : "Error al eliminar el artículo";
    return { success: false, error: message };
  }
}
