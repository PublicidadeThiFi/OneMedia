# OneMedia — D15A1 / Bloco 02 — Interface de pareamento e associação de SCREEN

**Baseline:** `OneMedia_frontend_atual12.zip`, a partir do commit informado `6195fe7`. Backend utilizado **exclusivamente para conferir contratos**: `ooh-manager-api_atual121(1).zip`. **Nenhuma alteração no backend/infraestrutura.**

## Escopo implementado

- Novo componente `DoohPlayerPairingAndAssignment` na página DOOH > Telas e Players, separado da consulta D13J/K/L e das operações D15A1-01.
- Pareamento administrativo via `POST /api/dooh/players/pair` com código gerado no runtime do dispositivo, nome, confirmação expressa e header `Idempotency-Key` gerado via Web Crypto.
- Resultado projetado somente em `playerId`, `name`, `lifecycle` e `idempotentReplay` (descarta `installationId`, metadados e segredos).
- Lista dos primeiros 100 players da empresa para seleção de player existente.
- Associação via `PUT /api/dooh/players/:id/assignment` após validação de `GET /api/media-units/:id` (UUID, `companyId`, `SCREEN`, `isActive`) e consulta fresca do player por `GET /api/dooh/players/:id`.
- Confirmação explícita do operador, sem exclusão, unassign, mudança de `lifecycleStatus`, comando remoto, quota, migration ou despausa.
- Somente acesso DOOH `FULL`, empresa coincidente e papel `ADMINISTRATIVO` ou `TI` para claim. Associação exige `ADMINISTRATIVO`, pois a rota de preflight de MediaUnit no backend está acessível apenas a `ADMINISTRATIVO` e `COMERCIAL`.
- Erros HTTP sanitizados; preservação do estado anterior em caso de falha/contrato inesperado. Sem URL, JWT, código de pareamento ou credencial em logs da interface.

## Salvaguardas

1. **O backend é a autoridade de quota `ACTIVE_PLAYER`, licença, global pause e tenancy.** O frontend não traz controle para desligar a pausa, editar grants ou alterar limite de players.
2. O `POST /players/pair` **pode provocar uma nova ativação**, quando o backend a permitir; não é um teste de somente leitura. Enquanto a ativação global estiver pausada, a operação de uma nova licença deve ser recusada pelo backend. O operador não deve executá-la em produção como parte do smoke sem autorização expressa.
3. `pairing/start` e `pairing/complete` pertencem ao **runtime do dispositivo**, não ao painel do navegador. Este patch não cria player físico nem prova conexão, download ou exibição.
4. A associação só aceita `SCREEN` ativa e pertencente à empresa. O backend verifica conflito de ocupação e preserva o histórico de assignments.
5. `HOLD_NO_PURGE` permanece obrigatório. Não há comandos de deploy, alteração de RDS, Cakto, seed ou limpeza.

## Limites intencionais

- A SCREEN é informada pelo UUID da unidade do inventário OOH; seletor pesquisável por ponto/tela ficará para um próximo bloco.
- A lista administrativa apresenta somente os primeiros 100 players; se houver mais, seleção/pesquisa paginada será evoluída depois.
- No papel `TI`, a interface permite claim, mas não associação de tela, porque `GET /api/media-units/:id` não admite TI na autorização atual.
- Os testes locais não validam hardware, credenciais, concessões reais ou produção.
- Os demais módulos DOOH e fluxos Cakto não foram alterados.

## Arquivos do patch

- `src/components/DoohFoundationPage.tsx` — inserção do componente e textos de roadmap.
- `src/components/DoohPlayerPairingAndAssignment.tsx` — nova interface.
- `src/lib/doohPlayerPairingContract.ts` — parsers/sanitização de contratos.
- `scripts/d15a1-pairing-assignment.test.mjs` — 13 novos testes.
- `docs/D15A1_BLOCO02_PAREAMENTO_ASSOCIACAO.md` — este documento.

## Testes

```bash
node --experimental-strip-types --test \
  scripts/d13j-dooh-player-inventory.test.mjs \
  scripts/d13k-dooh-player-detail.test.mjs \
  scripts/d13l-dooh-player-operational-safety.test.mjs \
  scripts/d15a1-player-operations.test.mjs \
  scripts/d15a1-pairing-assignment.test.mjs

npm run build
```

**Resultado nesta entrega:** 68/68 testes Node PASS; os 3 arquivos TypeScript/TSX editados/novos passaram por transpilation syntax check (TypeScript). **Build Vite ainda precisa ser executado no ambiente local**, pois as dependências não estão disponíveis integralmente aqui. Nada foi deployado.
