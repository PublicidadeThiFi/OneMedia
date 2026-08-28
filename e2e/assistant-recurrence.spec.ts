import { expect, test } from "@playwright/test";

test("recurring operational block requires confirmation and survives lifecycle reloads", async ({
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
  const panel = page.getByTestId("recurrence-panel");
  await panel.getByLabel("Unidade de mídia").fill("assistant-browser-e2e-unit");
  await panel.getByLabel("Timezone IANA").fill("America/Sao_Paulo");
  await panel.getByLabel("Data inicial").fill("2027-02-01");
  await panel.getByLabel("Quantidade de ocorrências").fill("3");
  await panel.getByRole("button", { name: "Revisar recorrência" }).click();
  await expect(panel.getByText(/DRAFT · Diária/)).toBeVisible();

  await page.reload();
  await page.getByLabel("Abrir assistente OneMedia").click();
  await expect(
    page.getByTestId("recurrence-panel").getByText(/DRAFT · Diária/),
  ).toBeVisible();
  await page
    .getByTestId("recurrence-panel")
    .getByRole("button", { name: "Confirmar" })
    .dblclick();
  await expect(
    page.getByTestId("recurrence-panel").getByText(/ACTIVE · Diária/),
  ).toBeVisible();
  await page
    .getByTestId("recurrence-panel")
    .getByRole("button", { name: "Pausar" })
    .click();
  await expect(
    page.getByTestId("recurrence-panel").getByText(/PAUSED · Diária/),
  ).toBeVisible();
  await page
    .getByTestId("recurrence-panel")
    .getByRole("button", { name: "Retomar" })
    .click();
  await expect(
    page.getByTestId("recurrence-panel").getByText(/ACTIVE · Diária/),
  ).toBeVisible();
  await page
    .getByTestId("recurrence-panel")
    .getByRole("button", { name: "Cancelar" })
    .click();
  await expect(
    page.getByTestId("recurrence-panel").getByText(/CANCELLED · Diária/),
  ).toBeVisible();
});
