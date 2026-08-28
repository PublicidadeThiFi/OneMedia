import { expect, test } from '@playwright/test';

test('geocoding remains reviewable, confirmable and persistent after reload',async({page})=>{
 await page.route(/openai|gemini|googleapis|telemetry|analytics/i,route=>route.abort('blockedbyclient'));
 await page.goto('/login');
 await page.locator('input[type=email]').fill('assistant-browser-e2e@example.test');
 await page.locator('input[type=password]').fill('AssistantBrowserE2E!2026');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByLabel('Abrir assistente OneMedia').click();
 await page.getByLabel('Anexar arquivo').click();
 await page.locator('input[type=file]').first().setInputFiles({name:'inventario-geocoding.csv',mimeType:'text/csv',buffer:Buffer.from('Nome;Tipo;Logradouro;Numero;Cidade;UF\nPonto Geo;OOH;Rua Teste;10;Sao Paulo;SP')});
 await page.getByRole('button',{name:'Enviar'}).click();
 const panel=page.getByText('Geocoding revisável').locator('xpath=..');
 await panel.getByRole('button',{name:'Consultar endereço'}).click();
 await expect(panel.getByText(/confiança 99%/)).toBeVisible();
 await panel.getByRole('button',{name:'Confirmar estas coordenadas'}).dblclick();
 await expect(panel.getByText(/-23.5505, -46.6333/)).toBeVisible();
 await page.reload();
 await page.getByLabel('Abrir assistente OneMedia').click();
 await expect(page.getByText(/-23.5505, -46.6333/)).toBeVisible();
});
