# OneMedia D15C — Bloco 01: catálogo de playlists DOOH (somente leitura)

**Baseline:** frontend `OneMedia_frontend_atual23.zip` (commit `17ea278`); backend `ooh-manager-api_atual125.zip` (commit `f6f57fa`).

## Escopo

- Seção DOOH → Programação: inventário independente de playlists via `GET /api/dooh/playlists`.
- Consulta do detalhe e histórico de versões via `GET /api/dooh/playlists/:id`.
- Visibilidade de nome, status da playlist (`ACTIVE`/`ARCHIVED`), versão atual, versão DRAFT, número de versões e contagem de itens por versão.
- Validações estritas de `companyId`, acesso `READ_ONLY`/`FULL`, grant DOOH e funções `TI`/`ADMINISTRATIVO`, DTOs, ordenação e IDs.
- Histórico publicado **não equivale** à programação ativa, distribuição, playback ou audiência.
- A seção existente de campanhas aprovadas do Marketplace permanece intacta.

## Limites reais da API

- O endpoint de lista devolve no máximo 100 playlists por empresa, sem paginação e sem total. A UI sinaliza o limite sem inventar números.
- O endpoint de detalhe devolve as versões de uma playlist. A UI apresenta no máximo as 50 mais recentes. Respostas acima de 500 versões são rejeitadas por limite de validação; a API precisará de paginação futura para históricos extensos.
- Nenhuma chave de storage, metadata privada, ator da publicação ou checksum completo é exibido/retido.

## Fora de escopo

Criação, exclusão, arquivamento, edição de itens, reordenação, aprovação, publicação, distribuição, refresh de manifests e qualquer operação em player, S3, Cakto ou AWS. Nenhuma mudança no backend ou migration.

## Testes

```bash
node --experimental-strip-types --test scripts/d15c1-playlists-readonly.test.mjs
npm run build
```

O novo script testa 14 cenários de projeção, tenant, permissões, integridade da resposta, estados e ausência de escrita. Em conjunto com as suítes anteriores, são esperados 186/186 PASS quando os repositórios estão lado a lado. Não é necessário testar manualmente em localhost nesta etapa.

## Implantação e segurança

Aplicar o patch localmente e executar testes/build. O repositório frontend usa GitHub Pages automatizado; `git push` pode publicar esta tela. Não publicar, alterar produção ou acionar deploy sem aprovação de rollout/rollback. A funcionalidade é somente GET, mas a homologação integrada permanece pendente.

## Próxima entrega sugerida

D15C-02: CRUD seguro de playlist (criação e renomeação), sem publicação. Antes de editar, avaliar CAS atômico no backend para evitar conflitos de renomeação e isolamento de empresa.
