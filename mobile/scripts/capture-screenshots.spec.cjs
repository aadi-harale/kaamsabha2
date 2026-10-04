const { test, expect } = require("@playwright/test");
const path = require("path");

const shot = (name) => path.join(process.cwd(), "docs", "screenshots", name);

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});

async function openFresh(page) {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
}

async function signIn(page, username) {
  const input = page.getByPlaceholder("customer, ravi, admin…");
  await input.fill(username);
  await page.getByPlaceholder("Enter password").fill("12345");
  await page.getByText("Sign in securely", { exact: true }).click();
  await page.waitForTimeout(450);
}

test("capture KaamSabha mobile product screens", async ({ page }) => {
  await openFresh(page);
  await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("00-secure-login.png"), fullPage: true });

  await signIn(page, "customer");
  await expect(page.getByText("Popular services", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("01-customer-home.png"), fullPage: true });

  await page.getByText("Electrical", { exact: true }).first().click();
  await page.getByText("Bookings", { exact: true }).last().click();
  await page.waitForTimeout(400);
  await expect(page.getByText("Scope Lock", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("02-active-booking-scope-lock.png"), fullPage: true });

  await openFresh(page);
  await signIn(page, "ravi");
  await page.getByText("Earnings", { exact: true }).last().click();
  await page.waitForTimeout(350);
  await expect(page.getByText("6-week earnings trend", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("03-worker-earnings.png"), fullPage: true });

  await openFresh(page);
  await signIn(page, "admin");
  await page.getByText("Governance", { exact: true }).last().click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: shot("04-governance-policy-twin.png"), fullPage: true });

  await page.getByText("Federation", { exact: true }).last().click();
  await page.waitForTimeout(350);
  await expect(page.getByText("Federation control map", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("05-federation-exchange.png"), fullPage: true });
});
