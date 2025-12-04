# API Integration Guide - Signup Flow

## TODO: Backend Implementation Checklist

Este documento lista todos os TODOs para integrar o fluxo de cadastro com o backend real.

## 1. Criar Endpoint de Signup

### Arquivo
`/api/signup` ou similar (Next.js API Routes ou backend separado)

### Método
POST

### Request Body
```typescript
interface SignupRequest {
  plan: {
    platformPlanId: string;
    planRange: string;
  };
  company: {
    fantasyName: string;
    legalName?: string;
    cnpj: string;
    phone?: string;
    website?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  adminUser: {
    name: string;
    email: string;
    phone: string;
    password: string;
  };
}
```

### Response Success (201)
```typescript
{
  success: true,
  data: {
    companyId: string;
    userId: string;
    subscriptionId: string;
  },
  message: "Conta criada com sucesso"
}
```

### Response Error (400/422)
```typescript
{
  success: false,
  errors: {
    field: string[];
  },
  message: "Erro na validação"
}
```

## 2. Lógica do Backend

### Passo 1: Validações
```typescript
// Validar CNPJ único
const existingCompany = await prisma.company.findUnique({
  where: { taxId: cnpj }
});
if (existingCompany) {
  throw new Error("CNPJ já cadastrado");
}

// Validar e-mail único
const existingUser = await prisma.user.findUnique({
  where: { email: adminUser.email }
});
if (existingUser) {
  throw new Error("E-mail já cadastrado");
}

// Validar plano existe
const plan = await prisma.platformPlan.findUnique({
  where: { id: platformPlanId }
});
if (!plan) {
  throw new Error("Plano não encontrado");
}
```

### Passo 2: Criar Company
```typescript
const company = await prisma.company.create({
  data: {
    tradeName: company.fantasyName,
    legalName: company.legalName || company.fantasyName,
    taxId: company.cnpj.replace(/\D/g, ''), // Remover máscara
    phone: company.phone,
    website: company.website,
    city: company.city,
    state: company.state,
    country: company.country || 'Brasil',
    subscriptionStatus: 'TRIAL', // Enum SubscriptionStatus
    // Outros campos opcionais conforme schema
  }
});
```

### Passo 3: Criar User Admin
```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(adminUser.password, 10);

const user = await prisma.user.create({
  data: {
    companyId: company.id,
    name: adminUser.name,
    email: adminUser.email.toLowerCase(),
    phone: adminUser.phone,
    password: hashedPassword,
    isActive: true,
    // Criar UserRole ADMINISTRATIVO
    UserRole: {
      create: {
        role: 'ADMINISTRATIVO', // Enum conforme schema
      }
    }
  },
  include: {
    UserRole: true
  }
});
```

### Passo 4: Criar PlatformSubscription
```typescript
const trialDays = 30; // Ou 14 dias conforme definição v2
const currentPeriodStart = new Date();
const currentPeriodEnd = new Date();
currentPeriodEnd.setDate(currentPeriodEnd.getDate() + trialDays);

const subscription = await prisma.platformSubscription.create({
  data: {
    companyId: company.id,
    planId: plan.id,
    status: 'TRIAL', // Enum SubscriptionStatus
    maxOwnersPerMediaPoint: 1, // Default sem add-on
    addonExtraStorage: false,
    currentPeriodStart,
    currentPeriodEnd,
  }
});
```

### Passo 5: Enviar E-mail de Boas-Vindas
```typescript
// TODO: Integrar com serviço de e-mail (SendGrid, AWS SES, etc.)
await sendWelcomeEmail({
  to: user.email,
  name: user.name,
  companyName: company.tradeName,
  loginUrl: `${process.env.APP_URL}/login`,
  trialEndDate: subscription.currentPeriodEnd,
});
```

### Passo 6: Retornar Resposta
```typescript
return {
  success: true,
  data: {
    companyId: company.id,
    userId: user.id,
    subscriptionId: subscription.id,
  },
  message: "Conta criada com sucesso"
};
```

## 3. Atualizar Frontend

### Arquivo: `/pages/cadastro.tsx`

Localizar este trecho:
```typescript
// TODO: Implement API call to POST /api/signup
console.log('Signup payload (TODO: send to API):', payload);

// Simulate API call
await new Promise((resolve) => setTimeout(resolve, 2000));
```

Substituir por:
```typescript
try {
  const response = await fetch('/api/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle validation errors
    if (data.errors) {
      // Show errors in form fields
      Object.keys(data.errors).forEach(field => {
        // Set field-specific errors
        console.error(`${field}: ${data.errors[field].join(', ')}`);
      });
    }
    throw new Error(data.message || 'Erro ao criar conta');
  }

  // Success - show success screen
  setIsSuccess(true);
  
  // Optional: Store session/token if backend returns one
  if (data.token) {
    localStorage.setItem('authToken', data.token);
  }

} catch (error) {
  console.error('Signup error:', error);
  toast.error(error.message || 'Erro ao criar conta. Tente novamente.');
  setIsLoading(false);
  return;
}
```

## 4. Criar Endpoint de Listagem de Planos

Para popular o Step 1 com planos reais do banco:

### Endpoint
```
GET /api/plans
```

### Response
```typescript
{
  success: true,
  data: [
    {
      id: "uuid-1",
      name: "Até 50 pontos",
      minPoints: 0,
      maxPoints: 50,
      monthlyPrice: 299.00,
      // ... outros campos
    },
    // ... outros planos
  ]
}
```

### Frontend Update
No componente `Step1Plan.tsx`, substituir `PLAN_DEFINITIONS` fixo por fetch de API:

```typescript
const [plans, setPlans] = useState([]);

useEffect(() => {
  async function loadPlans() {
    const response = await fetch('/api/plans');
    const data = await response.json();
    setPlans(data.data);
  }
  loadPlans();
}, []);
```

## 5. Variáveis de Ambiente

Adicionar ao `.env`:

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
TRIAL_PERIOD_DAYS=30

# Email Service
SENDGRID_API_KEY="your-key"
EMAIL_FROM="noreply@oohmanager.com"
```

## 6. Testes Recomendados

### Testes Unitários
- Validação de CNPJ
- Validação de e-mail
- Hash de senha
- Cálculo de data de trial

### Testes de Integração
- Criar conta completa
- Validar unicidade de CNPJ
- Validar unicidade de e-mail
- Verificar criação de User + Company + Subscription
- Verificar envio de e-mail

### Testes E2E (Cypress/Playwright)
- Fluxo completo de cadastro
- Validações de formulário
- Navegação entre passos
- Tela de sucesso
- Redirecionamento para login

## 7. Segurança

### Implementar Rate Limiting
```typescript
// Limitar tentativas de cadastro por IP
import rateLimit from 'express-rate-limit';

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de cadastro. Tente novamente em 15 minutos.'
});

app.post('/api/signup', signupLimiter, async (req, res) => {
  // ...
});
```

### Validar CNPJ no Backend
```typescript
function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/\D/g, '');
  
  if (cnpj.length !== 14) return false;
  
  // Implementar validação de dígitos verificadores
  // ... (algoritmo completo de validação)
  
  return true;
}
```

### Sanitização de Dados
```typescript
import validator from 'validator';

// Sanitizar e-mail
const email = validator.normalizeEmail(adminUser.email);

// Escapar HTML em campos de texto
const sanitizedName = validator.escape(adminUser.name);
```

## 8. Monitoramento

### Logs
```typescript
import winston from 'winston';

logger.info('New signup attempt', {
  email: adminUser.email,
  planId: platformPlanId,
  timestamp: new Date(),
});

logger.info('Signup successful', {
  companyId: company.id,
  userId: user.id,
  plan: plan.name,
});
```

### Analytics
```typescript
// Track signup conversion
analytics.track('Signup Completed', {
  planRange: plan.range,
  planPrice: plan.monthlyPrice,
  source: req.query.utm_source,
});
```

## Status Atual

✅ Frontend completo e funcional  
⏳ API endpoint - TODO  
⏳ Validações backend - TODO  
⏳ Envio de e-mail - TODO  
⏳ Testes - TODO  

## Próximos Passos Prioritários

1. Criar endpoint `/api/signup`
2. Implementar validações (CNPJ, e-mail)
3. Configurar serviço de e-mail
4. Atualizar frontend com chamada real
5. Adicionar testes
6. Deploy em ambiente de staging
