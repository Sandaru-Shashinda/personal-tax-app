import { expect, test } from "@playwright/test";

// The same screens in Sinhala and Tamil: the language is chosen from the switcher, kept across
// sign-in, and public pages are served at their own address per language.

const SHOTS = process.env.E2E_SCREENSHOT_DIR;

test("a Sinhala reader can switch language, sign in and use every screen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/login");
  await page.getByRole("button", { name: "Change language" }).click();
  await page.getByRole("menuitem", { name: "සිංහල" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "si-LK");
  await expect(page.getByRole("heading", { name: "නැවත සාදරයෙන් පිළිගනිමු" })).toBeVisible();

  await page.getByRole("button", { name: "ආදර්ශන ගිණුම බලන්න" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /ආයුබෝවන්, Kasun/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "බදු තත්ත්වය" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/si-dashboard.png`, fullPage: true });

  // The calculation itself is explained in Sinhala, not only the page around it.
  await page.goto("/tax");
  await expect(page.getByRole("heading", { level: 1, name: "බදු ගණනය" })).toBeVisible();
  await expect(page.getByText("පුද්ගලික සහනය").first()).toBeVisible();
  await page.getByRole("button", { name: /ඇයි\?/ }).first().click();
  await expect(page.getByText("යෙදූ නීතිය")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/si-tax.png`, fullPage: true });
  await page.keyboard.press("Escape");

  for (const [path, heading] of [
    ["/income", "ආදායම"],
    ["/expenses", "වියදම්"],
    ["/payments", "ගෙවීම්"],
    ["/documents", "ලේඛන"],
    ["/reports", "වාර්තා"],
    ["/calendar", "බදු දින දර්ශනය"],
    ["/settings", "සැකසුම්"],
    ["/tax/return", /ආදායම් වාර්තාව සූදානම් කරන්න/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }

  await page.goto("/income");
  await page.getByRole("button", { name: "ආදායමක් එක් කරන්න" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("මූලික වැටුප").fill("-5");
  await dialog.getByRole("button", { name: "ආදායමක් එක් කරන්න" }).click();
  await expect(dialog.getByText("මුදල ඍණ විය නොහැක")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/si-income-form.png` });

  expect(errors).toEqual([]);
});

test("public pages have a Tamil address and the calculator answers in Tamil", async ({ page }) => {
  await page.goto("/ta/tax-calculator");
  await expect(page.locator("html")).toHaveAttribute("lang", "ta-LK");
  await expect(page.getByRole("heading", { name: "இலங்கை வருமான வரிக் கணிப்பான்" })).toBeVisible();
  await page.getByLabel("ஆண்டுச் சம்பளம்").fill("3600000");
  await page.getByRole("button", { name: "எனது வரியை மதிப்பிடுக" }).click();
  await expect(page.getByText("மதிப்பிடப்பட்ட வரி", { exact: true })).toBeVisible();
  await expect(page.getByText(/வீதத்தில் வரி விதிக்கத்தக்க வருமானம்/).first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ta-calculator.png`, fullPage: true });

  // Links on a Tamil page stay in Tamil, and the choice follows the reader to other pages.
  await page.getByRole("navigation", { name: "பிரதான" }).getByRole("link", { name: "வழிகாட்டி" }).click();
  await expect(page).toHaveURL(/\/ta\/sri-lanka-tax-guide$/);
  await page.goto("/about");
  await expect(page).toHaveURL(/\/ta\/about$/);

  // Back to English from the switcher.
  await page.getByRole("button", { name: "மொழியை மாற்றுக" }).click();
  await page.getByRole("menuitem", { name: "English" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "About Ayakara" })).toBeVisible();
});
