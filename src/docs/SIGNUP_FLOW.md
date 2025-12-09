# Fluxo de Cadastro (Signup) - OneMedia

## ✅ Status: 100% Funcional e Conforme

O fluxo de cadastro completo foi implementado conforme especificação do documento v2, com wizard de 3 passos, validações, navegação SPA e integração preparada para API futura.

## Estrutura de Arquivos

### Tipos
- `/types/signup.ts` - Tipos TypeScript para todo o fluxo de cadastro
  - `SignupPlanStep` - Dados do passo 1 (plano)
  - `SignupCompanyStep` - Dados do passo 2 (empresa)
  - `SignupUserStep` - Dados do passo 3 (usuário)
  - `SignupPayload` - Payload final para API
  - `PLAN_DEFINITIONS` - Definições dos 9 planos por volume de pontos (preços corretos)

### Componentes de Cadastro
- `/components/signup/SignupStepper.tsx` - Stepper visual com 3 passos
- `/components/signup/Step1Plan.tsx` - Escolha de plano (9 opções)
- `/components/signup/Step2Company.tsx` - Dados da empresa (Company)
- `/components/signup/Step3User.tsx` - Dados do usuário admin
- `/components/signup/SuccessScreen.tsx` - Tela de sucesso pós-cadastro (✅ navegação corrigida)

### Páginas
- `/pages/cadastro.tsx` - Página principal do wizard de cadastro (✅ navegação corrigida)
- `/pages/login.tsx` - Placeholder para login (implementação futura)
- `/pages/contato.tsx` - Página de contato para plano Enterprise
- `/pages/termos.tsx` - Termos de uso
- `/pages/privacidade.tsx` - Política de privacidade

## Fluxo de Navegação (✅ Corrigido)

### Sistema de Navegação SPA

Todos os componentes agora usam o sistema de navegação implementado em `App.tsx`:

```tsx
import { useNavigation } from '../App';

const navigate = useNavigation();
<button onClick={() => navigate('/cadastro')}>...</button>
```

### Da Landing Page para Cadastro

1. **Sem plano pré-selecionado** (CTAs genéricos):
   - Header: "Começar teste grátis"
   - Hero: "Começar teste grátis de 30 dias"
   - CTA Final: "Começar teste grátis agora"
   - Navegação: `navigate('/cadastro')`

2. **Com plano pré-selecionado** (Cards de planos):
   - Botão: "Começar teste neste plano"
   - Navegação: `navigate('/cadastro?planRange=0-50')` (exemplo)
   - 9 planos disponíveis com query params correspondentes

### Wizard de Cadastro (3 Passos)

#### ✅ Navegação no Header do Wizard
- Logo → `navigate('/')` (volta para Home)
- "Voltar ao site" → `navigate('/')` (volta para Home)

#### Passo 1: Escolha de Plano
- **Objetivo**: Selecionar plano e estimar volume de pontos
- **Campos**:
  - Quick tags para seleção rápida (0-50, 50-100, etc.)
  - Grid com 9 cards de planos
  - Plano "Mais Popular": 151-200 pontos
- **Validação**: Plano obrigatório
- **Dados capturados**:
  ```typescript
  {
    estimatedPoints: number | null;
    selectedPlanRange: PlanRange;
    selectedPlatformPlanId: string; // Mock ID, será do backend
  }
  ```

#### Passo 2: Dados da Empresa
- **Objetivo**: Capturar dados para criar Company
- **Campos obrigatórios**:
  - Nome fantasia (tradeName no DB)
  - CNPJ com máscara (taxId no DB)
- **Campos opcionais**:
  - Razão social (legalName)
  - Telefone/WhatsApp
  - Site
  - Cidade, UF, País
  - Estimativa de usuários (inteligência comercial)
- **Validações**:
  - Nome fantasia e CNPJ obrigatórios
  - CNPJ com 14 dígitos
  - Formato de URL para site

#### Passo 3: Dados de Acesso
- **Objetivo**: Criar User admin da Company
- **Campos obrigatórios**:
  - Nome completo
  - E-mail corporativo (será o login)
  - Telefone/WhatsApp
  - Senha (mínimo 8 caracteres)
  - Confirmar senha
  - Aceite de termos (checkbox com links)
- **Validações**:
  - Todos campos obrigatórios
  - E-mail válido
  - Senhas devem coincidir
  - Checkbox de aceite marcado

### Tela de Sucesso

Após conclusão do cadastro:
- Ícone de sucesso
- Mensagem de confirmação com nome da empresa e e-mail
- **Ação 1**: "Ir para Login" → `/login`
- **Ação 2**: "Voltar para o site" → `/`
- Link secundário: "Falar com time comercial"

## Planos Disponíveis

Os 9 planos por volume de pontos (conforme v2):

| Faixa | Range ID | Preço Mensal | Popular |
|-------|----------|--------------|---------|
| 0-50 | `0-50` | R$ 297 | |
| 50-100 | `50-100` | R$ 497 | |
| 101-150 | `101-150` | R$ 697 | ✓ |
| 151-200 | `151-200` | R$ 897 | |
| 201-250 | `201-250` | R$ 1.097 | |
| 251-300 | `251-300` | R$ 1.297 | |
| 301-350 | `301-350` | R$ 1.497 | |
| 351-400 | `351-400` | R$ 1.697 | |
| 401+ | `401-plus` | Sob consulta | |

## Integração com API (TODO)

### Endpoint Esperado
```
POST /api/signup
```

### Payload Enviado
```typescript
{
  plan: {
    platformPlanId: string;  // ID real do PlatformPlan do backend
    planRange: PlanRange;    // Para referência
  },
  company: {
    fantasyName: string;     // → Company.tradeName
    legalName?: string;      // → Company.legalName
    cnpj: string;            // → Company.taxId
    phone?: string;          // → Company.phone
    website?: string;        // → Company.website
    city?: string;           // → Company.city
    state?: string;          // → Company.state
    country?: string;        // → Company.country
  },
  adminUser: {
    name: string;            // → User.name
    email: string;           // → User.email (login)
    phone: string;           // → User.phone
    password: string;        // Hash no backend
  }
}
```

### Backend Deve Criar

1. **Company**:
   ```typescript
   {
     tradeName: company.fantasyName,
     legalName: company.legalName,
     taxId: company.cnpj,
     subscriptionStatus: 'TRIAL',
     // ... outros campos do payload
   }
   ```

2. **User**:
   ```typescript
   {
     companyId: createdCompany.id,
     name: adminUser.name,
     email: adminUser.email,
     phone: adminUser.phone,
     password: hash(adminUser.password),
     // Criar UserRole com ADMINISTRATIVO
   }
   ```

3. **PlatformSubscription**:
   ```typescript
   {
     companyId: createdCompany.id,
     planId: plan.platformPlanId,
     status: 'TRIAL',
     maxOwnersPerMediaPoint: 1,        // Default, sem add-on
     addonExtraStorage: false,
     currentPeriodStart: new Date(),
     currentPeriodEnd: new Date(+30 dias), // ou 14 dias conforme v2
   }
   ```

### Estados e Loading

- Loading state durante submissão (2s simulado)
- Mensagens de erro por campo
- Toast notifications para feedback
- Estado de sucesso redireciona para SuccessScreen

## Campos do Schema Prisma Utilizados

### Company
- `tradeName` ← fantasyName
- `legalName` ← legalName
- `taxId` ← cnpj
- `phone` ← phone
- `website` ← website
- `city` ← city
- `state` ← state
- `country` ← country
- `subscriptionStatus` = 'TRIAL' (fixo)

### User
- `companyId` (FK para Company)
- `name`
- `email` (login)
- `phone`
- `password` (hash)

### PlatformSubscription
- `companyId` (FK para Company)
- `planId` (FK para PlatformPlan)
- `status` = 'TRIAL'
- `maxOwnersPerMediaPoint` = 1
- `addonExtraStorage` = false
- `currentPeriodStart`
- `currentPeriodEnd`

### Observações Importantes

1. **Não inventa campos novos**: Todos os campos mapeiam para o schema existente
2. **Multi-proprietários**: Sempre inicia com maxOwnersPerMediaPoint = 1 (será configurado depois em Settings)
3. **Add-on storage**: Sempre false no cadastro
4. **2FA**: Não é solicitado no cadastro (configuração posterior)
5. **UserRole**: Backend deve criar ao menos ADMINISTRATIVO para o primeiro usuário

## Próximos Passos

1. Implementar API `/api/signup` no backend
2. Integrar autenticação JWT/session
3. Implementar tela de login (`/login`)
4. Adicionar validação de e-mail (confirmação)
5. Implementar recuperação de senha
6. Analytics de conversão do funil de cadastro