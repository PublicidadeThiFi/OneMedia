# Ajustes de Cadastro, Login e Navegação

## Data: 02/12/2024

Este documento descreve os ajustes realizados no fluxo de Cadastro, Login e navegação do sistema OneMedia.

---

## 1. Cadastro - Passo 1 (Seleção de Planos)

### Mudanças realizadas
- ✅ **Removidos os botões pequenos de faixa de pontos** (chips "Até 50", "50-100", etc.)
- ✅ **Seleção de plano apenas via cards grandes**
- ✅ **Pré-seleção via query string mantida** (`?planRange=101-150`)

### Arquivo modificado
- `/components/signup/Step1Plan.tsx`

### Como funciona agora
1. O usuário visualiza apenas os 9 cards grandes de planos
2. Cada card mostra:
   - Nome do plano (ex: "101 a 150 pontos")
   - Descrição
   - Limite de pontos (ex: "Até 150 pontos")
   - Preço (ex: "R$ 499/mês" ou "Sob consulta")
   - Badge "Mais Popular" (apenas no plano 101-150)
   - Ícone de check quando selecionado
3. Ao clicar em qualquer card, o plano é selecionado
4. Se a URL contiver `?planRange=XXX-YYY`, o plano correspondente é pré-selecionado automaticamente
5. Se não houver query string, o plano padrão (101-150) é pré-selecionado

### Fonte de verdade
- Os planos são carregados de `/lib/plans.ts` (PLATFORM_PLANS)
- Não foram criados novos campos no schema ou payload
- A estrutura de dados continua a mesma

---

## 2. Cadastro - Passo 2 (Dados da Empresa)

### Status atual
O código já estava **implementado corretamente**. Não foram necessárias mudanças.

### Funcionalidades confirmadas
- ✅ Campo **Cidade** fica desabilitado até que um UF seja selecionado
- ✅ Placeholder "Selecione um estado primeiro" quando desabilitado
- ✅ **Autocomplete de UF/Estado** funcionando (case-insensitive)
- ✅ Ao selecionar UF, o campo Cidade é **automaticamente habilitado**
- ✅ **Autocomplete de Cidade** funciona apenas com cidades do UF selecionado
- ✅ Telefone com máscara visual, backend recebe apenas dígitos
- ✅ Validação de CNPJ com máscara

### Arquivos envolvidos
- `/components/signup/Step2Company.tsx`
- `/lib/locations.ts` (dados de estados e cidades)
- `/lib/validators.ts` (validação de telefone, CNPJ)

### Mapeamento para o backend
- `fantasyName` → `Company.tradeName`
- `legalName` → `Company.legalName`
- `cnpj` (apenas dígitos) → `Company.taxId`
- `phone` (apenas dígitos) → `Company.phone`
- `city` → `Company.city`
- `state` → `Company.state`
- `country` → `Company.country`

---

## 3. Login - Navegação para o App Interno

### Mudanças realizadas
- ✅ **Criado componente MainApp** (`/components/MainApp.tsx`)
- ✅ **Adicionadas rotas `/app` e `/app/*`** ao App.tsx
- ✅ **AuthContext agora navega para `/app`** após login bem-sucedido
- ✅ **Dashboard demo (`/pages/dashboard.tsx`) isolado** (não é mais usado após login)

### Arquivos criados
- `/components/MainApp.tsx` - Shell do aplicativo interno

### Arquivos modificados
- `/App.tsx` - Adicionado suporte a rotas `/app`
- `/contexts/AuthContext.tsx` - Alterada navegação pós-login de `/dashboard` para `/app`

### Rota padrão pós-login
**`/app`** (ou `/app/dashboard`)

Após o login bem-sucedido (com ou sem 2FA), o usuário é redirecionado para `/app`, que renderiza o **MainApp** com o Dashboard interno.

### Estrutura do App Interno

```
/app                    → Dashboard (padrão)
/app/dashboard          → Dashboard
/app/inventory          → Inventário
/app/clients            → Clientes
/app/products           → Produtos/Serviços
/app/proposals          → Propostas
/app/campaigns          → Campanhas
/app/reservations       → Reservas
/app/financial          → Financeiro
/app/messages           → Mensagens
/app/mediakit           → Mídia Kit
/app/activities         → Atividades
/app/settings           → Configurações
/app/superadmin         → Super Admin (apenas para super admins)
```

### Componentes do App Interno

O MainApp renderiza:
- **Sidebar** (menu lateral esquerdo)
  - Logo e título "OneMedia"
  - Itens de menu (Dashboard, Inventário, Clientes, etc.)
  - Badge do plano atual (na parte inferior)
  
- **Top Bar** (barra superior)
  - Nome e email do usuário
  - Botão "Sair"
  
- **Área de conteúdo principal**
  - Renderiza o componente do módulo atual (Dashboard, Inventory, etc.)

### Diferença entre /dashboard e /app

| Rota | Descrição | Uso |
|------|-----------|-----|
| `/dashboard` | Dashboard demo (placeholder) | **Não usado** após login |
| `/app` ou `/app/dashboard` | Dashboard interno real | **Rota padrão** após login |

---

## 4. Fluxos de Login Mantidos

### Login sem 2FA
1. Usuário entra com email e senha
2. Sistema valida credenciais
3. Se correto e usuário `ACTIVE` sem 2FA → navega para `/app`

### Login com 2FA
1. Usuário entra com email e senha
2. Sistema valida credenciais
3. Se correto e usuário `ACTIVE` com 2FA → mostra tela de código 6 dígitos
4. Usuário insere código 2FA
5. Sistema valida código
6. Se correto → navega para `/app`

### Fluxos de erro mantidos
- ❌ Credenciais inválidas → mensagem de erro
- ❌ Usuário `INACTIVE` → mensagem de erro
- ❌ Código 2FA incorreto → mensagem de erro

---

## 5. Credenciais de Teste

### Usuário sem 2FA
```
Email: ana.silva@outdoorbrasil.com.br
Senha: senha123
```

### Usuário com 2FA
```
Email: carlos.mendes@outdoorbrasil.com.br
Senha: senha123
Código 2FA: 123456
```

---

## 6. Garantias

### O que NÃO foi alterado
- ✅ Nenhum campo novo foi criado em `User`, `Company`, `PlatformSubscription`
- ✅ Contratos de payload de signup/login permanecem inalterados
- ✅ Validações de telefone, senha forte e 2FA mantidas
- ✅ Todos os CTAs de navegação usam `useNavigation()` (sem `<a href>`)
- ✅ Estrutura de dados alinhada com schema.prisma e documentos v2

### Schema e documentos alinhados
- ✅ `Escopo_GestãoDeMídia_v2.pdf`
- ✅ `Escopo_Site_Marketing.pdf`
- ✅ `schema.prisma`

---

## 7. Navegação Ajustada

### AuthContext
```typescript
// Antes
navigate('/dashboard');

// Depois
navigate('/app');
```

### App.tsx
```typescript
// Novo: Rotas /app renderizam MainApp
if (cleanPath.startsWith('/app')) {
  const pagePath = cleanPath.replace('/app/', '').replace('/app', '');
  return <MainApp initialPage={pagePath || 'dashboard'} />;
}
```

---

## Resumo das Entregas

### ✅ Cadastro - Passo 1
- Chips de faixa de pontos removidos
- Seleção apenas via cards grandes
- Pré-seleção por query string funcionando

### ✅ Cadastro - Passo 2
- Campo Cidade habilitado ao selecionar UF (já estava implementado corretamente)
- Autocomplete de UF e Cidade funcionando
- Payload mapeado corretamente para Company

### ✅ Login / Navegação
- Após login (com ou sem 2FA), usuário vai para `/app` (Dashboard interno com menu lateral)
- Dashboard demo (`/pages/dashboard.tsx`) isolado
- Nenhuma quebra nos fluxos de login existentes

---

## Testes Recomendados

### 1. Teste de Cadastro
- [ ] Acessar `/cadastro`
- [ ] Verificar que apenas os cards grandes aparecem (sem chips de faixa)
- [ ] Selecionar um plano e avançar
- [ ] No Passo 2, selecionar um UF
- [ ] Verificar que o campo Cidade é habilitado
- [ ] Selecionar uma cidade e completar o cadastro

### 2. Teste de Login sem 2FA
- [ ] Acessar `/login`
- [ ] Login com: `ana.silva@outdoorbrasil.com.br` / `senha123`
- [ ] Verificar redirecionamento para `/app`
- [ ] Verificar que o Dashboard interno é exibido (com menu lateral)

### 3. Teste de Login com 2FA
- [ ] Acessar `/login`
- [ ] Login com: `carlos.mendes@outdoorbrasil.com.br` / `senha123`
- [ ] Inserir código 2FA: `123456`
- [ ] Verificar redirecionamento para `/app`
- [ ] Verificar que o Dashboard interno é exibido (com menu lateral)

### 4. Teste de Navegação Interna
- [ ] Após login, clicar em "Inventário" no menu lateral
- [ ] Verificar que o módulo de Inventário é carregado
- [ ] Clicar em "Clientes" no menu lateral
- [ ] Verificar que o módulo de Clientes é carregado
- [ ] Clicar em "Sair" no topo
- [ ] Verificar redirecionamento para `/login`

---

## Autor
Assistente de desenvolvimento - OneMedia
Data: 02/12/2024
