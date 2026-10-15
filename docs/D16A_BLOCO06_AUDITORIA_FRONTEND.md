# OneMedia — D16A06: revisão de segurança do frontend DOOH

**Baseline:** `OneMedia_frontend_atual39.zip` / commit informado `c62e3c3`. **Escopo deste patch:** apenas testes Node offline e documentação. Nenhuma mudança na UX, nas flags, no tráfego, nos pacotes, no CI ou na produção.

## Invariantes acompanhadas

- D16A01 (inventário) e D16A05 (diagnóstico) permanecem **GET-only**, abortáveis e dependentes de tenant, grant e papéis técnicos.
- D16A03 (preflight) é consultivo; D16A04 exige `FULL`, player `ACTIVE`, build flag literal `true`, dupla confirmação, preflight atualizado e POST exclusivo `/publish-cas`.
- A flag `VITE_DOOH_MANIFEST_PUBLISH_QA_UI_ENABLED` é pública e não autentica operações; o backend é a autoridade e recusa produção.
- Respostas cruzadas entre players/empresas ou snapshots diferentes são rejeitadas. Não há polling de sync nem comandos implícitos.
- `REPORTED_EQUAL` **não comprova** entrega, checksum físico, execução ou Proof-of-Play. Impressões e audiência continuam sem certificação.
- A seção Telas e Players preserva inventário, diagnóstico e módulo QA; nenhuma remoção de Marketplace, alteração de licenciamento, exclusão de manifests ou regra `HOLD_NO_PURGE`.

## Execução sem servidor localhost

Executar no diretório `OneMedia`:

```bash
node --experimental-strip-types --test scripts/d16a6-release-safety.test.mjs

node --experimental-strip-types --test \
  scripts/d13j-*.test.mjs \
  scripts/d13k-*.test.mjs \
  scripts/d13l-*.test.mjs \
  scripts/d15*.test.mjs \
  scripts/d16*.test.mjs

npm run build
```

Opcional, somente local e sem upgrade automático: `npm run security:scan`. Não rodar servidores de frontend, scripts remotos de QA ou workflows de deploy para validar esta fase.

## Estado e ressalvas

Os logs do D16A05 mostram **393 testes aprovados**, build Vite aprovado, Backend CI #96 e Frontend Security CI #98 aprovados. Estes são **resultados anteriores** à incorporação do D16A06; repetir o comando acima para obter uma nova evidência.

A mensagem do `git push` relatou **10 vulnerabilidades Dependabot (5 altas, 4 moderadas, 1 baixa)**. Este patch não atualiza dependências nem resolve os alertas; é necessário fazer triagem das CVEs, alcançar um plano de remediação e registrar exceções aceitas antes do rollout.

O D16A06 prepara a decisão de homologação, mas não concede permissão para produção, materialização, player real, endpoints de mutação ou novas despesas AWS.

**Aceite:** testes offline + build + CI verde, avaliação de alterações com `git diff`, anexação de logs e hashes; um parecer de GO/NO-GO de produção permanece em documento e aprovação separados.

## Evidência offline do patch preparado

Com os dois baselines extraídos lado a lado, a suíte `scripts/d13j-*.test.mjs scripts/d13k-*.test.mjs scripts/d13l-*.test.mjs scripts/d15*.test.mjs scripts/d16*.test.mjs` terminou em **407/407 PASS, 0 FAIL, 0 SKIP**. Os 14 testes D16A06 já estão incluídos nesse número. Se o backend não estiver disponível como pasta irmã no computador usado, alguns testes legados podem reportar `SKIP`; nesse caso, registrar o motivo e executar a suíte Jest do backend. O build após o novo patch ainda deve ser repetido pelo operador.
