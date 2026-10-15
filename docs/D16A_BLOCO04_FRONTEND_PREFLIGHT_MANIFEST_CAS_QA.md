# D16A04 — Frontend de prévia e confirmação CAS de manifest

- Baseline frontend `OneMedia_frontend_atual37.zip`. Este painel é um módulo separado no detalhe do player e não modifica o inventário D16A01.
- Usa `GET /dooh/manifests/players/:id/preflight` com janela UTC de até 24 horas; valida empresa, player, janela, contadores, status, issues e checksum. Não exibe manifest bruto, storage, credenciais nem estimativas de audiência.
- O frontend envia `POST /dooh/manifests/players/:id/publish-cas` **apenas se** o build foi explicitamente habilitado via `VITE_DOOH_MANIFEST_PUBLISH_QA_UI_ENABLED=true`, a sessão possui empresa correta, módulo FULL e função técnica, o preflight foi `READY`, texto `MATERIALIZAR QA`, checkbox e confirmação de diálogo foram aceitos.
- Mesmo quando habilitada no build, a mutação depende do QA Gate D16A02 do backend, que impede o uso em produção e exige allowlist e confirmação operacional. A variável `VITE_` não contém segredo; é somente uma chave pública de UX, nunca autorização.
- Antes de enviar um POST, consulta novamente o preflight. O backend refaz todas as verificações dentro de `SERIALIZABLE` antes de persistir. Após sucesso ou timeout, atualizar detalhe e inventário para evitar replay, sem retry automático.
- **Não habilitar flags nem ativar distribuição ou hardware agora.** A materialização avançará `desiredManifestVersion` e poderá ser entregue ao runtime quando autorizado.

## Verificação no VS Code

```bash
node --experimental-strip-types --test \
  scripts/d13j-*.test.mjs scripts/d13k-*.test.mjs scripts/d13l-*.test.mjs \
  scripts/d15*.test.mjs scripts/d16a1-manifest-inventory-readonly.test.mjs \
  scripts/d16a4-manifest-publish-cas.test.mjs
npm run build
```

Sem deploy automático ou teste visual obrigatório em localhost. Aprovar rollout/rollback coordenado antes de qualquer promoção à produção.
