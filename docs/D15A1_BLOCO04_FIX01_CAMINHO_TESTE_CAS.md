# OneMedia D15A1 — Bloco 04 FIX01: teste estrutural entre repositórios

**Baseline:** `OneMedia_frontend_atual15.zip` e `ooh-manager-api_atual122.zip`.

## Defeito identificado

O cenário `D15A1-04-09` tentava ler `../backend/src/dooh-player-core/dooh-player-admin.service.ts`, mas no workspace local o repositório backend é irmão do frontend e se chama `ooh-manager-api`. O teste terminava com `ENOENT`, embora os testes Jest do CAS e o build NestJS tivessem passado.

## Correção (somente teste e documentação)

- Resolve os caminhos relativos à localização do próprio script, sem depender do diretório de execução para encontrar o backend.
- Procura primeiro `../ooh-manager-api` e, por compatibilidade, `../backend`.
- Permite definir o diretório explicitamente por `ONEMEDIA_BACKEND_ROOT`. Valor configurado inválido provoca FAIL, não SKIP.
- Se o frontend estiver isolado (por exemplo, no checkout do CI), o cenário de validação do **código de outro repositório** é marcado **SKIP**, de forma explícita. Isso **não aprova** o CAS: a validação obrigatória permanece no Jest do backend.
- Confere a existência e a ordem dos métodos, o uso de retry serializável, o erro de snapshot obsoleto e as atualizações diferenciais que preservam associações inalteradas.

**Não houve mudança** nos componentes React, contratos HTTP, endpoints NestJS, Prisma, banco, quotas, licença, Cakto ou produção.

## Aplicar no frontend

Na raiz do repositório `OneMedia`:

```bash
unzip -o "../GPT/OneMedia_D15A1_BLOCO04_FIX01_Teste_CAS_Caminho_patch.zip" -d .
```

## Validar

```bash
node --experimental-strip-types --test \
  scripts/d13j-dooh-player-inventory.test.mjs \
  scripts/d13k-dooh-player-detail.test.mjs \
  scripts/d13l-dooh-player-operational-safety.test.mjs \
  scripts/d15a1-player-operations.test.mjs \
  scripts/d15a1-pairing-assignment.test.mjs \
  scripts/d15a1-group-command-audit.test.mjs \
  scripts/d15a1-safe-group-membership.test.mjs

npm run build
```

Com `../ooh-manager-api` presente: esperado **86 PASS / 0 FAIL / 0 SKIP**.
Com frontend isolado: esperado **85 PASS / 0 FAIL / 1 SKIP**; nesse caso execute o Jest do backend separadamente.

Se o backend não estiver na pasta padrão, execute, por exemplo:

```bash
ONEMEDIA_BACKEND_ROOT="/caminho/completo/ooh-manager-api" node --experimental-strip-types --test scripts/d15a1-safe-group-membership.test.mjs
```

No backend (separadamente, sem alteração deste patch):

```bash
npm test -- --runInBand src/dooh-player-core/dooh-player-members-cas.spec.ts
npm run build
```

## Evidência do FIX01

- Checkout frontend + arquivo de backend no caminho irmão: **86/86 PASS**.
- Checkout apenas frontend: **9 PASS / 1 SKIP** na suíte D15A1-04.
- Nenhuma operação produtiva ou mutação de dados executada.

**Pendente:** smoke funcional e teste de concorrência com PostgreSQL isolado; nenhum GO de produção é concedido por este FIX.
