# Novo Cardápio — Etapa 11 (QA funcional, visual e responsivo)

## Objetivo
Validar a vitrine nova do `/menu` antes do go-live, corrigindo ajustes de UX encontrados na inspeção da etapa atual e consolidando um checklist de homologação.

## Ajustes aplicados nesta etapa
- limpeza de textos transitórios/técnicos em hero, filtros, ações, cards e bloco institucional
- refinamento do estado vazio da grade, com CTAs para `Limpar filtros` e `Trocar região`
- ajuste do botão `Limpar filtros` para preservar o recorte geográfico atual e limpar apenas filtros locais da vitrine
- remoção de mensagem de implementação que ainda aparecia no rodapé do card
- alinhamento do rótulo comercial para `Valor bi-semana`

## Checklist manual recomendado
1. Abrir `/menu` com token válido
2. Abrir `/menu` com filtros vindos da URL
3. Validar busca textual, tipo, cidade, bairro, ambiente, disponibilidade e ordenação
4. Remover filtros individualmente pelos chips
5. Usar `Limpar filtros` e confirmar preservação de token, flow e recorte geográfico
6. Testar estado vazio e CTA de troca de região
7. Validar clique no card, CTA `Ver detalhes` e `Ver no Google Maps`
8. Seguir para detalhe, faces, carrinho, checkout e enviado com `source=catalog`
9. Revisar mobile, tablet e desktop
10. Validar loading, erro e ausência de imagem

## Observação
Esta etapa foca em QA de interface e navegação. Não há alteração de contrato no backend.
