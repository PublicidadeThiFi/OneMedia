# Novo Cardápio — Etapa 10: Ajustes no compartilhamento

## Objetivo
Alinhar a experiência de compartilhamento do Mídia Kit ao novo Cardápio em `/menu`, removendo a aparência de recurso provisório e garantindo consistência entre os dois links públicos.

## Alterações aplicadas
- O modal de compartilhamento passou a tratar os dois destinos como experiências oficiais:
  - **Link do Mídia Kit**
  - **Link do Cardápio**
- A nomenclatura **"Cardápio (protótipo)"** foi removida.
- O texto do modal agora explica com mais clareza a diferença entre:
  - a apresentação institucional do `/mk`
  - a vitrine comercial do `/menu`
- O link do Cardápio agora preserva o contexto ativo do Mídia Kit e converte os filtros para os parâmetros esperados pelo catálogo:
  - `q`
  - `type`
  - `city`
  - `state -> uf`
  - `status -> availability`
  - `ownerCompanyId`
  - `source=catalog`

## Resultado esperado
- O link copiado do Cardápio abre diretamente o novo catálogo em `/menu`.
- O catálogo abre com o mesmo recorte comercial ativo no Mídia Kit.
- A navegação a partir do catálogo continua coerente com o funil das etapas anteriores.

## Arquivos alterados
- `src/components/MediaKit.tsx`
