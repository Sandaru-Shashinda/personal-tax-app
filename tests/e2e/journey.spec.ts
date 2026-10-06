import { expect, test } from "@playwright/test";

// The full path a new user takes, in one browser session: register, onboard, add income and
// withholding, see the calculation and why, record a payment, track an expense, upload a
// document, export a report, sign out and back in, and finally delete the account.

const email = `e2e-${Date.now()}@test.example.lk`;
const password = "e2e-password-2026";

test("a new user can go from registration to a reconciled tax position", async ({ page }) => {
  const dialog = page.getByRole("dialog");

  await test.step("register", async () => {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Nimali Jayasuriya");
    await page.getByLabel("E-mail address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Please accept to continue")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding/);
  });

  await test.step("complete onboarding", async () => {
    await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Nimali Jayasuriya");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel(/Taxpayer Identification Number/).fill("12345");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("A TIN has nine digits")).toBeVisible();
    await page.getByLabel(/Taxpayer Identification Number/).fill("987654321");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Finish setup" }).click();
    await expect(page.getByText("Choose at least one type of income")).toBeVisible();
    await page.getByLabel("Salary", { exact: true }).check();
    await page.getByLabel("Bank interest").check();
    await page.getByRole("button", { name: "Finish setup" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Nothing recorded for/)).toBeVisible();
  });

  await test.step("add salary with APIT", async () => {
    await page.goto("/income");
    await page.getByRole("button", { name: "Add income" }).click();
    await dialog.getByLabel("Employer").fill("Colombo Analytics (Pvt) Ltd");
    await dialog.getByLabel("Basic salary").fill("-5");
    await dialog.getByRole("button", { name: "Add income" }).click();
    await expect(dialog.getByText("Amount cannot be negative")).toBeVisible();
    await dialog.getByLabel("Basic salary").fill("300000");
    await dialog.getByLabel(/APIT deducted per month/).fill("18500");
    await dialog.getByLabel("Number of months").fill("12");
    await dialog.getByRole("button", { name: "Add income" }).click();
    await expect(page.getByText("Income record added.")).toBeVisible();
    await expect(page.getByText("Colombo Analytics (Pvt) Ltd")).toBeVisible();
    await expect(page.getByText("Rs. 222,000 withheld")).toBeVisible();
  });

  await test.step("add bank interest with AIT", async () => {
    await page.getByRole("button", { name: "Add income" }).click();
    await dialog.getByLabel("Type of income").selectOption("INTEREST");
    await dialog.getByLabel("Account or holding").fill("Fixed deposit");
    await dialog.getByLabel("Gross amount").fill("500000");
    await dialog.getByLabel(/AIT \/ WHT deducted/).fill("50000");
    await dialog.getByRole("button", { name: "Add income" }).click();
    await expect(page.getByText("Income record added.").first()).toBeVisible();
    await expect(page.getByText("Fixed deposit")).toBeVisible();
  });

  await test.step("see the calculation and the reason behind it", async () => {
    await page.goto("/tax");
    // 4.1M assessable − 1.8M relief = 2.3M taxable → 60k + 90k + 120k + 90k.
    const result = page.getByRole("region", { name: "Result" });
    await expect(result.getByText("Rs. 360,000")).toBeVisible();
    await expect(result.getByText("Rs. 88,000")).toBeVisible();
    await expect(page.getByText("Rs. 2,300,000").first()).toBeVisible();
    await page.getByRole("button", { name: /Why is personal relief deducted/ }).click();
    // The "Why?" panel names the rule, its source and when it was last verified.
    await expect(dialog.getByText("Rule applied")).toBeVisible();
    await expect(dialog.getByText("Source", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Last verified")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Calculate tax" }).click();
    await expect(page.getByText(/Calculated/)).toBeVisible();
  });

  await test.step("record a payment and see the remaining liability fall", async () => {
    await page.goto("/payments");
    await page.getByRole("button", { name: "Record payment" }).click();
    await dialog.getByLabel("Amount").fill("500000");
    await dialog.getByRole("button", { name: "Record payment" }).click();
    await expect(dialog.getByText(/more than your estimated outstanding tax/)).toBeVisible();
    await dialog.getByLabel("Amount").fill("30000");
    await dialog.getByLabel(/Reference number/).fill("E2E-REF-1");
    await dialog.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Payment recorded.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Reconciliation" }).getByText("Rs. 58,000")).toBeVisible();
  });

  await test.step("add an expense and see why it is not deductible", async () => {
    await page.goto("/expenses");
    await page.getByRole("button", { name: "Add expense" }).click();
    await dialog.getByLabel("Amount").fill("12000");
    await dialog.getByLabel("Description").fill("Family groceries");
    await dialog.getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Expense added.")).toBeVisible();
    await expect(page.getByText("Not deductible").first()).toBeVisible();
    await page.getByRole("button", { name: /Why is this expense treated this way/ }).click();
    await expect(page.getByText(/Personal and domestic expenses cannot be deducted/)).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await test.step("upload a tax document", async () => {
    await page.goto("/documents");
    await page.getByRole("button", { name: "Upload document" }).click();
    await dialog.getByLabel("File", { exact: true }).setInputFiles({ name: "t10-certificate.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    await dialog.getByLabel("Category").selectOption("APIT_DOCUMENT");
    await dialog.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByText("Document uploaded.")).toBeVisible();
    await expect(page.getByText("t10-certificate", { exact: true })).toBeVisible();
  });

  await test.step("review the annual summary and export it", async () => {
    await page.goto("/reports");
    await expect(page.getByText(/Annual tax summary/)).toBeVisible();
    const pdf = await page.request.get("/api/export/tax-summary-pdf");
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    const csv = await page.request.get("/api/export/income");
    expect(await csv.text()).toContain("Colombo Analytics (Pvt) Ltd");
  });

  await test.step("the dashboard reflects everything", async () => {
    await page.goto("/dashboard");
    const position = page.getByRole("region", { name: "Tax position" });
    await expect(position.getByText("Rs. 360,000")).toBeVisible();
    await expect(position.getByText("Rs. 58,000")).toBeVisible();
    await expect(page.getByText("Tax health")).toBeVisible();
    await expect(page.getByText("Employer tax certificate uploaded")).toBeVisible();
  });

  await test.step("sign out, and private pages are closed", async () => {
    await page.getByRole("button", { name: /Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/income");
    await expect(page).toHaveURL(/\/login/);
    expect((await page.request.get("/api/income")).status()).toBe(401);
  });

  await test.step("sign back in and delete the account", async () => {
    await page.getByLabel("E-mail address").fill(email);
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That e-mail address or password is incorrect.")).toBeVisible();
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/settings");
    await page.getByRole("tab", { name: /Privacy/ }).click();
    await page.getByRole("button", { name: "Delete my account" }).click();
    await dialog.getByLabel("Password").fill(password);
    await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
    await dialog.getByRole("button", { name: "Permanently delete" }).click();
    await expect(page).toHaveURL(/\/\?deleted=1/);
    await expect(page.getByText("Your account and all of its data have been deleted.")).toBeVisible();
  });
});

test("the public calculator estimates tax without an account", async ({ page }) => {
  await page.goto("/tax-calculator");
  await page.getByLabel("Annual salary").fill("3600000");
  await page.getByLabel("Other income").fill("250000");
  await page.getByRole("button", { name: "Estimate my tax" }).click();
  await expect(page.getByText("Rs. 285,000").first()).toBeVisible();
  await expect(page.getByText("Rs. 2,050,000")).toBeVisible();
  await expect(page.getByText("Create an account to save this calculation.")).toBeVisible();
  await expect(page.getByText(/This is an estimate, not a tax assessment/)).toBeVisible();
});
