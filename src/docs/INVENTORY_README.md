# Módulo de Inventário - README

## 🎯 Visão Geral

O Módulo de Inventário é o coração do sistema de gestão de mídia OOH/DOOH. Permite cadastrar, gerenciar e organizar pontos de mídia (outdoors, painéis digitais, empenas, etc.) com informações completas de localização, proprietários, contratos e unidades (faces/telas).

**Status:** ✅ Versão 2.0 - Produção Ready (Frontend)

## ✨ Funcionalidades

### ✅ Implementado

- **Gestão de Pontos (MediaPoint)**
  - Cadastro completo com todos os campos do schema Prisma
  - Edição de pontos existentes
  - Duplicação de pontos
  - Validação de campos obrigatórios
  - Toggle de visibilidade no Mídia Kit

- **Proprietários (MediaPointOwner)**
  - Adicionar/editar/remover proprietários
  - Múltiplos regimes (DER, Público, Particular)
  - Controle de aluguel e taxas
  - Limite de 2 proprietários (add-on para mais)

- **Contratos (MediaPointContract)**
  - Upload de PDFs (estrutura)
  - Gestão de datas (assinatura/expiração)
  - Download de contratos (estrutura)
  - Armazenamento S3 (integração pendente)

- **Filtros e Busca**
  - Busca textual avançada
  - Filtro por tipo (OOH/DOOH)
  - Filtro por cidade (dinâmico)
  - Contador de resultados

- **Importação/Exportação**
  - Exportação CSV funcional
  - Importação (estrutura preparada)

### ⏳ Em Desenvolvimento

- **Unidades (MediaUnit)**
  - CRUD completo de faces/telas
  - Configurações específicas OOH/DOOH
  - Gestão de ativação/ocupação

- **Integrações**
  - API Backend
  - Upload S3
  - Parser XLS/CSV
  - Mapa interativo

## 📁 Estrutura de Arquivos

```
/components
  /inventory/
    MediaPointFormDialog.tsx       # ✅ Formulário completo
    MediaPointOwnersDialog.tsx     # ✅ Gestão de proprietários
    MediaPointContractsDialog.tsx  # ✅ Gestão de contratos
    MediaUnitsDialog.tsx           # ⏳ Stub (implementação pendente)
  Inventory.tsx                    # ✅ Componente principal

/lib
  mockData.ts                      # ✅ Dados mock + helpers

/types
  index.ts                         # ✅ Tipos TypeScript (schema Prisma)

/docs
  INVENTORY_README.md              # 📖 Este arquivo
  INVENTORY_MODULE.md              # 📖 Documentação técnica
  INVENTORY_USAGE.md               # 📖 Guia de uso
  INVENTORY_CHANGELOG.md           # 📖 Histórico de mudanças
  INVENTORY_QUICK_REFERENCE.md     # 📖 Referência rápida
```

## 🚀 Início Rápido

### Acessar o Módulo

1. Na sidebar, clique em **"Inventário"**
2. Visualize a lista de pontos de mídia

### Criar um Ponto

1. Clique em **"+ Novo Ponto"**
2. Selecione o tipo: **OOH** ou **DOOH**
3. Preencha os campos obrigatórios:
   - Nome do ponto
   - Cidade
   - Estado
   - Latitude
   - Longitude
4. Clique em **"Salvar Ponto"**

### Adicionar Proprietário

1. No card do ponto, clique no menu **⋮**
2. Selecione **"Proprietários / Empresas vinculadas"**
3. Clique em **"Adicionar Proprietário"**
4. Preencha os dados e clique em **"Adicionar Proprietário"**

### Exportar Inventário

1. Clique em **"Exportar"** no header
2. Arquivo CSV será baixado automaticamente

## 📋 Campos Principais

### MediaPoint (Ponto de Mídia)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | Enum | ✅ | OOH ou DOOH |
| `name` | String | ✅ | Nome do ponto |
| `addressCity` | String | ✅ | Cidade |
| `addressState` | String | ✅ | Estado (UF) |
| `latitude` | Number | ✅ | Coordenada geográfica |
| `longitude` | Number | ✅ | Coordenada geográfica |
| `dailyImpressions` | Number | ⚠️ | Impactos diários (recomendado) |
| `socialClasses` | Array | - | Classes sociais (A/B/C/D/E) |
| `environment` | String | - | Tipo de ambiente |
| `showInMediaKit` | Boolean | - | Visível no Mídia Kit |
| `basePriceMonth` | Number | - | Preço mensal base |

**Total:** 30+ campos (ver schema completo)

### MediaUnit (Face/Tela)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `unitType` | Enum | FACE ou SCREEN |
| `label` | String | Ex: "Face 1 - Fluxo" |
| `orientation` | Enum | FLUXO / CONTRA_FLUXO (OOH) |
| `widthM` | Number | Largura em metros (OOH) |
| `heightM` | Number | Altura em metros (OOH) |
| `insertionsPerDay` | Number | Inserções/dia (DOOH) |
| `resolutionWidthPx` | Number | Largura resolução (DOOH) |
| `resolutionHeightPx` | Number | Altura resolução (DOOH) |
| `isActive` | Boolean | Se está ativa |

## 🔧 Configuração

### Dados Mock

Para customizar dados de exemplo, edite `/lib/mockData.ts`:

```typescript
export const mockMediaPoints: MediaPoint[] = [
  {
    id: 'mp1',
    name: 'Seu Ponto',
    type: MediaType.OOH,
    // ... outros campos
  },
];
```

### Subcategorias Personalizadas

```typescript
export const OOH_SUBCATEGORIES = [
  'OUTDOOR',
  'FRONT_LIGHT',
  'TOTEM',
  'EMPENA',
  'PAINEL_RODOVIARIO',
  'SUA_SUBCATEGORIA', // Adicionar aqui
];
```

### Ambientes Personalizados

```typescript
export const ENVIRONMENTS = [
  'Shopping Center',
  'Rodovia',
  'SEU_AMBIENTE', // Adicionar aqui
];
```

## 🔌 Integrações Futuras

### API Backend

```typescript
// Substituir mock por API calls
const response = await fetch('/api/media-points');
const mediaPoints = await response.json();
```

### Upload S3

```typescript
// Implementar upload real
const uploadToS3 = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
};
```

## 📊 Estatísticas

Dados do módulo atual:

- **Componentes:** 5
- **Linhas de código:** ~2.500
- **Tipos TypeScript:** 4 principais
- **Campos implementados:** 30+
- **Validações:** 5 obrigatórias
- **Dialogs:** 4
- **Filtros:** 3
- **Ações:** 6

## 🎨 Screenshots (Descrição)

### Tela Principal
- Cards de resumo no topo (4 cards)
- Barra de filtros com busca e dropdowns
- Grid de cards de pontos (3 colunas desktop)
- Cada card mostra foto, tipo, localização e ações

### Formulário de Ponto
- Tabs OOH/DOOH no topo
- Seções organizadas: Básicas, Localização, Comercial, Visibilidade
- Multi-select de classes sociais com badges
- Validações inline

### Proprietários
- Lista de proprietários com dados completos
- Formulário inline para adicionar/editar
- Aviso de limite e add-on

### Contratos
- Lista de contratos com metadados
- Upload de arquivo
- Ações de download/remover

## 🧪 Testes

### Checklist Manual

- [x] Criar ponto OOH
- [x] Criar ponto DOOH
- [x] Editar ponto
- [x] Duplicar ponto
- [x] Toggle Mídia Kit
- [x] Buscar pontos
- [x] Filtrar por tipo
- [x] Filtrar por cidade
- [x] Adicionar proprietário
- [x] Editar proprietário
- [x] Remover proprietário
- [x] Adicionar contrato
- [x] Exportar CSV
- [x] Validação de campos

### Testes Automatizados (Futuro)

```bash
npm run test -- Inventory
```

## 📚 Documentação

### Para Usuários
- **[Guia de Uso](INVENTORY_USAGE.md)** - Como usar o módulo
- **[Referência Rápida](INVENTORY_QUICK_REFERENCE.md)** - Consulta rápida

### Para Desenvolvedores
- **[Documentação Técnica](INVENTORY_MODULE.md)** - Arquitetura e implementação
- **[Changelog](INVENTORY_CHANGELOG.md)** - Histórico de mudanças

## 🐛 Problemas Conhecidos

1. **Upload S3** - Estrutura pronta, integração pendente
2. **MediaUnit CRUD** - Apenas stub implementado
3. **Importação XLS** - Parser pendente
4. **Mapa interativo** - Não implementado
5. **Validação CNPJ** - Básica, sem verificação de dígitos

## 🔮 Roadmap

### v2.1 (Próxima versão)
- [ ] CRUD completo de MediaUnit
- [ ] Integração com API backend
- [ ] Upload S3 funcional

### v2.2
- [ ] Parser de importação XLS/CSV
- [ ] Mapa interativo (Google Maps)
- [ ] Estatísticas de uso

### v3.0
- [ ] Histórico de alterações
- [ ] Comentários e anotações
- [ ] Galeria de fotos
- [ ] Tags customizadas
- [ ] Modo lista/grid
- [ ] Atalhos de teclado

## 💡 Dicas

### Performance

```typescript
// Use useMemo para cálculos pesados
const filteredPoints = useMemo(() => {
  return mediaPoints.filter(/* ... */);
}, [mediaPoints, searchQuery, typeFilter]);
```

### Boas Práticas

1. **Sempre preencha latitude/longitude** - Necessário para mapa
2. **Use nomenclatura consistente** - Ex: "Outdoor Av. Paulista 1000"
3. **Preencha impactos diários** - Importante para propostas
4. **Adicione foto de qualidade** - Melhora visualização
5. **Configure classes sociais** - Ajuda no targeting

### Troubleshooting

**Ponto não salva:**
- Verifique campos obrigatórios
- Valide formato de coordenadas

**Filtro não funciona:**
- Limpe cache do navegador
- Verifique console para erros

**Exportação falha:**
- Verifique permissões do navegador
- Tente outro navegador

## 🤝 Contribuindo

### Adicionar Nova Funcionalidade

1. Verifique se está no schema Prisma
2. Atualize tipos em `/types/index.ts`
3. Implemente no componente relevante
4. Adicione validações se necessário
5. Atualize documentação
6. Teste manualmente

### Reportar Bug

1. Descreva o comportamento esperado
2. Descreva o comportamento atual
3. Passos para reproduzir
4. Screenshots se possível
5. Console logs de erro

## 📞 Suporte

- **Documentação:** `/docs/INVENTORY_*.md`
- **Código:** `/components/Inventory.tsx` e `/components/inventory/*`
- **Tipos:** `/types/index.ts`
- **Mock Data:** `/lib/mockData.ts`

## 📝 Licença

Proprietary - Uso interno

---

## 📦 Dependências

- React 18+
- TypeScript 4.9+
- Tailwind CSS 4.0
- Radix UI (dialogs, dropdowns, etc.)
- Lucide React (ícones)

## 🔗 Links Úteis

- [Schema Prisma](../schema.prisma)
- [Componentes UI](../components/ui/)
- [Tipos](../types/index.ts)
- [Mock Data](../lib/mockData.ts)

---

**Versão:** 2.0.0  
**Data:** 24/11/2024  
**Status:** ✅ Pronto para Produção (Frontend)  
**Próximo:** Integração Backend + MediaUnit CRUD
