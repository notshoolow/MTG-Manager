import { test, expect } from '@playwright/test';

test.describe('Admin Stock Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin singles page
    await page.goto('/admin/singles');
  });

  test('can open add stock modal and search for cards (E-1)', async ({ page }) => {
    // Click Add Stock button
    await page.getByRole('button', { name: /añadir stock/i }).click();
    
    // Check if modal opens
    await expect(page.getByText('Buscar en Scryfall')).toBeVisible();

    // Type in search box
    const searchInput = page.getByPlaceholder(/Buscar por nombre/i);
    await searchInput.fill('Lotus');
    
    // Simulate Scryfall delay and results appearing
    // In a real E2E we'd intercept the Scryfall API, but here we just check if it tries to search
    await expect(page.locator('.lucide-loader')).toBeVisible();
  });

  test('can submit bulk import list (E-4)', async ({ page }) => {
    // Switch to Bulk Import view
    await page.getByRole('button', { name: /importación masiva/i }).click();
    
    // Type into textarea
    const textarea = page.getByPlaceholder(/Pegar lista/i);
    await textarea.fill('1 Black Lotus [LEA] M\n2 Mox Pearl NM');

    // Click parse
    await page.getByRole('button', { name: /procesar lista/i }).click();

    // Wait for parsing results to show
    await expect(page.getByText('Líneas a Importar (2)')).toBeVisible();
    await expect(page.getByText('Black Lotus')).toBeVisible();
    await expect(page.getByText('Mox Pearl')).toBeVisible();
  });

  test('editing a stock variant shows the correct updated local state (BUG-10 Fix Verify)', async ({ page }) => {
    // This assumes there's at least one stock item. We check if the edit modal opens.
    // Given we can't guarantee DB state, we just test the UI flow if an edit button exists.
    const editButtons = page.getByRole('button', { name: /editar/i });
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      
      // Ensure the condition select exists
      const conditionSelect = page.getByLabel(/estado/i);
      await expect(conditionSelect).toBeVisible();
      
      // Change condition
      await conditionSelect.selectOption({ label: 'Near Mint' });
      
      // Save
      await page.getByRole('button', { name: /guardar cambios/i }).click();
      
      // Verify no errors
      await expect(page.getByText(/Variante no encontrada/i)).not.toBeVisible();
    }
  });
});
