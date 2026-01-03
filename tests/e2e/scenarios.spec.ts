import { test, expect } from '@playwright/test';

test.describe('Magnus Flipper AI E2E Flow', () => {
  
  test('User can login and dashboard loads', async ({ page }) => {
    // 1. Visit App
    await page.goto('http://localhost:5173');
    
    // 2. Check Login Screen
    await expect(page.getByText('Magnus Flipper AI')).toBeVisible();
    
    // 3. Perform Login
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    
    // 4. Verify Dashboard
    await expect(page.getByText('Worker Overview')).toBeVisible();
    await expect(page.getByText('New Scrape Job')).toBeVisible();
  });

  test('User can submit a new scrape job', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: 'Continue with Google' }).click();

    // 1. Open Modal
    await page.getByRole('button', { name: 'New Scrape Job' }).click();
    await expect(page.getByText('Create New Scrape Job')).toBeVisible();

    // 2. Fill Form
    const urlInput = page.getByPlaceholder('https://...');
    await urlInput.fill('https://www.amazon.com/dp/B08H75RTZ8');
    
    // 3. Submit
    await page.getByRole('button', { name: 'Dispatch Worker' }).click();

    // 4. Verify Job appears in list
    await expect(page.locator('.font-mono').first()).toContainText('https://www.amazon.com/dp/B08H75RTZ8');
    await expect(page.getByText('Live Processing Queue')).toBeVisible();
  });

  test('User can view results and filter', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: 'Continue with Google' }).click();

    // 1. Navigate to Results
    await page.getByText('Search Results').click();
    
    // 2. Check for Results
    // Note: Assuming mock data populates
    await expect(page.getByText('Showing')).toBeVisible();
    
    // 3. Test Sort Interaction
    await page.getByRole('combobox').selectOption('price_desc');
  });
});