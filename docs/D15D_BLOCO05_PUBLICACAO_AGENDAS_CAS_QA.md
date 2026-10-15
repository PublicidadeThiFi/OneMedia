# D15D-05 — Revisão e publicação QA de agendas

Frontend acrescenta o componente `DoohSchedulePublishQa` à tela de Agendas (apenas para DRAFT e destinos validados). Consulta detalhes e destinos por GET autenticados antes da operação, compara o estado com a revisão apresentada, requer digitação de `PUBLICAR AGENDA` e confirmação do navegador. O envio usa **somente** `/dooh/schedules/:id/publish-cas`.

**Gate padrão:** interface só permite envio quando `import.meta.env.MODE === 'qa'` e `VITE_DOOH_SCHEDULE_PUBLISH_QA_ENABLED === 'true'`. A API exige gate independente por ambiente e empresa. Estes parâmetros não são alterados no patch e **não devem ser habilitados neste momento**. A ausência de qualquer autorização desabilita a operação.

O botão de QA solicita transição de status em banco, não gera manifest, não dispara player, não ativa programação, não valida Proof-of-Play. A aplicação restringe agendas não finitas antes da tentativa; regras integrais de conflitos e resolução são do servidor, e não do preview amostrado.

Ao ocorrer timeout, resposta inválida ou conflito, consultar o catálogo novamente: o frontend não faz retry automático.

## Testes

```sh
node --experimental-strip-types --test scripts/d13[jkl]-*.test.mjs scripts/d15*.test.mjs
npm run build
```

Esperado com ambos os checkouts: **327 PASS, 0 FAIL, 0 SKIP**. Backend deve ser validado separadamente por Jest e NestJS build. É proibido realizar deploy/push automaticamente ou ativar QA ou distribuição nesta etapa.
