# F7 — Pausa e retomada no editor por tela

Base: master ff8ab5b0835241c133e0f3c10b200df2a573fa73, PR #239 (atual66). Candidato, não implantado.

- Exibe ação de pausa somente sob capability explícita do servidor, empresa/papel/DOOH FULL, tela independente, revisão instalada e confirmação. Bloqueia quando existe alteração futura pendente. Envia snapshot exato ao POST pause-publication, valida PAUSE_PREPARED e incremento exato da versão. Mensagem diferencia preparação de parada física; alerta para autorização offline válida.
- Estado PAUSED abre controles de retomada, não a publicação inicial/avançada. Lê versão publicada original pelo GET de itens já existente (valida versão, prefixo do checksum, itens e escopo), sem publicar o draft. Exige revisão neutra reportada e período explícito, preserva fuso/dias/horários, novo consentimento separado e opcional (default NONE). Confirma POST resume-publication e valida recibo de versão nova. Sem retries silenciosos; em erro relê estados reais. Sem alteração Player, cobrança, cotas ou infra.
- Regressões: 101 testes Node contabilizados, 100 PASS/1 SKIP (D15B04-15 sem backend irmão no layout de teste), 0 FAIL. Seis casos novos. Typecheck isolado do contrato e sintaxe TS/TSX; build Vite e homologação visual ainda no Mac. Flag OFF até rollout consolidado. F7 restauração histórica ainda pendente.
