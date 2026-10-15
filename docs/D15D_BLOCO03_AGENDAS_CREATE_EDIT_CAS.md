# D15D — Bloco 03 | Criação e Edição CAS de Agendas

Baseline: `OneMedia_frontend_atual31.zip`, backend `ooh-manager-api_atual130.zip`.

## Escopo

- **Criar** somente agenda `DRAFT` via endpoint já existente `POST /api/dooh/schedules` (uso frontend `/dooh/schedules`).
- **Editar** campos operacionais de agenda `DRAFT` via novo `PATCH /api/dooh/schedules/:id/details-cas`.
- Nome, UUID de versão de playlist **PUBLISHED**, prioridade (`TAKEOVER`, `STANDARD`, `FALLBACK`), timezone IANA, datas ISO com offset explícito, dias ISO 1–7, faixa diária em HH:mm.
- Pré-validação autenticada por GET e CAS transacional no servidor sobre campos completos + `updatedAt`.
- Controle de acesso DOOH `FULL` + papel `ADMINISTRATIVO`/`TI`; isolamento tenant no backend. Agendas vinculadas ao Marketplace (`metadata.marketplaceD12`) bloqueadas para edição nessa rota.
- Confirmação explícita de cada ação; resposta validada estritamente por identidade, estado `DRAFT`, campos alterados, contagem de destinos e companhia.

## Não incluído

Publicação de agendas, preview de conflitos, manifest, sincronização ou comandos aos players, alterações no banco/migrations, recursos AWS, Cakto e licenciamento.

## Limitações

- A seleção de versão publicada é por UUID informado manualmente, validado pelo servidor. Um seletor visual poderá ser desenvolvido mais tarde.
- A criação existente não oferece idempotency key; se houver timeout após o envio, consultar o catálogo antes de repetir o POST, para evitar rascunhos duplicados.
- Essa interface não valida conflitos entre agendas nem habilita exibição. Somente testes de integração e homologação poderão confirmar comportamento em serviços reais.
- Horários diários não cruzam meia-noite. O fuso IANA define como a janela diária deverá ser interpretada, enquanto as datas de início/fim exigem offset explícito e são instantes absolutos.

## Testes

```bash
node --experimental-strip-types --test scripts/d13[jkl]-*.test.mjs scripts/d15*.test.mjs
npm run build
```

Não dar push ou deploy automático sem coordenação backend primeiro, frontend depois, e aprovação de rollback. Manter `HOLD_NO_PURGE`.
