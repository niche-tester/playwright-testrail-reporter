import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
    await page.goto("https://www.saucedemo.com/")
})

test.describe("Demo Test", () => {
    test("C37 Logged in with standard user - passed", async ({ page }) => {
        await page.locator('[data-test="username"]').click()
        await page.locator('[data-test="username"]').fill("standard_user")
        await page.locator('[data-test="password"]').click()
        await page.locator('[data-test="password"]').fill("secret_sauce")
        await page.locator('[data-test="login-button"]').click()
        expect(
            page.getByText(
                "ProductsName (A to Z)Name (A to Z)Name (Z to A)Price (low to high)Price (high to",
            ),
        )
    })

    test("Logged in with standard user - passed C84875", async ({ page }) => {
        await page.locator('[data-test="username"]').click()
        await page.locator('[data-test="username"]').fill("standard_user")
        await page.locator('[data-test="password"]').click()
        await page.locator('[data-test="password"]').fill("secret_sauce")
        await page.locator('[data-test="login-button"]').click()
        expect(
            page.getByText(
                "ProductsName (A to Z)Name (A to Z)Name (Z to A)Price (low to high)Price (high to",
            ),
        )
    })

    test.skip("C87640 Logged in with standard user - skipped", async ({
        page,
    }) => {
        await page.locator('[data-test="username"]').click()
        await page.locator('[data-test="username"]').fill("standard_user")
        await page.locator('[data-test="password"]').click()
        await page.locator('[data-test="password"]').fill("secret_sauce")
        await page.locator('[data-test="login-button"]').click()
        expect(
            page.getByText(
                "ProductsName (A to Z)Name (A to Z)Name (Z to A)Price (low to high)Price (high to",
            ),
        )
    })
})
