# D13N — Ensaio automatizado de UI DOOH, sem backend ou infraestrutura

Estado inicial: D13J / D13K / D13L (frontend) e D13M (API, PostgreSQL descartável) aprovados localmente. D13N não é produção nem homologação de hardware.

## Escopo
- Exercitar no Chromium os componentes REAIS `DoohPlayerInventoryReadOnly` e `DoohPlayerDetailReadOnly`, não uma cópia da UI.
- Apenas os providers `useAuth` e `useProductAccess` são substituídos por stubs em configuração Vite exclusiva de testes, sem modificação de código de produção.
- Dados de API sintéticos interceptados pelo Playwright. Nenhum backend, banco, serviço pago ou recurso AWS é necessário; nenhuma requisição de escrita é permitida pela fixture.
- Abrange 10 cenários: listagem, licença offline, filtro online=false, detalhes sem segredos, troca de filtros, revogação de perfil, empresa divergente, HTTP 403/503, contrato inválido, paginação/busca.

## Fronteiras
- A D13M valida JWT/RBAC/isolamento no backend; a D13N apenas exercita comportamento no navegador COM providers de teste.
- Playwright deve estar instalado no `node_modules` do frontend e Chromium deve existir localmente; **nenhum download é feito automaticamente**.
- Vite teste responde somente no loopback `127.0.0.1:41741` e recebe `VITE_API_URL` apontando para o mesmo loopback; `envDir` da fixture não lê `.env` principal.
- O teste não modifica API NestJS, migrations, Cakto, AWS, CloudWatch, dados reais nem `HOLD_NO_PURGE`.
- Logs de heartbeat e eventos reportados não são prova de reprodução física/impressões.

## Execução
Em `OneMedia` (frontend), com dependências já instaladas:

```bash
bash scripts/run-d13n-dooh-browser-qa.sh
```

Se faltar o navegador: executar manualmente `./node_modules/.bin/playwright install chromium` após autorizar eventual download. Repetir o runner. Não faça isso na pasta backend.

## Aceite
`D13N_FRONTEND_BROWSER_READ_ONLY_QA_PASS__PRODUCTION_NO_GO` exige regressão D13L 47/47, build Vite PASS e testes Chromium PASS. Os testes são automatizados e não exigem abrir páginas manualmente.

## Pendências de produção
Homologação autenticada com API real, hardware/player real, restore RDS/KMS, telemetry/alertas externos (adiados por custo), deploy e liberação do pause global. Sempre NO-GO até autorizações e evidências independentes.
