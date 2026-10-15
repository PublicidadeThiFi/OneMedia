# OneMedia — D15D / Bloco 04 — Prévia Temporal, Prioridades e Conflitos

Data-base: 2026-10-15. Baselines: `OneMedia_frontend_atual32.zip`, `ooh-manager-api_atual131.zip`.

## Escopo exato

Novo painel de consulta sob DOOH > Programação > Agendas, reutilizando exclusivamente:

- `GET /api/dooh/schedules/preview?playerId=...&at=...&draftScheduleId=...` (D6C1);
- `GET /api/dooh/schedules/preview/timeline?playerId=...&from=...&to=...&draftScheduleId=...` (D6C3).

O prefixo `/api` já é fornecido pelo `apiClient` no frontend.

Sem alteração em backend, migrations, AWS, licenciamento, storage ou variáveis de ambiente.

## Comportamento operacional

- Acesso: empresa correta, grant DOOH `READ_ONLY` ou `FULL`, papel técnico `ADMINISTRATIVO` ou `TI`.
- O operador informa um UUID de player **ACTIVE** e instante ISO-8601 com offset, ou intervalo de até 24h.
- Opcionalmente simula uma agenda `DRAFT` presente no catálogo da empresa, sem publicá-la.
- Mostra `READY`, `NO_MATCH` e `CONFLICT`, agenda efetiva, prioridades `TAKEOVER > STANDARD > FALLBACK` e empates sem desempate arbitrário.
- Linha do tempo: segmentos de amostras em minutos UTC, `authoritativeForPublication: false`, até 1441 amostras; até 150 segmentos na tabela, com truncamento de exibição **declarado**, sem truncar a validação da resposta.
- Exige correspondência estrita de player, draft, datas, contadores, limites, continuidade de segmentos, identidades e estados.
- Cancela consultas antigas ao trocar empresa, sessão, parâmetros ou catálogo. Nunca ecoa payloads do backend em mensagens de erro.

## Limitações que não podem ser confundidas

1. A prévia amostrada **não prova ausência integral** de conflitos de intervalos subminuto, nem substitui a prova transacional do backend exigida para publicação.
2. `READY` significa agenda resolvida na consulta, **não** comprovante de publicação distribuída, manifest, download do player, Proof-of-Play ou audiência.
3. Apenas players ACTIVE da empresa autorizada podem ser simulados pela API; UUID inválido ou player não encontrado falha fechado.
4. O operador deve conhecer o UUID do player. Não há, neste bloco, seletor visual universal de players nem consulta de inventário adicional.
5. O catálogo retorna até 100 agendas, sem garantia de cobertura total; o backend aplica limites próprios de processamento da prévia e pode recusar a resolução (409).
6. Nenhuma operação de POST, PUT, PATCH ou DELETE foi adicionada. `HOLD_NO_PURGE` e `ACTIVE_PLAYER` permanecem intactos.

## Verificação local — frontend

```bash
unzip -o "../GPT/OneMedia_D15D_BLOCO04_Preview_Temporal_Conflitos_ReadOnly_patch.zip" -d .
node --experimental-strip-types --test scripts/d13[jkl]-*.test.mjs scripts/d15*.test.mjs
npm run build
```

Baseline anterior: 297 testes. Novos: 18. Total esperado com os repositórios irmãos: **315/315 PASS**, sem SKIP.

## Segurança de rollout

Não executar `git push`/deploy automaticamente. O push em `master` pode disparar GitHub Pages; solicitar aprovação e plano de rollback antes de publicar. O painel depende de endpoints de leitura já existentes, mas disponibilidade de produção e homologação com dados reais continuam pendentes.
