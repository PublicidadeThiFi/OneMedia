# Guia de Uso - Módulo de Inventário

## Como Usar o Inventário

### 1. Acessando o Módulo

Na barra lateral, clique em **"Inventário"** (ícone de MapPin).

### 2. Visualizando Pontos de Mídia

A tela principal mostra:

**Cards de Resumo (topo):**
- Total de Pontos
- Pontos OOH
- Pontos DOOH  
- Unidades (Faces/Telas)

**Grid de Cards:**
Cada card representa um ponto de mídia (MediaPoint) e exibe:
- Foto do ponto
- Tipo: OOH ou DOOH
- Subcategoria (ex: OUTDOOR, PAINEL_LED)
- Nome do ponto
- Localização (bairro, cidade)
- Número de faces/telas ativas
- Impactos diários
- Preço base mensal
- Ambiente (tag)
- Toggle "Mídia Kit"
- Menu de ações (⋮)

### 3. Filtros e Busca

**Barra de Busca:**
Digite nome, cidade, bairro ou subcategoria para filtrar.

**Filtro por Tipo:**
- Todos os tipos
- OOH
- DOOH

**Filtro por Cidade:**
Selecione uma cidade específica (dinâmico conforme pontos cadastrados).

**Limpar Filtros:**
Se nenhum resultado for encontrado, clique em "Limpar Filtros".

### 4. Criar Novo Ponto de Mídia

1. Clique no botão **"+ Novo Ponto"** (canto superior direito)

2. Selecione o tipo (tabs):
   - **OOH** → Mídias estáticas (outdoor, empena, etc.)
   - **DOOH** → Mídias digitais (painéis LED, telas)

3. Preencha os campos:

   **Informações Básicas:**
   - Nome do Ponto * (obrigatório)
   - Subcategoria (lista muda conforme tipo OOH/DOOH)
   - Descrição

   **Localização:**
   - CEP
   - Rua/Avenida
   - Número
   - Bairro
   - Cidade * (obrigatório)
   - Estado * (dropdown com UFs)
   - País (padrão: Brasil)
   - Latitude * (obrigatório)
   - Longitude * (obrigatório)

   **Dados Comerciais:**
   - Impactos Diários (recomendado)
   - Ambiente (dropdown: Shopping, Rodovia, etc.)
   - Classes Sociais (clique nos badges A/B/C/D/E)
   - Preço Mensal (R$)
   - Preço Semanal (R$)
   - Preço Diário (R$)

   **Visibilidade:**
   - ☑ Exibir no Mídia Kit público

4. Clique em **"Salvar Ponto"**

**Próximo Passo:**
Após criar o ponto, adicione unidades (faces/telas) através do menu de ações.

### 5. Editar Ponto Existente

1. Clique no menu **⋮** do card do ponto
2. Selecione **"Editar ponto"**
3. Modifique os campos desejados
4. Clique em **"Salvar Alterações"**

### 6. Toggle Mídia Kit

**O que é:**
Campo `showInMediaKit` que controla se o ponto aparece no Mídia Kit público.

**Como usar:**
- Clique no switch "Mídia Kit" no card do ponto
- ON (azul) = ponto visível no Mídia Kit
- OFF (cinza) = ponto oculto do público

**Quando desativar:**
- Ponto em manutenção
- Ponto sem licença temporariamente
- Ponto não disponível para novos clientes

### 7. Gerenciar Unidades (Faces/Telas)

**Status atual:** Funcionalidade em desenvolvimento (stub)

**Quando estiver pronto:**
1. Clique no menu **⋮** do ponto
2. Selecione **"Gerenciar unidades"**
3. Adicione faces (OOH) ou telas (DOOH)
4. Configure características específicas:
   - **OOH:** orientação (fluxo/contra-fluxo), dimensões
   - **DOOH:** inserções/dia, resolução
5. Defina preços individuais por unidade
6. Ative/desative unidades

**Por enquanto:**
As unidades são gerenciadas através de mock data em `/lib/mockData.ts`.

### 8. Gerenciar Proprietários

**O que é:**
Cadastro de empresas/pessoas donas ou co-proprietárias do ponto (MediaPointOwner).

**Como usar:**
1. Clique no menu **⋮** do ponto
2. Selecione **"Proprietários / Empresas vinculadas"**
3. Clique em **"Adicionar Proprietário"**

4. Preencha:
   - Nome do Proprietário/Empresa *
   - CNPJ ou CPF
   - Regime:
     - **Área Particular** → Aluguel de imóvel privado
     - **DER** → Concessão do Departamento de Estradas
     - **Administração Pública** → Área pública
   - Valor (aluguel ou taxa DER)
   - Dia do vencimento
   - Observações

5. Clique em **"Adicionar Proprietário"**

**Limite:**
- Padrão: 2 proprietários por ponto
- Com add-on "Multi-Proprietários": ilimitado

**Uso típico:**
- Ponto alugado de imóvel particular
- Concessão DER com taxa mensal
- Múltiplas empresas do mesmo grupo com participação

### 9. Gerenciar Contratos

**O que é:**
Upload e gestão de PDFs dos contratos de locação/propriedade (MediaPointContract).

**Como usar:**
1. Clique no menu **⋮** do ponto
2. Selecione **"Contratos do ponto"**
3. Clique em **"Adicionar Novo Contrato"**

4. Preencha:
   - Selecione arquivo PDF
   - Data de assinatura
   - Data de expiração

5. Clique em **"Salvar Contrato"**

**Ações disponíveis:**
- **Download:** Baixar PDF do contrato
- **Remover:** Excluir contrato

**Armazenamento:**
Arquivos serão salvos no S3 (integração pendente).

### 10. Duplicar Ponto

**Como usar:**
1. Clique no menu **⋮** do ponto
2. Selecione **"Duplicar ponto"**
3. Um novo ponto será criado com o nome "Nome Original (cópia)"
4. Edite o ponto duplicado conforme necessário

**Útil para:**
- Pontos similares em localizações diferentes
- Usar como template
- Economizar tempo de cadastro

### 11. Importar Inventário

**Como usar:**
1. Clique no botão **"Importar"** (header)
2. Clique em **"Baixar Modelo"** para template (em desenvolvimento)
3. Preencha o arquivo Excel/CSV com os dados dos pontos
4. Selecione o arquivo preenchido
5. Clique em **"Importar Pontos"**

**Colunas esperadas:**
```
name, type, subcategory, description, addressCity, addressState, 
latitude, longitude, dailyImpressions, environment, 
basePriceMonth, showInMediaKit
```

**Formatos aceitos:**
- .xlsx (Excel)
- .csv (CSV)

**Status:** Estrutura pronta, parser pendente

### 12. Exportar Inventário

**Como usar:**
1. Clique no botão **"Exportar"** (header)
2. Arquivo CSV será baixado automaticamente

**Conteúdo do CSV:**
- ID, Nome, Tipo, Subcategoria
- Cidade, Estado
- Impactos/Dia, Preço Mensal
- Mídia Kit (Sim/Não)

**Nome do arquivo:**
`inventario_YYYY-MM-DD.csv`

**Útil para:**
- Backup de dados
- Análise em Excel
- Compartilhar com equipe
- Migração de dados

## Dicas e Boas Práticas

### Cadastro de Pontos

✅ **Faça:**
- Preencha latitude/longitude corretamente (use Google Maps)
- Adicione foto de qualidade (mainImageUrl)
- Preencha impactos diários (importante para propostas)
- Selecione ambiente correto
- Marque classes sociais atendidas

❌ **Evite:**
- Deixar campos obrigatórios vazios
- Coordenadas incorretas (pontos não aparecerão no mapa)
- Nomes genéricos ("Outdoor 1", "Painel 2")

### Organização

**Nomenclatura sugerida:**
```
[Tipo] [Logradouro] [Número/Referência]

Exemplos:
- Outdoor Av. Paulista 1000
- Painel Digital Shopping Iguatemi
- Empena Marginal Tietê Km 15
- Front Light Estação Sé
```

**Subcategorias:**
Use subcategorias corretas para facilitar filtros:
- OOH: OUTDOOR, EMPENA, FRONT_LIGHT, TOTEM, PAINEL_RODOVIARIO
- DOOH: PAINEL_LED, TELA_DIGITAL, PAINEL_ELETRONICO

### Mídia Kit

**Pontos que devem aparecer:**
- ✅ Ativos e licenciados
- ✅ Com foto de qualidade
- ✅ Informações completas
- ✅ Disponíveis para locação

**Pontos que NÃO devem aparecer:**
- ❌ Em manutenção
- ❌ Sem licença temporariamente
- ❌ Reservados para clientes específicos
- ❌ Em processo de negociação

### Proprietários

**Quando cadastrar:**
- Sempre que houver aluguel/taxa
- Para controle de custos por ponto
- Para lembretes de vencimento
- Para histórico e auditoria

**Regime DER:**
- Use para concessões de rodovias
- Registre número da concessão nas observações
- Monitore renovações

**Área Particular:**
- Registre dados completos do proprietário
- Anexe contrato na aba "Contratos"
- Anote condições especiais

### Contratos

**O que anexar:**
- Contrato de locação assinado
- Aditivos contratuais
- Comprovantes de pagamento importantes
- Licenças e alvarás

**Organização:**
- Nome descritivo: `contrato-locacao-[local]-[data].pdf`
- Mantenha contratos atualizados
- Cadastre datas de expiração
- Configure alertas de renovação (futuro)

## Fluxo Completo de Cadastro

### Exemplo: Novo Outdoor

**Passo 1: Criar Ponto**
- Tipo: OOH
- Subcategoria: OUTDOOR
- Nome: Outdoor Av. Brigadeiro Faria Lima 3000
- Endereço completo
- Latitude/Longitude (Google Maps)
- Impactos: 120.000/dia
- Ambiente: Avenida Principal
- Classes: A, B, C
- Preço mensal: R$ 9.500
- ✅ Mídia Kit

**Passo 2: Adicionar Unidades** (quando disponível)
- Face 1 - Fluxo
  - Orientação: FLUXO
  - Dimensões: 9m x 3m
  - Preço: R$ 9.500/mês
- Face 2 - Contra-Fluxo
  - Orientação: CONTRA_FLUXO
  - Dimensões: 9m x 3m
  - Preço: R$ 8.500/mês

**Passo 3: Cadastrar Proprietário**
- Nome: Imóveis Faria Lima Ltda
- CNPJ: 12.345.678/0001-90
- Regime: Área Particular
- Aluguel: R$ 4.000/mês
- Vencimento: dia 10
- Obs: "Contrato 24 meses renovável"

**Passo 4: Anexar Contrato**
- Upload: contrato-locacao-faria-lima-3000.pdf
- Assinado em: 01/01/2024
- Expira em: 01/01/2026

✅ **Pronto!** Ponto cadastrado e pronto para ser usado em propostas.

## Perguntas Frequentes

**Q: Por que latitude/longitude são obrigatórios?**
A: São usados para exibir o ponto no mapa interativo do Mídia Kit e para cálculos de alcance.

**Q: Posso ter mais de 2 proprietários?**
A: Sim, mas precisa do add-on "Multi-Proprietários" ativado na assinatura.

**Q: Como faço upload de foto do ponto?**
A: Por enquanto, adicione a URL da imagem no campo mainImageUrl. Upload direto será implementado.

**Q: Qual a diferença entre preço base e preço da unidade?**
A: Preço base é do ponto. Preço da unidade é específico por face/tela e pode variar.

**Q: O toggle Mídia Kit afeta propostas?**
A: Não. Afeta apenas visibilidade no Mídia Kit público. Pontos ocultos podem ser usados em propostas.

**Q: Posso editar um ponto após criar propostas?**
A: Sim, mas cuidado ao alterar preços. Propostas existentes mantêm valores originais.

**Q: Como sei quantas faces/telas um ponto tem?**
A: Veja no card: "Faces X / Y ativas" ou "Telas X / Y ativas".

**Q: Posso excluir um ponto?**
A: Funcionalidade de exclusão será implementada com validação (não permitir se houver campanhas ativas).

## Atalhos de Teclado (Futuro)

Planejado:
- `Ctrl/Cmd + N` → Novo Ponto
- `Ctrl/Cmd + F` → Focar na busca
- `/` → Focar na busca
- `Esc` → Fechar dialogs

## Suporte

Para dúvidas ou problemas:
1. Consulte esta documentação
2. Veja `/docs/INVENTORY_MODULE.md` para detalhes técnicos
3. Contate o suporte técnico
