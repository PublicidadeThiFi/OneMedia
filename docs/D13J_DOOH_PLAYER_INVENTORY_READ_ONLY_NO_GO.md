# OneMedia — D13J · Inventário DOOH no frontend (somente leitura)

**Baseline analisado:** `OneMedia_frontend_atual6.zip` + contrato do backend `ooh-manager-api_atual109.zip`.

## Objetivo e escopo

Substituir o placeholder da rota autenticada `/app/dooh/screens` por uma consulta real à listagem administrativa `GET /api/dooh/players`, sem criar endpoints, permissões, comandos ou efeitos colaterais. A etapa D13I (CloudWatch/coletor externo) fica **exclusivamente no backlog**, por decisão de custo. D13J não depende de observabilidade paga.

## Contrato confirmado no backend

- `DoohPlayerAdminController.list`: `GET /api/dooh/players`, exigindo entitlement DOOH e papel `ADMINISTRATIVO` ou `TI` no servidor.
- Filtros aceitos: `page`, `pageSize`, `q`, `lifecycleStatus=ACTIVE|INACTIVE|RETIRED`, `online=true|false`.
- Resposta: `{ items: [...], meta: { page, pageSize, total, totalPages, offlineAfterSeconds } }`.
- Projeção por item: nome, plataforma, lifecycle, `online`, `lastSeenAt`, tela ativa vinculada e versões `desiredManifestVersion`/`currentManifestVersion`.
- `ACTIVE` consome quota mesmo offline; `online` representa apenas heartbeat recente dentro do limiar do servidor; manifest igual não comprova proof-of-play.

## Implementado

1. Rota **Telas e Players** com leitura paginada (20 por página), busca por nome/plataforma, filtro por lifecycle e conectividade.
2. Guard de visibilidade frontend por empresa, módulo DOOH (`FULL` ou `READ_ONLY`) e papéis técnicos; o **backend continua sendo a fonte de autorização**.
3. Validação de formato da resposta. Payload incompleto/incompatível não é renderizado como inventário íntegro.
4. Cancelamento de requests ao trocar filtro, página, empresa ou desmontar a tela. Não há armazenamento local de dados dos players.
5. Exibição explícita da distinção entre licenciamento, heartbeat, versões e comprovação de exibição.
6. Ausência deliberada de ativar/desativar, parear, associar tela, reiniciar, publicar agenda/manifest, exportar ou faturar.

## Aceite local

Na raiz do **frontend** `OneMedia` (não dentro de `ooh-manager-api`):

```bash
bash scripts/run-d13j-dooh-player-inventory-qa.sh
```

O runner executa 13 testes Node de contrato/segurança estática e `npm run build` do Vite. **Não inicia navegador, servidor, Docker, API ou banco.** Node 22+ necessário para o verificador de tipos nativo (`--experimental-strip-types`). Dev deps da aplicação precisam estar instaladas previamente.

Marcador após sucesso: `D13J_FRONTEND_DOOH_INVENTORY_READ_ONLY_QA_PASS__PRODUCTION_NO_GO`.

## Limitações e continuidade

- Ainda é necessária uma homologação autenticada com a API conectada a dados autorizados, incluindo `READ_ONLY`, `FULL`, `NONE`, perfis sem papel técnico, paginação e isolamento entre empresas; os testes estáticos não substituem essa verificação.
- O frontend completo ainda não implementa operações de player nem todas as telas de biblioteca, programação e relatórios.
- Os testes de build locais do frontend **não foram executados neste ambiente**; o Mac deve fornecer o log real.
- D13I (observabilidade externa) permanece como melhoria futura, **sem contratação CloudWatch, coletor, dashboard ou alertas**.
- `HOLD_NO_PURGE`; nenhuma alteração em backend, migrations (67 existentes), AWS/RDS, Cakto ou produção. **Produção: NO-GO**.
