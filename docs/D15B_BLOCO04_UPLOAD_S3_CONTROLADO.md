# OneMedia — D15B, Bloco 04 — Upload DOOH controlado

**Baseline**: `OneMedia_frontend_atual20` (`b903dfc`) + `ooh-manager-api_atual124` (`eace20c`).

## Escopo
- Frontend isolado: interface de seleção de arquivo, pasta, nome e confirmação.
- API existente: `POST /api/dooh/media/uploads/init`; `POST /api/dooh/media/uploads/:intentId/finalize`.
- PUT direto ao S3 por URL assinada (HTTPS), sem cabeçalho Authorization, sem seguir redirects.
- Após a finalização validada, o registro deve estar `PENDING`. Não há publicação, processamento, exclusão ou alteração de player.
- Gate frontend `VITE_DOOH_MEDIA_UPLOAD_UI_ENABLED === 'true'`: **desligado por padrão**; o backend exige `DOOH_MEDIA_UPLOADS_ENABLED=true` e S3 habilitado. Não definir essas variáveis durante os testes automatizados.
- Validações locais de tipo/MIME, extensão e limite de 5 GiB de PUT único; limite compartilhado de armazenamento verificado pela API.
- Intenção emitida vence em 15 minutos. Sem multipart, progresso detalhado ou retomada do PUT.
- Se o PUT foi concluído e o finalize falhou, o botão “Repetir finalização” usa a MESMA intenção durante esta sessão da tela, sem reenviar o binário. Em dúvida sobre confirmação, consulte o inventário; não repita o fluxo integral imediatamente.
- Resposta S3 assíncrona não confirma que a mídia está válida ou pronta para veiculação. `READY` exige processamento posterior.

## Riscos e pré-requisitos para homologação futura
- Sem liberação automática na build de produção. GitHub Pages apenas hospeda frontend; não comprova S3 ou API integrada.
- Para homologar uploads reais será necessária aprovação de rollout e rollback, bucket DOOH segregado/adequado, credenciais/IAM de menor privilégio, política CORS PUT com origem conhecida, limites/cotas e observabilidade operacional já disponível, sem provisionar CloudWatch extra.
- Não incluir tokens, URLs pré-assinadas nem chaves no suporte/logs; possuem capacidade de gravação temporária.
- A API já confirma cabeçalho MIME e tamanho via HEAD antes de contabilizar cota e criar o registro.
- `VITE_DOOH_MEDIA_UPLOAD_UI_ENABLED` é flag pública de build, não mecanismo de autorização. A segurança é imposta no backend.

## Testes
`node --experimental-strip-types --test scripts/d15b4-media-upload.test.mjs`

Após aplicar o ZIP, execute regressão dos scripts D13J/D13K/D13L, D15A1 e D15B1-4, seguida de `npm run build` no VS Code. **Não executar testes de upload real em produção.**
