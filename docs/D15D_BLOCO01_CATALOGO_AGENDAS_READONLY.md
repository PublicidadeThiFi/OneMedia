# OneMedia — D15D / Bloco 01 — Catálogo de Agendas (somente leitura)

Baseline: `OneMedia_frontend_atual29.zip` (commit `261a78e`). Backend de referência: `ooh-manager-api_atual129.zip` (`b0c3b12`).

## Escopo

- Integração em **DOOH → Programação**, sem remover catálogo/editor de playlists ou associação manual com o Marketplace.
- Consulta autenticada de agendas (`GET /dooh/schedules`, até 100 registros, sem total nem paginação), detalhe de uma agenda (`GET /dooh/schedules/:id`) e destinos vinculados (`GET /dooh/schedules/:id/targets`, até 100 destinos).
- Projeção mínima e fail-closed: empresa, grant, papel técnico, estados `DRAFT`/`PUBLISHED`/`PAUSED`/`ARCHIVED`, prioridades, fuso, janela, dias, vínculos e quantidade; nenhum campo de metadados extra vai para o estado da interface.
- O detalhe só é exibido se corresponder ao resumo selecionado; os destinos exigem a mesma identidade, status, revisão e contagem. Divergências exigem atualização do catálogo.
- Cancelamento de requisições na troca de seleção/sessão e mensagens de erro estáticas.

## Exclusões / salvaguardas

Nenhum `POST`, `PATCH`, `PUT`, `DELETE`, `publish`, distribuição, manifest, comando de player, ativação DOOH, execução no S3, migração ou alteração no backend. A verificação é estrutural: vínculo com tela/grupo/point não significa conectividade ou playback. Não há expansão efetiva de destinos, análise de conflitos, prévia temporal, criação ou publicação de agendas nesta entrega.

Permanecem `HOLD_NO_PURGE`, pausa global, licenciamento `ACTIVE_PLAYER`, gate de QA e necessidade de aprovação para qualquer rollout/rollback.

## Aplicação

Na raiz do frontend:

```sh
unzip -o "../GPT/OneMedia_D15D_BLOCO01_Catalogo_Agendas_ReadOnly_patch.zip" -d .
node --experimental-strip-types --test scripts/d13[jkl]-*.test.mjs scripts/d15*.test.mjs
npm run build
```

Esperado com backend irmão presente: **267 testes PASS, 0 FAIL, 0 SKIP**. Executar build Vite localmente; não realizar validação visual em localhost nesta fase.

## Rollout / pendências

O patch é de frontend apenas e realiza consultas sobre rotas pré-existentes. `git push` em `master` pode publicar o GitHub Pages: confirmar autorização e plano de rollback antes de executar. Homologação com usuário, tenant e API de produção continua pendente. D15D-B02 será tratada separadamente (seleção/edição de destinos com CAS e salvaguardas do Marketplace); previsão e conflitos, também em etapa separada.
