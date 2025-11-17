import { test, expect } from "@playwright/test";

const home = "/";

const randomEmail = () => `playwright-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
const testPassword = "TestPass!123";

test.describe("Auth shell", () => {
  test("supports email auth via emulator", async ({ page }) => {
    await page.goto(home);

    await expect(page.getByRole("heading", { name: "BioSynCare Lab" })).toBeVisible();

    const googleButton = page.getByRole("button", { name: "Continue with Google" });
    await expect(googleButton).toBeDisabled();
    await expect(googleButton).toHaveAttribute("title", /emulator/i);

    const email = randomEmail();
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");

    await emailInput.fill(email);
    await passwordInput.fill(testPassword);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.locator("#messages")).toContainText("Account created", { timeout: 5000 });
    await expect(page.locator("#auth-state")).toHaveText("Signed in", { timeout: 5000 });
    await expect(page.locator("#user-email")).toContainText(email);

    const signOutButton = page.getByRole("button", { name: "Sign out" });
    await expect(signOutButton).toBeEnabled();
    await signOutButton.click();
    await expect(page.locator("#auth-state")).toHaveText("Signed out", { timeout: 5000 });

    await emailInput.fill(email);
    await passwordInput.fill(testPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("#auth-state")).toHaveText("Signed in", { timeout: 5000 });
    await expect(page.locator("#user-email")).toContainText(email);
  });
});
