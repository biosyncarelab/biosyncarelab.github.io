import { test, expect } from "@playwright/test";

const home = "/";

test.describe("Auth shell", () => {
  test("renders default state", async ({ page }) => {
    await page.goto(home);

    await expect(page.getByRole("heading", { name: "BioSynCare Lab" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeDisabled();

    const status = page.locator("#auth-state");
    await expect(status).toHaveText(/Signed out|Checking/);
  });
});
