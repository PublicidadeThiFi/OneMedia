import { expect, test } from "@playwright/test";

test("proximity alert requires an explicit distinct decision and survives reload", async ({
  page,
}) => {
  await page.route(
    /openai|gemini|googleapis|telemetry|analytics|nominatim/i,
    (route) => route.abort("blockedbyclient"),
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
      name: "inventario-proximidade.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Nome;Tipo;Latitude;Longitude;Logradouro;Numero\nPonto Distinto;OOH;-23.5501;-46.6301;Rua Sintetica;10",
      ),
    });
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByRole("button", { name: "Preencher item por item" }).click();
  const panel = page.getByText("Possíveis pontos próximos").locator("xpath=..");
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/m · coordinates_within_radius/)).toBeVisible();
  await panel
    .getByRole("button", { name: "Confirmar ponto distinto" })
    .dblclick();
  await page.waitForLoadState("domcontentloaded");
  await page.getByLabel("Abrir assistente OneMedia").click();
  await expect(page.getByText(/ponto distinto confirmado/)).toBeVisible();
});
