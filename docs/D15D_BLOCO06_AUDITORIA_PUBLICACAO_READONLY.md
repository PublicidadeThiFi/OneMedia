# D15D06 — Painel de verificação estrutural do registro atual

A seção Programação → Agendas incorpora um botão **Verificar registro** para consultar `GET /dooh/schedules/:id/publication-audit` (base `/api` do cliente). O painel exige sessão, empresa e grant DOOH `READ_ONLY`/`FULL` com papel técnico.

É uma leitura explicitamente solicitada pelo operador; não faz polling, não autoriza publicação, não envia comandos, não dispara workers. Cada solicitação é cancelada ao mudar agenda, usuário, empresa ou permissões.

O contrato frontend recusa: retorno de tenant ou agenda diferente, revisão obsoleta, dados de versão incorretos, alteração de timestamp, limite de destinos atingido, contagens inválidas, códigos desconhecidos e qualquer afirmação de distribuição, reprodução ou histórico completo. Mensagens de erro não refletem conteúdo privado do servidor.

### Significado operacional

- `STRUCTURAL_RECORD_CONSISTENT`: apenas conferência da persistência atual.
- `REVIEW_REQUIRED`: campos ausentes, registros inconsistentes ou restrições excedidas.
- `NOT_CHECKED` para distribuição e reprodução; histórico de alterações `NOT_AVAILABLE`.

**Nenhum desses estados é um GO para manifest, player, publicação real, exploração de Proof-of-Play ou deploy.** O fluxo de Marketplace anterior, editores, CAS e preview temporal foram preservados.

### Validação

`node --experimental-strip-types --test scripts/d13j-*.test.mjs scripts/d13k-*.test.mjs scripts/d13l-*.test.mjs scripts/d15*.test.mjs`

`npm run build`

Não rodar em produção sem planejamento de rollout/rollback e homologação integrada, respeitando `HOLD_NO_PURGE` e `ACTIVE_PLAYER`.
