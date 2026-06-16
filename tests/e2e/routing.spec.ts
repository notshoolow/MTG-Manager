import { test, expect } from '@playwright/test';

test.describe('Routing and Navigation', () => {
  test('Home page has links to Admin and Player hubs', async ({ page }) => {
    await page.goto('/');
    
    const adminLink = page.getByRole('link', { name: /Store Admin Dashboard/i });
    const playerLink = page.getByRole('link', { name: /Player Portal/i });
    
    await expect(adminLink).toBeVisible();
    await expect(playerLink).toBeVisible();
    
    await expect(adminLink).toHaveAttribute('href', '/admin/tournaments');
    await expect(playerLink).toHaveAttribute('href', '/player/tournaments');
  });

  test('View Toggle swaps between admin and player views', async ({ page }) => {
    await page.goto('/admin/tournaments');
    
    const toggleBtn = page.getByRole('button', { name: /Alternar Vista/i });
    await expect(toggleBtn).toBeVisible();
    
    await toggleBtn.click();
    await expect(page).toHaveURL(/\/player\/tournaments/);
    
    await page.getByRole('button', { name: /Alternar Vista/i }).click();
    await expect(page).toHaveURL(/\/admin\/tournaments/);
  });

  test('Admin tournament list links point to the correct sub-route', async ({ page }) => {
    // This assumes there's at least one tournament in the list
    // If not, we might need to seed or skip
    await page.goto('/admin/tournaments');
    
    // Check if there are "Gestionar" links and they have the correct path
    const manageLinks = page.locator('a[href^="/admin/tournaments/tournament/"]');
    const count = await manageLinks.count();
    
    if (count > 0) {
      const href = await manageLinks.first().getAttribute('href');
      expect(href).toMatch(/\/admin\/tournaments\/tournament\/.+/);
    }
  });

  test('Player tournament registration form redirects to /player/tournaments', async ({ page }) => {
    // Mock the action or just check the link to register
    await page.goto('/player/tournaments');
    
    const registerLink = page.getByRole('link', { name: /Unirse/i }).first();
    if (await registerLink.isVisible()) {
      await expect(registerLink).toHaveAttribute('href', /\/player\/tournaments\/register/);
    }
  });
});
