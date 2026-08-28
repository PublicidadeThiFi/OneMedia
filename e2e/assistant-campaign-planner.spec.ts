import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const fixture = (action: string) =>
  execFileSync(
    process.execPath,
    [
      resolve(
        "..",
        "backend",
        "ooh-manager-api",
        "scripts",
        "assistant-browser-e2e-fixture.mjs",
      ),
      action,
    ],
    {
      cwd: resolve("..", "backend", "ooh-manager-api"),
      env: { ...process.env, NODE_ENV: "test" },
      stdio: "inherit",
    },
  );

test("campaign briefing persists versions and evaluates explainable candidates without downstream writes", async ({
  page,
}) => {
  fixture("planner-seed");
  try {
    await page.route(
      /openai|gemini|googleapis|telemetry|analytics|nominatim|currency/i,
      (route) => route.abort("blockedbyclient"),
    );
    await page.goto("/login");
    await page
      .locator("input[type=email]")
      .fill("assistant-browser-e2e@example.test");
    await page.locator("input[type=password]").fill("AssistantBrowserE2E!2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByLabel("Abrir assistente OneMedia").click();
    const panel = page.getByTestId("campaign-planner-foundation");
    await panel
      .getByLabel("Cliente do briefing")
      .selectOption({ label: "Synthetic Planner Client" });
    await panel.getByLabel("Orçamento em reais").fill("2000");
    await panel.getByLabel("Objetivo").fill("Cobertura sintética revisável");
    await panel.getByLabel("Latitude central").fill("-23.55");
    await panel.getByLabel("Longitude central").fill("-46.63");
    await panel.getByLabel("Raio em metros").fill("5000");
    await panel.getByLabel("Quantidade desejada").fill("1");
    await panel.getByRole("button", { name: "Revisar briefing" }).dblclick();
    await expect(panel.getByText(/DRAFT · versão atual 1/)).toBeVisible();
    await page.reload();
    await page.getByLabel("Abrir assistente OneMedia").click();
    await expect(
      page
        .getByTestId("campaign-planner-foundation")
        .getByText(/DRAFT · versão atual 1/),
    ).toBeVisible();
    await page
      .getByTestId("campaign-planner-foundation")
      .getByRole("button", { name: "Gerar candidatos" })
      .dblclick();
    await expect(
      page
        .getByTestId("campaign-planner-foundation")
        .getByText(/READY · versão atual 1/),
    ).toBeVisible();
    await expect(
      page.getByTestId("campaign-planner-foundation").getByText("Elegível"),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("campaign-planner-foundation")
        .getByText(/900.00 BRL \(unit\)/),
    ).toBeVisible();
    await page
      .getByTestId("campaign-planner-foundation")
      .getByRole("button", { name: "Gerar cenários" })
      .dblclick();
    await expect(page.getByTestId("campaign-scenarios")).toContainText(
      "geração 1",
    );
    await expect(page.getByTestId("campaign-scenarios")).toContainText(
      "ECONOMIC",
    );
    await page
      .getByTestId("campaign-scenarios")
      .getByRole("button", { name: "Selecionar snapshot" })
      .first()
      .click();
    await expect(
      page
        .getByTestId("campaign-scenarios")
        .getByRole("button", { name: "Selecionado" }),
    ).toBeVisible();
    await page.reload();
    await page.getByLabel("Abrir assistente OneMedia").click();
    await expect(page.getByTestId("campaign-scenarios")).toContainText(
      "geração 1",
    );
    await page
      .getByTestId("campaign-planner-foundation")
      .getByLabel("Objetivo")
      .fill("Cobertura sintética versionada");
    await page
      .getByTestId("campaign-planner-foundation")
      .getByRole("button", { name: "Criar nova versão" })
      .dblclick();
    await expect(
      page
        .getByTestId("campaign-planner-foundation")
        .getByText(/DRAFT · versão atual 2/),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("campaign-planner-foundation")
        .getByRole("button", { name: "v1" }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("campaign-planner-foundation")
        .getByRole("button", { name: "v2" }),
    ).toBeVisible();
  } finally {
    fixture("planner-clean");
  }
});
