# D15D — Bloco 02 | Edição segura dos destinos de agendas

## Escopo

A seção Programação exibe um formulário de edição para agendas `DRAFT` com DOOH `FULL`, grant, mesma empresa e papel técnico. Adiciona por tipo (`PLAYER`, `GROUP`, `MEDIA_UNIT`, `MEDIA_POINT`) + UUID conhecido, ou remove uma associação selecionada na listagem. Cada operação exige confirmação e faz duas consultas de preflight. A gravação usa exclusivamente `PUT /dooh/schedules/:id/targets/cas` com a revisão e o snapshot integral de associações. Não utiliza a rota legada.

O backend aplica o isolamento e valida que o destino pertence à empresa e está disponível. O frontend não presume que um UUID colado seja válido, nem que o registro cadastrado esteja online/reproduzindo. Adicionar destinos aumenta a seleção administrativa, mas não publica agendas nem inicia exibição. Estados não-DRAFT e agendas comerciais travadas são protegidos no backend.

## Limites

São aceitos no máximo 100 destinos; a API não fornece um seletor universal de inventário por tipo. Nesta etapa, a inclusão exige UUID conhecido. A evolução para seletores por inventário poderá ocorrer em etapa separada, após a revisão de endpoints. A fila de produção, manifest, player e Marketplace permanecem intocados.

## Testes

`node --experimental-strip-types --test scripts/d13[jkl]-*.test.mjs scripts/d15*.test.mjs` e `npm run build`. A checagem cruzada lê `../ooh-manager-api` quando disponível; quando isolado no CI, aparece como SKIP explícito. O Jest backend deve ser executado separadamente. Não publicar frontend antes do backend validado, com aprovação de rollout/rollback.
