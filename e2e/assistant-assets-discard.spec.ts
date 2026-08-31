import { expect, test } from "@playwright/test";

test("discarded inventory asset creates no definitive link", async ({
  page,
}) => {
  await page.route(/openai|gemini|googleapis|telemetry|analytics/i, (route) =>
    route.abort("blockedbyclient"),
  );
  await page.goto("/login");
  await page
    .locator("input[type=email]")
    .fill("assistant-browser-e2e@example.test");
  await page.locator("input[type=password]").fill("AssistantBrowserE2E!2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByLabel("Abrir assistente OneMedia").click();
  await page.getByLabel("Anexar arquivo").click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "inventario-discard.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Nome;Tipo\nPonto Novo;OOH"),
    });
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByRole("button", { name: "Preencher item por item" }).click();
  await page.getByText("Adicionar fotos (opcional)").click();
  const panel = page.getByText("Fotos do inventário").locator("xpath=..");
  await panel
    .getByPlaceholder("ID explícito do destino")
    .fill("assistant-browser-e2e-point");
  await panel.locator("input[type=file]").setInputFiles({
    name: "discard.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]),
  });
  await panel.getByRole("button", { name: "Enviar para revisão" }).click();
  await panel.getByRole("button", { name: "Descartar" }).click();
  await expect(panel.getByText(/DISCARDED/)).toBeVisible();
  await page.reload();
  await page.getByLabel("Abrir assistente OneMedia").click();
  await page.getByText("Adicionar fotos (opcional)").click();
  await expect(page.getByText(/DISCARDED/)).toBeVisible();
});
