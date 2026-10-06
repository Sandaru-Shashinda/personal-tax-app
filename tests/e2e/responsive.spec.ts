import { expect, test } from "@playwright/test";

// Runs in the desktop and mobile projects with the seeded demo account.

test("the demo dashboard fits the screen and navigation works", async ({ page, isMobile }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore the demo account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Hello, Kasun/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tax position" })).toBeVisible();

  // No horizontal scrolling at this viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  if (isMobile) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Income" }).click();
  } else {
    await page.getByRole("link", { name: "Income", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/income/);
  await expect(page.getByText("Lanka Software Labs (Pvt) Ltd").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  // Dark mode toggles without a reload.
  await page.getByRole("button", { name: /light and dark mode/ }).click();
  const toggled = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  await page.getByRole("button", { name: /light and dark mode/ }).click();
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(!toggled);
});
