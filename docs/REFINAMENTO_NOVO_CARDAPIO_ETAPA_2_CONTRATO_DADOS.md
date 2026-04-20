# Refinamento do Novo Cardápio — Etapa 2 (Revisão técnica do contrato de dados)

Fontes verdade desta etapa:
- `Refinamento_Novo_Cardapio_Etapas.pdf`
- `Mídia Kit.pdf`
- orientação complementar desta rodada: a capa `fundo_capa_cardapio_global.png` será aplicada apenas ao final das etapas visuais

## Objetivo da etapa
Confirmar o que o frontend já recebe hoje no fluxo público do cardápio e mapear, com precisão, o que ainda precisa de apoio do backend para sustentar o refinamento final.

## Endpoint público analisado
- `GET /api/public/media-kit`

## Blocos já disponíveis hoje para o frontend
### Identidade do cardápio
- empresa dona do cardápio (`company`)
- logo da empresa (`company.logoUrl`)
- métricas de topo (`heroMetrics`)
- texto institucional (`aboutText`)
- `generatedAt`

### Catálogo público
- lista de pontos (`points`)
- tipo, categoria/subcategoria e nome
- endereço completo
- cidade, bairro, UF e ambiente
- coordenadas (`latitude` / `longitude`)
- impacto diário
- classes sociais
- preços-base do ponto
- imagem principal do ponto (`mainImageUrl`)
- disponibilidade consolidada (`availability`)
- totais por ponto (`unitsCount`, `occupiedUnitsCount`, `availableUnitsCount`)

### Faces / telas
- lista de unidades/faces por ponto (`units`)
- rótulo da face
- orientação e dimensões
- preços por face
- imagem da face (`imageUrl`)
- disponibilidade operacional por face (`availability`, `availableOn`, `blockedFrom`, `blockedUntil`)

### Fluxo comercial já existente
- o token público continua sendo a chave de acesso
- o frontend já possui base para seleção e carrinho no fluxo público atual
- o modo de seleção comercial desta nova rodada pode reutilizar a infraestrutura já existente do funil

## O que já permite avançar sem novo backend
### Mapa / flip do card
Com as coordenadas atuais (`latitude`, `longitude`), o verso do card já pode abrir um mapa interativo. Quando as coordenadas estiverem ausentes, o frontend ainda consegue cair para uma busca por endereço.

### Regra de elegibilidade para seleção
A disponibilidade consolidada do ponto e a disponibilidade por face já chegam no payload e são suficientes para o frontend aplicar a regra de seleção apenas para itens `Disponível`.

### Continuidade para carrinho
O fluxo público atual já possui base operacional para detalhe, faces, carrinho, checkout e envio. O refinamento visual das próximas etapas pode reaproveitar essa base sem reescrever regras do backend.

## Gaps confirmados para etapas seguintes
### Gap 1 — `lastInventoryChangeAt`
Hoje o payload público expõe `generatedAt`, mas a capa final precisa mostrar a **última alteração relevante do inventário**. Isso exige um campo confiável e próprio do backend, em vez de depender apenas do instante da geração da resposta.

### Gap 2 — galeria pública contratual por ponto/face
O refinamento final exige carrossel com fotos e vídeos. O contrato público atual ainda não garante, de forma explícita e estável no endpoint `/public/media-kit`, uma coleção ordenada de mídias por ponto/face pronta para consumo do carrossel.

### Gap 3 — tipo de mídia por item da galeria
Para abrir overlay, modal e comportamento correto entre foto e vídeo, o frontend precisa saber claramente o tipo de cada item (`image` / `video`). O endpoint atual ainda não formaliza isso como contrato público refinado.

### Gap 4 — coleção única ordenada de mídia
Mesmo quando existem imagem principal, vídeo ou galerias internas no domínio, o frontend do card refinado precisa receber ou conseguir derivar com segurança uma coleção ordenada única para cada card, sem depender de heurísticas frágeis.

## Campos observados como úteis para as próximas etapas
- `point.latitude`
- `point.longitude`
- `point.mainImageUrl`
- `unit.imageUrl`
- `point.availability`
- `unit.availability`
- `generatedAt`

## Conclusão desta etapa
O payload público atual já sustenta:
- filtros
- resumo
- cards compactos
- seleção por disponibilidade
- integração com carrinho
- mapa interativo no verso do card

Os reforços realmente necessários de backend ficam concentrados em duas frentes:
1. **última atualização real do inventário**
2. **galeria pública estruturada com tipo de mídia e ordenação**

## Observação importante desta rodada
A aplicação visual da capa com `fundo_capa_cardapio_global.png` fica adiada para a etapa visual correspondente, por orientação do projeto. Nesta etapa, ela entra apenas como premissa de contrato e não como dependência de implementação imediata.
