import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getArticlesAction,
  getArticleByIdAction,
  createArticleAction,
  updateArticleAction,
  deleteArticleAction,
} from '@/app/actions/article-actions';

// Simulación (mock) de la base de datos
vi.mock('@/lib/db', () => ({
  prisma: {
    article: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Article Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getArticlesAction', () => {
    it('fetches all articles when onlyActive is false', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockArticles = [
        { id: '1', title: 'A', content: 'C', tags: 'noticias,importante', endDate: null, createdAt: new Date() }
      ];
      (prisma.article.findMany as any).mockResolvedValue(mockArticles);

      const res = await getArticlesAction(false);

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0].tags).toEqual(['noticias', 'importante']);
      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' }
      });
    });

    it('filters out expired articles when onlyActive is true', async () => {
      const { prisma } = await import('@/lib/db');
      
      (prisma.article.findMany as any).mockResolvedValue([]);

      const res = await getArticlesAction(true);

      expect(res.success).toBe(true);
      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { endDate: null },
            { endDate: { gt: expect.any(Date) } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('getArticleByIdAction', () => {
    it('retrieves article correctly and parses tags', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockArticle = { id: '1', title: 'A', content: 'C', tags: 'metajuego', endDate: null, createdAt: new Date() };
      (prisma.article.findUnique as any).mockResolvedValue(mockArticle);

      const res = await getArticleByIdAction('1', true);

      expect(res.success).toBe(true);
      expect(res.data?.tags).toEqual(['metajuego']);
    });

    it('returns an error if onlyActive is true and article is expired', async () => {
      const { prisma } = await import('@/lib/db');
      
      const expiredDate = new Date(Date.now() - 10000); // hace 10 segundos
      const mockArticle = { id: '1', title: 'A', content: 'C', tags: 'otros', endDate: expiredDate, createdAt: new Date() };
      (prisma.article.findUnique as any).mockResolvedValue(mockArticle);

      const res = await getArticleByIdAction('1', true);

      expect(res.success).toBe(false);
      expect(res.error).toBe('Este artículo ha expirado y ya no está disponible');
    });

    it('returns article if onlyActive is false even if article is expired', async () => {
      const { prisma } = await import('@/lib/db');
      
      const expiredDate = new Date(Date.now() - 10000); // hace 10 segundos
      const mockArticle = { id: '1', title: 'A', content: 'C', tags: 'otros', endDate: expiredDate, createdAt: new Date() };
      (prisma.article.findUnique as any).mockResolvedValue(mockArticle);

      const res = await getArticleByIdAction('1', false);

      expect(res.success).toBe(true);
      expect(res.data?.id).toBe('1');
    });
  });

  describe('createArticleAction', () => {
    it('creates article and stores tags as comma-separated string', async () => {
      const { prisma } = await import('@/lib/db');
      const { revalidatePath } = await import('next/cache');

      (prisma.article.create as any).mockResolvedValue({
        id: 'new-id',
        title: 'Title',
        content: 'Content',
        tags: 'noticias,metajuego',
        endDate: null
      });

      const res = await createArticleAction({
        title: 'Title',
        content: 'Content',
        tags: ['noticias', 'metajuego'],
        endDate: null
      });

      expect(res.success).toBe(true);
      expect(prisma.article.create).toHaveBeenCalledWith({
        data: {
          title: 'Title',
          content: 'Content',
          imageUrl: null,
          tags: 'noticias,metajuego',
          endDate: null
        }
      });
      expect(revalidatePath).toHaveBeenCalledWith('/admin/articles');
      expect(revalidatePath).toHaveBeenCalledWith('/player/articles');
    });

    it('fails if validation fails (e.g. empty title)', async () => {
      const res = await createArticleAction({
        title: '',
        content: 'Content',
        tags: ['noticias'],
        endDate: null
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('El título es obligatorio');
    });
  });

  describe('updateArticleAction', () => {
    it('updates article and revalidates pathways', async () => {
      const { prisma } = await import('@/lib/db');
      
      (prisma.article.update as any).mockResolvedValue({
        id: '1',
        title: 'Updated Title',
        content: 'Content',
        tags: 'otros',
        endDate: null
      });

      const res = await updateArticleAction('1', {
        title: 'Updated Title',
        content: 'Content',
        tags: ['otros'],
        endDate: null
      });

      expect(res.success).toBe(true);
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          tags: 'otros'
        })
      });
    });
  });

  describe('deleteArticleAction', () => {
    it('deletes article successfully', async () => {
      const { prisma } = await import('@/lib/db');

      const res = await deleteArticleAction('1');

      expect(res.success).toBe(true);
      expect(prisma.article.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });
  });
});
