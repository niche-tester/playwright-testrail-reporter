import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('https://www.browserstack.com/');
});

test.describe('Demo Test', () => {

    test('C12035 Verify Login Error Message', async ({ page }) => {
        await page.waitForSelector('text=Sign in',{state:'visible'});
        await page.locator('text=Sign in').first().click();
        await page.waitForSelector('#user_email_login')
        await page.locator('#user_email_login').type('example1@example.com');
        await page.locator('#user_password').type('examplepassword');
        await page.locator('#user_submit').click();

    });

});