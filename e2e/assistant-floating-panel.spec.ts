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

test("assistant is non-modal, restores at the newest message and remains accessible", async ({
  page,
}) => {
  fixture("conversation-seed");
  const forbiddenConsole: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      /fetchPriority|DialogContent requires a DialogTitle|Missing Description|aria-describedby|React does not recognize/i.test(
        text,
      )
    ) {
      forbiddenConsole.push(text);
    }
  });
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
  await page.waitForTimeout(1_800);
  const skipTutorial = page.getByRole("button", { name: "Pular", exact: true });
  if (await skipTutorial.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipTutorial.click();
  }
  await page.getByLabel("Abrir assistente OneMedia").click();

  const panel = page.getByTestId("assistant-floating-panel");
  await expect(panel).toBeVisible();
  await expect(page.locator("[data-radix-dialog-overlay]")).toHaveCount(0);
  await expect(
    panel.getByText("Synthetic conversation message 40"),
  ).toBeVisible();
  await expect
    .poll(() =>
      panel
        .locator(".overflow-y-auto")
        .first()
        .evaluate((element) =>
          Math.abs(
            element.scrollHeight - element.scrollTop - element.clientHeight,
          ),
        ),
    )
    .toBeLessThanOrEqual(24);

  const viewport = panel.locator(".overflow-y-auto").first();
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollTop))
    .toBe(0);
  await page.waitForTimeout(100);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("assistant:push-message", {
        detail: { content: "Synthetic new message while reading history" },
      }),
    ),
  );
  await expect(
    panel.getByRole("button", { name: "Novas mensagens" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  await expect(panel).toBeVisible();
  await page.getByLabel("Abrir assistente OneMedia").click();
  await page.waitForTimeout(250);
  await expect(panel).toBeVisible();

  const clientsNavigation = page
    .getByRole("button", { name: /Clientes/i })
    .first();
  await clientsNavigation.click();
  await expect(panel).toBeVisible();
  await expect(page.getByText(/Clientes/i).first()).toBeVisible();

  await panel.getByLabel("Fechar assistente OneMedia").click();
  await expect(panel).toBeHidden();
  expect(forbiddenConsole).toEqual([]);
});
