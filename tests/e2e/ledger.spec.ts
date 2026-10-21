import { execFileSync } from 'node:child_process';
import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

function readOtp(phone: string): string | undefined {
  const logs = execFileSync('docker', ['compose', 'logs', '--no-log-prefix', '--no-color', 'api'], {
    encoding: 'utf8',
  });
  return logs
    .split('\n')
    .reverse()
    .flatMap((line) => {
      try {
        const item = JSON.parse(line);
        return item.phone === phone && item.otp ? [String(item.otp)] : [];
      } catch {
        return [];
      }
    })[0];
}
async function createEntry(
  page: Page,
  friend: string,
  amount: string,
  dueDate: string,
  withReceipt = false,
) {
  await page.getByRole('button', { name: '+ Add entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Friend’s name' }).fill(friend);
  await page.getByRole('textbox', { name: 'Amount (INR)', exact: true }).fill(amount);
  await page.getByRole('button', { name: 'Choose due date', exact: true }).click();
  const current = new Date();
  const target = new Date(`${dueDate}T00:00:00Z`);
  const months =
    (target.getUTCFullYear() - current.getUTCFullYear()) * 12 +
    target.getUTCMonth() -
    current.getUTCMonth();
  for (let index = 0; index < Math.abs(months); index++) {
    await page
      .getByRole('button', { name: months > 0 ? 'Next month' : 'Previous month', exact: true })
      .click();
  }
  await page.getByRole('button', { name: `Select ${dueDate}`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close calendar', exact: true })).toHaveCount(0);
  if (withReceipt) {
    const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: 'white' } })
      .png()
      .toBuffer();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Attach receipt photo', exact: true }).click();
    await (await chooser).setFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png });
    await expect(
      page.getByRole('img', { name: 'Selected receipt preview', exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByText(friend, { exact: true })).toBeVisible();
}
test('login, validation, entries, overdue, repay, persistence and logout', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const phone = `+91${String(Date.now()).slice(-10)}`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Lend a hand/ })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Clear accounts/ })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await page.reload();
  await page.getByRole('textbox', { name: 'Phone number' }).fill(phone);
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await expect(page.getByRole('textbox', { name: 'Verification code' })).toBeVisible();
  await expect.poll(() => readOtp(phone)).toMatch(/^\d{6}$/);
  await page.getByRole('textbox', { name: 'Verification code' }).fill(readOtp(phone)!);
  await page.getByRole('button', { name: 'Verify & open ledger' }).click();
  await expect(page.getByText('A fresh page, just for you')).toBeVisible();
  await page.getByRole('button', { name: '+ Add entry', exact: true }).click();
  await page.getByRole('button', { name: 'Choose due date', exact: true }).click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  const nextMonth = new Date();
  nextMonth.setUTCDate(1);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  await expect(
    page.getByRole('heading', {
      name: new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(nextMonth),
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await createEntry(page, 'Aditi Sharma', '1250.50', yesterday, true);
  await page.getByRole('button', { name: 'View receipt for Aditi Sharma', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Receipt photo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close receipt', exact: true }).click();
  await createEntry(page, 'Rohan Mehta', '500', tomorrow);
  await expect(page.getByText('₹1,750.50').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Overdue', exact: true }).click();
  await expect(page.getByText('Aditi Sharma', { exact: true })).toBeVisible();
  await expect(page.getByText('Rohan Mehta', { exact: true })).not.toBeVisible();
  await page
    .getByRole('button', {
      name: testInfo.project.name === 'desktop' ? 'Mark Aditi Sharma repaid' : 'Mark repaid',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Confirm repayment' }).click();
  await expect(page.getByText('Repayment recorded. All squared up.')).toBeVisible();
  await page.getByRole('tab', { name: 'Repaid', exact: true }).click();
  await expect(page.getByText('Aditi Sharma', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Aditi Sharma', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search friends' }).fill('Rohan');
  await expect(page.getByText('Aditi Sharma', { exact: true })).not.toBeVisible();
  await expect(page.getByText('Rohan Mehta', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search friends' }).fill('');
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('skip onboarding is remembered after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
});
