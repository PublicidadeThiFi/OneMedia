# OneMedia — D13K: diagnóstico operacional DOOH, somente leitura

**Baseline:** frontend `atual6` + D13J FIX01 aprovado pelo usuário no Vite. A ausência do ZIP de checkpoint `frontend_atual7` impede verificar outras alterações manuais posteriores.

## Escopo

- Expandir `/app/dooh/screens` com botão **Detalhes** para cada player exibido.
- Consultar **somente** `GET /api/dooh/players/:id`, do controller de `DoohPlayerAdminController` do backend `atual111`.
- Projetar campos autorizados para o painel: ciclo, heartbeat, tela associada, plataforma, versão do app, manifest atual/desejado, grupos, existência/uso da credencial, contagens técnicas.
- Nunca renderizar credenciais, identificadores de instalação, metadata, histórico bruto, tokens, hashes, nonce nem identidade do operador.
- Distinguir `ACTIVE` (consome quota mesmo offline) de heartbeat recente, e dados reportados de prova de exibição certificada.
- Falhar fechado diante de erro HTTP, objeto de outro player ou contrato inválido; não reaproveitar detalhe entre empresas, filtros ou páginas.
- Estado inicial, erro, fechamento e requisição cancelada possuem tratamento explícito.

## O que continua fora do escopo

- Pareamento, atualização de lifecycle, ativação, publicação de manifest, troca de associação, restart e outros POST/PUT/PATCH/DELETE.
- Player físico, UAT autenticado ao vivo, validação visual humana e proof-of-play independente.
- AWS, RDS, KMS, Cakto, telemetria paga, migration e deploy.

## QA

Aplicar o ZIP na **raiz do frontend OneMedia**, nunca em `ooh-manager-api`:

```bash
unzip -o "../GPT/OneMedia_D13K_Frontend_Player_Diagnostic_ReadOnly_patch.zip" -d .
bash scripts/run-d13k-dooh-player-detail-qa.sh
```

Marcador esperado: `D13K_FRONTEND_DOOH_PLAYER_DETAIL_READ_ONLY_QA_PASS__PRODUCTION_NO_GO`.

O QA executa os 13 testes D13J, os 16 testes D13K e o build Vite. O build e a homologação autenticada precisam ocorrer no Mac. Nada neste QA autoriza deploy. `HOLD_NO_PURGE`, 67 migrations e `NO_GO` continuam vigentes.

## Checklist visual manual posterior (sem pedir execução nesta entrega)

- Entrar com usuário da empresa e papel ADMINISTRATIVO/TI: abrir Telas e Players, selecionar Detalhes, fechar.
- Testar lista vazia, erro 401/403 e sessão sem entitlement; confirmar ausência de dados entre empresas.
- Alternar filtros e páginas após abrir um detalhe: painel antigo deve desaparecer.
- Conferir ACTIVE offline (licença ocupada), player aposentado, manifest divergente e tela inativa.
- Confirmar que não existem comandos acionáveis ou declarações de audiência/impressões certificadas.
