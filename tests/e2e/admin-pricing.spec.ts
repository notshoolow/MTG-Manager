import { test, expect } from '@playwright/test';

test.describe('Admin Pricing Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/singles');
  });

  test('can create a pricing rule (E-13)', async ({ page }) => {
    // Assuming there's a button or tab for pricing rules. If it's a tab:
    const pricingTab = page.getByRole('tab', { name: /reglas de precio/i });
    if (await pricingTab.count() > 0) {
      await pricingTab.click();
      
      await page.getByRole('button', { name: /crear regla/i }).click();
      
      const nameInput = page.getByPlaceholder(/nombre de la regla/i);
      await nameInput.fill('Test E2E Rule');
      
      await page.getByRole('button', { name: /guardar/i }).click();
      
      await expect(page.getByText('Test E2E Rule')).toBeVisible();
    }
  });

  test('can assign pricing rule to stock item (E-15)', async ({ page }) => {
    const editButtons = page.getByRole('button', { name: /editar/i });
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      
      // Select AUTO_RULE mode
      const modeSelect = page.getByLabel(/modo de precio/i);
      await modeSelect.selectOption({ label: 'Regla Automática' });
      
      // Save
      await page.getByRole('button', { name: /guardar/i }).click();
      
      await expect(page.getByText(/actualizado con éxito/i)).toBeVisible();
    }
  });
});
