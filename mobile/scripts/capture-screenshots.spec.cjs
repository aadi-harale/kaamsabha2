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

test("capture KaamSabha mobile product screens", async ({ page }) => {
  await openFresh(page);

  await page.getByText("Continue", { exact: true }).click();
  await page.waitForTimeout(400);
  await expect(page.getByText("Popular services", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("01-customer-home.png"), fullPage: true });

  await page.getByText("Electrical", { exact: true }).first().click();
  await page.getByText("Bookings", { exact: true }).last().click();
  await page.waitForTimeout(400);
  await expect(page.getByText("Scope Lock", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("02-active-booking-scope-lock.png"), fullPage: true });

  await openFresh(page);
  await page.getByText("Worker member", { exact: true }).click();
  await page.getByText("Continue", { exact: true }).click();
  await page.getByText("Earnings", { exact: true }).last().click();
  await page.waitForTimeout(350);
  await expect(page.getByText("6-week earnings trend", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("03-worker-earnings.png"), fullPage: true });

  await openFresh(page);
  await page.getByText("Cooperative admin", { exact: true }).click();
  await page.getByText("Continue", { exact: true }).click();
  await page.getByText("Governance", { exact: true }).last().click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: shot("04-governance-policy-twin.png"), fullPage: true });

  await page.getByText("Federation", { exact: true }).last().click();
  await page.waitForTimeout(350);
  await expect(page.getByText("Federation control map", { exact: true })).toBeVisible();
  await page.screenshot({ path: shot("05-federation-exchange.png"), fullPage: true });
});
