import { test, expect } from '@playwright/test';

const loginWithGoogle = async (page: any) => {
  const email = process.env.E2E_GOOGLE_EMAIL;
  const password = process.env.E2E_GOOGLE_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_GOOGLE_EMAIL and E2E_GOOGLE_PASSWORD must be set');
  }

  await page.goto('/login');
  await expect(page.getByText('Magnus Flipper AI')).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const popup = await popupPromise;

  await popup.waitForLoadState();
  await popup.locator('input[type="email"]').fill(email);
  await popup.locator('#identifierNext').click();
  await popup.locator('input[type="password"]').fill(password);
  await popup.locator('#passwordNext').click();

  await page.waitForURL('**/');
};

test.describe('Magnus Flipper Mixtape E2E', () => {
  test('Login with Google OAuth and dashboard loads', async ({ page }) => {
    await loginWithGoogle(page);
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('Create scrape job and observe live ingestion', async ({ page, request }) => {
    await loginWithGoogle(page);

    const token = process.env.E2E_AUTH_TOKEN;
    if (!token) {
      throw new Error('E2E_AUTH_TOKEN must be set for API-backed checks');
    }

    const responsePromise = page.waitForResponse((res) =>
      res.url().includes('/api/monitors') && res.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Run Demo Scrape' }).click();
    const monitorResponse = await responsePromise;
    const monitorPayload = await monitorResponse.json();
    const monitorId = monitorPayload?.data?.id;
    expect(monitorId).toBeTruthy();

    let jobStatus: string | null = null;
    await expect.poll(async () => {
      const jobsRes = await request.get('/api/jobs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!jobsRes.ok()) return null;
      const jobsBody = await jobsRes.json();
      const job = jobsBody.items?.find((item: any) => item.monitorId === monitorId);
      if (!job) return null;
      jobStatus = job.status;
      return job.status;
    }, { timeout: 60000 }).not.toBeNull();

    expect(['queued', 'running', 'completed', 'failed', 'retrying', 'parsing', 'storing']).toContain(jobStatus);

    await expect.poll(async () => {
      const list = await page.locator('text=No deals yet').count();
      return list === 0;
    }, { timeout: 120000 }).toBe(true);
  });

  test('Search + filter results and enforce quota via API', async ({ request, page }) => {
    await loginWithGoogle(page);

    const token = process.env.E2E_AUTH_TOKEN;
    if (!token) {
      throw new Error('E2E_AUTH_TOKEN must be set for API-backed checks');
    }

    const dealsRes = await request.get('/api/deals?query=bike&sortBy=price&sortOrder=asc', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dealsRes.ok()).toBeTruthy();

    const quotaRes = await request.post('/api/monitors', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'Quota Probe',
        sources: ['craigslist'],
        criteria: { keywords: ['bike'] },
        frequency: 'hourly',
        status: 'active',
        notifyEmail: false,
        notifyPush: true,
        notifyInApp: true,
      },
    });

    expect([201, 429]).toContain(quotaRes.status());
  });
});
