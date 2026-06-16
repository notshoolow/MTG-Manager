import { test, expect } from '@playwright/test';

test.describe('Player Stock Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/player/singles');
  });

  test('can browse stock and see filters (E-8)', async ({ page }) => {
    // Wait for the filters to be visible
    await expect(page.getByPlaceholder(/Buscar por nombre/i)).toBeVisible();
    await expect(page.getByRole('combobox', { name: /set/i })).toBeVisible();
    
    // Check if the empty state or stock grid is visible
    const hasStock = await page.getByRole('button', { name: /añadir al carrito/i }).count() > 0;
    if (!hasStock) {
      await expect(page.getByText(/no se encontraron cartas/i)).toBeVisible();
    }
  });

  test('can open out of stock subscription modal (E-10)', async ({ page }) => {
    // If there is an out of stock item, try clicking the notify button
    const notifyButtons = page.getByRole('button', { name: /avísame cuando haya stock/i });
    if (await notifyButtons.count() > 0) {
      await notifyButtons.first().click();
      await expect(page.getByText('Notificarme Disponibilidad')).toBeVisible();
      
      const submitBtn = page.getByRole('button', { name: /suscribirse/i });
      await submitBtn.click();
      
      await expect(page.getByText(/Te avisaremos/i)).toBeVisible();
    }
  });

  test('can toggle views (E-12)', async ({ page }) => {
    // Click Toggle View
    await page.getByRole('button', { name: /toggle view/i }).click();
    
    // Check if we got redirected back to /admin/singles (assuming user is admin)
    // or if the UI changed.
    await expect(page).toHaveURL(/.*\/admin\/singles/);
  });
});
