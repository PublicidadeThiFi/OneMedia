# ✅ Checklist - Campo Cidade Manual (Cadastro Passo 2)

**Data:** 02/12/2024  
**Objetivo:** Simplificar o campo Cidade no fluxo de Cadastro para ser um campo de texto manual, sempre habilitado, sem autocomplete e sem dependência do UF.

---

## 📋 Contexto de Negócio

### Schema Prisma (Tabela Company)
```prisma
model Company {
  // ...
  city    String?
  state   String?
  country String?
  // ...
}
```

**Observações:**
- Não existe tabela de cidades/estados no banco de dados
- Os campos são opcionais (`String?`)
- Aceita qualquer texto digitado pelo usuário
- Não há restrição de valores

---

## 🎯 Mudanças Implementadas

### 1. Arquivo: `/components/signup/Step2Company.tsx`

#### ✅ Imports Removidos
```typescript
// REMOVIDO:
import {
  searchCities,      // ❌ Removido
  getStateByUF,      // ❌ Removido
} from '../../lib/locations';

// MANTIDO:
import {
  BRAZILIAN_STATES,  // ✅ Mantido (usado pelo campo UF)
  searchStates,      // ✅ Mantido (usado pelo campo UF)
} from '../../lib/locations';
```

#### ✅ Estados Locais Removidos
```typescript
// REMOVIDO:
const [cityQuery, setCityQuery] = useState(data.city);          // ❌
const [showCityDropdown, setShowCityDropdown] = useState(false); // ❌
const [cityResults, setCityResults] = useState<string[]>([]);    // ❌

// MANTIDO:
const [stateQuery, setStateQuery] = useState(data.state);        // ✅
const [showStateDropdown, setShowStateDropdown] = useState(false); // ✅
const [stateResults, setStateResults] = useState(BRAZILIAN_STATES); // ✅
```

#### ✅ Funções Removidas
```typescript
// REMOVIDO: handleCityInputChange
// REMOVIDO: handleCitySelect
// REMOVIDO: Lógica de carregar cidades ao selecionar UF
```

#### ✅ Handler de UF Simplificado
```typescript
// ANTES:
const handleStateSelect = (uf: string, name: string) => {
  setStateQuery(uf);
  handleChange('state', uf);
  setShowStateDropdown(false);
  
  // Limpava cidade e carregava lista de cidades
  setCityQuery('');
  handleChange('city', '');
  const cities = searchCities(uf, '');
  setCityResults(cities);
};

// DEPOIS:
const handleStateSelect = (uf: string, name: string) => {
  setStateQuery(uf);
  handleChange('state', uf);
  setShowStateDropdown(false);
  // ✅ Removida toda lógica de cidade
};
```

#### ✅ Campo Cidade - JSX Simplificado
```typescript
// ANTES:
<div className="relative md:col-span-2">
  <label className="block text-sm text-gray-700 mb-2">
    Cidade
  </label>
  <div className="relative">
    <input
      type="text"
      value={cityQuery}
      onChange={(e) => handleCityInputChange(e.target.value)}
      onFocus={() => {
        if (data.state) {
          setShowCityDropdown(true);
          const cities = searchCities(data.state, cityQuery);
          setCityResults(cities);
        }
      }}
      onBlur={() => {
        setTimeout(() => setShowCityDropdown(false), 200);
      }}
      placeholder={data.state ? "Digite o nome da cidade" : "Selecione um estado primeiro"}
      disabled={!data.state}  // ❌ Campo bloqueado sem UF
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:bg-gray-100 disabled:text-gray-500 ${
        errors.city ? 'border-red-300' : 'border-gray-300'
      }`}
    />
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
  {errors.city && (
    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
  )}
  
  {/* City Dropdown */}
  {showCityDropdown && cityResults.length > 0 && (
    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      {cityResults.map((city) => (
        <button
          key={city}
          type="button"
          onMouseDown={() => handleCitySelect(city)}
          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-gray-700"
        >
          {city}
        </button>
      ))}
    </div>
  )}
</div>

// DEPOIS:
<div className="md:col-span-2">
  <label className="block text-sm text-gray-700 mb-2">
    Cidade
  </label>
  <input
    type="text"
    value={data.city}
    onChange={(e) => handleChange('city', e.target.value)}
    placeholder="Ex: São Paulo"
    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
      errors.city ? 'border-red-300' : 'border-gray-300'
    }`}
  />
  {errors.city && (
    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
  )}
</div>
```

**Mudanças específicas:**
1. ❌ Removido `<div className="relative">` wrapper interno
2. ❌ Removido `cityQuery` - usa `data.city` diretamente
3. ❌ Removido handlers `onFocus` e `onBlur`
4. ❌ Removido atributo `disabled={!data.state}`
5. ❌ Removido ícone `ChevronDown`
6. ❌ Removido dropdown de cidades completo
7. ❌ Removido classes `disabled:bg-gray-100 disabled:text-gray-500`
8. ✅ Placeholder simplificado: "Ex: São Paulo"
9. ✅ Usa `handleChange('city', e.target.value)` diretamente

---

## 🔍 Validações Verificadas

### ✅ Arquivo: `/pages/cadastro.tsx`
```typescript
// Step 2 validation (função validateStep2)
const validateStep2 = (): boolean => {
  const errors: Record<string, string> = {};

  if (!step2Data.fantasyName.trim()) {
    errors.fantasyName = 'Nome fantasia é obrigatório';
  }

  if (!step2Data.cnpj.trim()) {
    errors.cnpj = 'CNPJ é obrigatório';
  } else if (!isValidCNPJ(step2Data.cnpj)) {
    errors.cnpj = 'CNPJ deve ter 14 dígitos';
  }

  if (step2Data.phone && !isValidPhone(step2Data.phone)) {
    errors.phone = 'Telefone deve ter 10 ou 11 dígitos (com DDD)';
  }

  setStep2Errors(errors);
  return Object.keys(errors).length === 0;
};
```

**Observações:**
- ✅ Não há validação de cidade
- ✅ Não há validação de estado
- ✅ Não há validação de país
- ✅ Campo cidade é opcional (conforme schema)
- ✅ Aceita qualquer texto digitado

---

## 📦 Payload de Cadastro

### ✅ Arquivo: `/types/signup.ts`
```typescript
export type SignupCompanyStep = {
  fantasyName: string;
  legalName: string;
  cnpj: string;
  phone: string;
  website: string;
  city: string;      // ✅ String simples
  state: string;     // ✅ String simples
  country: string;   // ✅ String simples
  estimatedUsers: string;
};

export type SignupPayload = {
  // ...
  company: {
    fantasyName: string;
    legalName?: string;
    cnpj: string;
    phone?: string;
    website?: string;
    city?: string;      // ✅ Opcional no payload
    state?: string;     // ✅ Opcional no payload
    country?: string;   // ✅ Opcional no payload
  };
  // ...
};
```

**Mapeamento:**
- ✅ `step2Data.city` → `payload.company.city` (texto exato digitado)
- ✅ `step2Data.state` → `payload.company.state` (sigla do UF ou texto)
- ✅ Sem transformações extras (apenas trim se houver)

---

## 🔧 Dependências

### ✅ Arquivo: `/lib/locations.ts`

**Funções usadas pelo Cadastro Passo 2:**
- ✅ `BRAZILIAN_STATES` - usado pelo campo UF
- ✅ `searchStates()` - usado pelo autocomplete de UF
- ❌ `searchCities()` - NÃO é mais usado
- ❌ `getStateByUF()` - NÃO é mais usado
- ❌ `getCitiesForState()` - NÃO é mais usado

**Observações:**
- ✅ Funções de cidade permanecem em `locations.ts` para uso em outros módulos
- ✅ Módulo de Configurações pode continuar usando se necessário
- ✅ Apenas removemos o uso no fluxo de Cadastro

---

## ✅ Critérios de Aceite

### 1. ✅ Campo Cidade Sempre Habilitado
- **Teste:** Abrir Cadastro › Passo 2
- **Resultado esperado:** Campo Cidade está habilitado e pode ser digitado
- **Status:** ✅ CONCLUÍDO

### 2. ✅ Campo Cidade Não Depende do UF
- **Teste:** Selecionar ou não um UF
- **Resultado esperado:** Campo Cidade permanece habilitado independente do UF
- **Status:** ✅ CONCLUÍDO

### 3. ✅ Sem Autocomplete de Cidades
- **Teste:** Digitar no campo Cidade
- **Resultado esperado:** Nenhum dropdown aparece
- **Status:** ✅ CONCLUÍDO

### 4. ✅ Aceita Qualquer Texto
- **Teste:** Digitar "São Paulo", "Brasília", "Cidade Pequena do Interior"
- **Resultado esperado:** Aceita normalmente sem validação de lista
- **Status:** ✅ CONCLUÍDO

### 5. ✅ Placeholder Simplificado
- **Teste:** Ver placeholder do campo Cidade
- **Resultado esperado:** "Ex: São Paulo"
- **Status:** ✅ CONCLUÍDO

### 6. ✅ Ícone ChevronDown Removido
- **Teste:** Verificar campo Cidade
- **Resultado esperado:** Sem ícone de dropdown
- **Status:** ✅ CONCLUÍDO

### 7. ✅ Payload Correto
- **Teste:** Preencher Cidade e avançar até Passo 3
- **Resultado esperado:** `step2Data.city` contém texto exato digitado
- **Status:** ✅ CONCLUÍDO

### 8. ✅ Campo UF Não Afetado
- **Teste:** Verificar campo UF
- **Resultado esperado:** Continua com autocomplete e funcionalidade normal
- **Status:** ✅ CONCLUÍDO

---

## 📊 Comparação Antes/Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Campo habilitado** | ❌ Apenas se UF selecionado | ✅ Sempre habilitado |
| **Autocomplete** | ✅ Lista de cidades do UF | ❌ Removido |
| **Dropdown** | ✅ Mostrava cidades | ❌ Removido |
| **Ícone ChevronDown** | ✅ Presente | ❌ Removido |
| **Placeholder** | "Selecione um estado primeiro" | "Ex: São Paulo" |
| **Validação** | ❌ Nenhuma | ❌ Nenhuma (correto) |
| **Depende do UF** | ✅ Sim | ❌ Não |
| **Estados locais** | 3 (cityQuery, showCityDropdown, cityResults) | 0 |
| **Handlers** | 2 (handleCityInputChange, handleCitySelect) | 0 |
| **Imports locations.ts** | 4 funções | 2 funções |

---

## 🎨 UX/UI

### Antes:
1. Usuário abre Cadastro Passo 2
2. Campo Cidade está **desabilitado** (cinza)
3. Placeholder: "Selecione um estado primeiro"
4. Usuário precisa selecionar UF
5. Campo Cidade é **habilitado**
6. Usuário digita e vê dropdown de sugestões
7. Usuário pode selecionar da lista ou digitar

### Depois:
1. Usuário abre Cadastro Passo 2
2. Campo Cidade está **habilitado** (normal)
3. Placeholder: "Ex: São Paulo"
4. Usuário pode digitar imediatamente qualquer cidade
5. Sem dropdown, sem sugestões
6. Campo aceita texto livre

---

## 🔐 Segurança e Validação

### Backend
O backend deve:
- ✅ Aceitar `city` como `String?` (opcional)
- ✅ Aplicar `trim()` no texto
- ✅ Aceitar qualquer valor válido de string
- ❌ NÃO validar contra lista de cidades
- ❌ NÃO verificar se cidade pertence ao UF

### Frontend
O frontend:
- ✅ Envia texto exato digitado pelo usuário
- ✅ Não aplica transformações (exceto trim se houver)
- ✅ Não valida contra lista
- ✅ Permite campo vazio (opcional no schema)

---

## 📝 Notas Adicionais

### Outros Módulos Não Afetados
- ✅ **Configurações › Dados da empresa:** Não modificado
- ✅ **Inventário:** Não modificado
- ✅ **Demais módulos:** Não modificados

### Funções em locations.ts
- ✅ `searchCities()` permanece disponível para outros módulos
- ✅ `getCitiesForState()` permanece disponível
- ✅ Apenas removemos o uso no Step2Company.tsx

### Compatibilidade com Schema
- ✅ 100% alinhado com `Company.city: String?`
- ✅ Aceita qualquer string
- ✅ Campo opcional conforme schema

---

## ✅ Conclusão

**Status:** ✅ TAREFA CONCLUÍDA

**Resumo das alterações:**
1. ✅ Campo Cidade agora é um input de texto simples
2. ✅ Sempre habilitado, sem depender do UF
3. ✅ Sem autocomplete ou dropdown
4. ✅ Aceita qualquer texto digitado pelo usuário
5. ✅ Placeholder simplificado: "Ex: São Paulo"
6. ✅ Removidos estados locais e handlers desnecessários
7. ✅ Removidas importações não utilizadas
8. ✅ Campo UF mantido funcionando normalmente
9. ✅ Validações mantidas conforme schema (cidade opcional)
10. ✅ Payload correto enviado ao backend

**Arquivos modificados:**
- `/components/signup/Step2Company.tsx` - Simplificado campo Cidade

**Arquivos não modificados (conforme solicitado):**
- `/lib/locations.ts` - Funções mantidas para outros módulos
- `/types/signup.ts` - Tipos já estavam corretos
- `/pages/cadastro.tsx` - Validações já estavam corretas

**Documentação criada:**
- `/docs/CHECKLIST_CIDADE_MANUAL_V3.md` - Este arquivo

---

**Última atualização:** 02/12/2024
