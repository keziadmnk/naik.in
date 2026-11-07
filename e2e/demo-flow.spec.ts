import { expect, test } from "@playwright/test";

test("demo Bu Sari sampai laporan dan label", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Catat dengan tenang/ })).toBeVisible();
  await page.goto("/keuangan");
  await expect(page.getByRole("heading", { name: "Keuangan" })).toBeVisible();

  await page.locator('a[href="/keuangan"]').first().click();
  await page.getByRole("button", { name: /90 hari/ }).click();
  await page.getByRole("button", { name: "Lanjut ke sumber data" }).click();
  await page.getByRole("button", { name: "Gunakan data preset" }).click();
  await expect(page.getByRole("button", { name: "Konfirmasi data" })).toBeVisible();
  await page.getByRole("button", { name: "Konfirmasi data" }).click();
  await expect(page.getByText("Data sudah dikonfirmasi")).toBeVisible();

  await page.goto("/keuangan/stress");
  await page.getByRole("slider", { name: "Plafon" }).fill("20000000");
  await expect(page.getByText("Merah", { exact: true }).first()).toBeVisible();

  await page.locator('a[href="/label"]').first().click();
  await page.getByRole("button", { name: "Sampel A" }).click();
  await expect(page.getByText(/Skor \d+ dari 100/)).toBeVisible();
  const sampleAScore = await page.getByText(/Skor \d+ dari 100/).textContent();
  await page.getByRole("button", { name: "Sampel B" }).click();
  const sampleBScore = await page.getByText(/Skor \d+ dari 100/).textContent();
  expect(Number(sampleBScore?.match(/\d+/)?.[0])).toBeGreaterThan(Number(sampleAScore?.match(/\d+/)?.[0]));

  await page.locator('a[href="/laporan"]').first().click();
  await expect(page.getByRole("heading", { name: "Laporan Kesiapan Usaha" })).toBeVisible();
  await page.getByRole("button", { name: "Cetak/Simpan PDF" }).click();
});
