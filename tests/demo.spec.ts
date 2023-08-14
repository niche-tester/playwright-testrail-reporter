import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
});

test.describe('Demo Test', () => {

    test('C12035 Logged in with standard user - passed', async ({ page }) => {
      await page.locator('[data-test="username"]').click();
      await page.locator('[data-test="username"]').fill('standard_user');
      await page.locator('[data-test="password"]').click();
      await page.locator('[data-test="password"]').fill('secret_sauce');
      await page.locator('[data-test="login-button"]').click();
      expect(page.getByText('ProductsName (A to Z)Name (A to Z)Name (Z to A)Price (low to high)Price (high to'));
    });

    test('C30013 Logged in with standard user - failed', async ({ page }) => {
      await expect(page).toHaveURL(/.*\/login/);
    })

    test('C12036 Logged in with locked out user - timedout', async ({ page }) => {
      await page.waitForSelector('[data-test="username"]');
      await page.locator('[data-test="username"]').click();
      await page.locator('[data-test="username"]').fill('locked_out_user');
      await page.locator('[data-test="password"]').click();
      await page.locator('[data-test="password"]').fill('secret_sauce');
      await page.locator('[data-test="login-button3222"]').click();
    });

    test.skip('C12037 Logged in with standard user - skipped', async ({ page }) => {
      await page.locator('[data-test="username"]').click();
      await page.locator('[data-test="username"]').fill('standard_user');
      await page.locator('[data-test="password"]').click();
      await page.locator('[data-test="password"]').fill('secret_sauce');
      await page.locator('[data-test="login-button"]').click();
      expect(page.getByText('ProductsName (A to Z)Name (A to Z)Name (Z to A)Price (low to high)Price (high to'));
    });

  });