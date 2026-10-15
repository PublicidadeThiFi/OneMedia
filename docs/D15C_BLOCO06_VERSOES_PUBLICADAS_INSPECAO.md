# OneMedia · D15C — Bloco 06: inspeção somente leitura de versões publicadas

## Baseline e escopo
- Frontend: `OneMedia_frontend_atual28.zip` (commit informado `b5b9082`).
- Backend de referência: `ooh-manager-api_atual129.zip` (commit informado `b0c3b12`).
- **Frontend apenas:** nenhuma alteração no backend, banco, S3, AWS, Cakto ou licenciamento.
- Endpoint preexistente: `GET /api/dooh/playlists/:id/versions/:version/items`.
- A autorização é feita pelo backend: autenticação, role técnica, isolamento por `companyId`, entitlement DOOH. Frontend também exige `FULL` ou `READ_ONLY`, grant e empresa idêntica.

## Entregas
1. A partir do histórico da playlist selecionada, o operador escolhe uma versão `PUBLISHED`.
2. A interface consulta os itens publicados sem invocar rotas de mutação.
3. O contrato compara playlist, UUID da versão, número, prefixo de SHA-256 registrado, timestamp e contagem de itens com o detalhe anteriormente consultado.
4. Validação estrutural: 1–200 itens, IDs únicos, posições contíguas iniciando em zero, UUIDs de versões de mídia e duração inteira em `[1, 86400000]` milissegundos.
5. Somente os campos mínimos (`id`, `mediaVersionId`, `position`, `durationMs`) são mantidos. Campos JSON `metadata` e `transition` recebidos da API nunca são exibidos nem persistidos no estado da interface.
6. Requisições abortadas na troca de empresa, sessão ou versão; respostas incompatíveis com os metadados são recusadas, sem interpretar mensagens privadas da API.

## Limites técnicos explícitos
- **Não existe recomputação completa do SHA-256.** O checksum do backend usa, além da composição, o checksum de cada versão de mídia; o endpoint consultado não retorna esses checksums. Apenas a identidade e o *prefixo* do checksum registrado são comparados com os metadados do histórico.
- Sem checagem do asset no S3, da integridade binária, disponibilidade atual, licenças em player, agendamentos, distribuição, reproduções ou Proof-of-Play.
- Histórico herdado do Bloco 01 exibe até 50 versões e não permite consultar versões anteriores à janela. A API de catálogo exibe até 100 playlists recentes.
- D15C-05 permanece desabilitado por padrão. Este patch não ativa publicação nem contorna seu QA gate.
- `HOLD_NO_PURGE` e regras `ACTIVE_PLAYER` permanecem inalteradas.

## Aplicação (na raiz frontend OneMedia)
```bash
unzip -o "../GPT/OneMedia_D15C_BLOCO06_Inspecao_Versoes_Publicadas_patch.zip" -d .
node --experimental-strip-types --test scripts/d13[jkl]-*.test.mjs scripts/d15*.test.mjs
npm run build
```

## Critérios de aceite
- Testes anteriores: 240 PASS; D15C06: 13 PASS; total: 253 PASS, 0 FAIL, 0 SKIP quando frontend e backend estão lado a lado.
- `npm run build` deve passar no computador do desenvolvedor.
- No checkout isolado do frontend, a checagem cruzada de rota do backend sinaliza `SKIP` explícito; validar o contrato no repositório backend antes da homologação.
- Não operar em produção como teste. Se for publicar o frontend, planejar rollout, backend disponível e rollback aprovado.

## Continuidade
D15C-07 ou D15D-01 (a definir após validação): agendas, destino de telas/grupos, conflitos e prévia de programação **sem distribuição automática**. Homologação D14B e testes de player físico permanecem em aberto.
