# OneMedia D15A1 — Bloco 04 (frontend): membros dos grupos com compare-and-set

Baseline: `OneMedia_frontend_atual14.zip` / commit `88d21f3`.

## Escopo
- Componente independente `DoohGroupMembersSafeEditor`, incorporado à seção DOOH / Telas e Players.
- Seleção de grupo, busca de players, inclusão ou remoção de **um** player por operação.
- Leitura autenticada de grupo e players; projeção de DTO sem secrets.
- Proteção `FULL`, tenant exato e papéis técnicos. READ_ONLY apenas consulta.
- Confirmação humana e segunda leitura antes da escrita.
- `PUT /api/dooh/player-groups/:id/members/compare-and-set` exige conjunto de IDs anteriores; só o backend faz a comparação atômica.
- Grupo usado em schedule é bloqueado. Sem operações de restart, delete, publicação, ativação, alteração de quotas, purge, billing e Cakto.

## Dependência obrigatória
O endpoint compare-and-set **não faz parte** da API D14B anterior. Aplicar o patch de backend correspondente no repositório local e aprovar implantação futura em operação separada. **Não publicar diretamente**. Se a API implantada não expuser a rota, a tela recusa a alteração (HTTP 404) e não tenta o endpoint inseguro legado.

## Validação no frontend (sem escrita real)
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

## Status
86/86 testes Node PASS neste ambiente. Verificação sintática TS/TSX PASS. Build Vite não executado neste ambiente por falta do executável instalado; deve ser validado no ambiente local do executor. Nenhum teste de banco, requisição de escrita, runtime físico ou deploy foi realizado.
