# D15C — Bloco 05: Prévia e Publicação QA de Playlists

Baseline: `OneMedia_frontend_atual27.zip` / commit `5ae4753`.

- Na seção Programação, mantém Catálogo, Criação/Renomeação, Edição, Reordenação e integração Marketplace.
- Acrescenta prévia completa (ordem, versão de mídia e duração) do draft sem operação de escrita.
- O botão de publicação é **desabilitado por padrão**. Só aparece funcional quando o bundle é criado explicitamente com `--mode qa` **e** `VITE_DOOH_PLAYLIST_PUBLISH_QA_ENABLED=true`. Não definir essa flag em deploy comum.
- Mesmo quando ativado no frontend, o backend nega qualquer publicação sem sua própria trava de ambiente/empresa, que também bloqueia produção.
- A revisão exige digitar `PUBLICAR`, confirmação adicional, GET preflight do draft, conferência de playlist e operação exclusiva em `/dooh/playlists/:id/publish-cas`.
- Retorno é validado por ID, versão, checksum e próximo rascunho; divergências exigem consulta ao histórico, sem repetir automaticamente.
- Publicação de versão **não** é agendamento/distribuição/reprodução. Não ativa players, manifests ou worker.

## Execução dos testes
```bash
node --experimental-strip-types --test \
  scripts/d13j-dooh-player-inventory.test.mjs \
  scripts/d13k-dooh-player-detail.test.mjs \
  scripts/d13l-dooh-player-operational-safety.test.mjs \
  scripts/d15a1-player-operations.test.mjs \
  scripts/d15a1-pairing-assignment.test.mjs \
  scripts/d15a1-group-command-audit.test.mjs \
  scripts/d15a1-safe-group-membership.test.mjs \
  scripts/d15a1-restart-qa.test.mjs \
  scripts/d15b1-media-library-readonly.test.mjs \
  scripts/d15b2-folder-operations.test.mjs \
  scripts/d15b3-media-organize-cas.test.mjs \
  scripts/d15b4-media-upload.test.mjs \
  scripts/d15b5-media-processing.test.mjs \
  scripts/d15b6-media-versions.test.mjs \
  scripts/d15c1-playlists-readonly.test.mjs \
  scripts/d15c2-playlist-write-cas.test.mjs \
  scripts/d15c3-playlist-draft-cas.test.mjs \
  scripts/d15c4-playlist-reorder-cas.test.mjs \
  scripts/d15c5-playlist-publish-qa.test.mjs
npm run build
```

Não executar upload, processamento, QA publish, comandos remotos, ou testes em produção. **Não dar push** para branch com publicação automática antes da revisão do rollout.
