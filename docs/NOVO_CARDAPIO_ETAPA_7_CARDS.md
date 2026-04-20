# Novo Cardápio — Etapa 7 (Rebuild dos cards dos pontos)

Esta etapa consolida o rebuild visual e funcional dos cards do catálogo público do Mídia Kit.

## Objetivo

Refazer os cards dos pontos para que a leitura comercial fique mais forte e mais próxima do novo modelo visual do cardápio, sem quebrar a integração com o funil legado.

## Ajustes aplicados

- reforço da hierarquia visual dos cards com foco em imagem, nome do ponto e status
- separação explícita de **categoria** e **tipo** do ponto
- exibição do **endereço** com leitura mais limpa
- reorganização dos blocos de informação em três camadas:
  - operação (impacto, telas/faces, status)
  - qualificação comercial (classes sociais, dimensões, orientação)
  - precificação (mensal e semanal)
- CTA principal de **Ver detalhes** preservando a entrada no funil existente
- CTA secundário de **Ver no Google Maps** quando houver localização disponível
- resumo operacional mais útil para casos parciais e ocupados, incluindo próxima disponibilidade quando houver data pública suficiente
- skeleton de carregamento atualizado para refletir a nova estrutura dos cards

## Decisão funcional desta etapa

Nesta etapa, o card continua levando primeiro ao **detalhe do ponto**. A seleção de faces e a continuidade do funil permanecem tratadas pelas rotas já existentes.

## Arquivos alterados

- `src/components/menu/catalog/MenuCatalogCard.tsx`
- `src/components/menu/catalog/MenuCatalogGrid.tsx`
