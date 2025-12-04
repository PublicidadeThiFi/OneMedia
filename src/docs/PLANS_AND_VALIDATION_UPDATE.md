# Atualização de Planos e Validações - OOH Manager

## Data: Dezembro 2024

## Resumo
Este documento descreve as atualizações implementadas para padronizar os planos da plataforma e adicionar validações robustas nos fluxos de cadastro e login.

## 1. Padronização de Planos

### 1.1. Fonte Única de Verdade
Criado arquivo `/lib/plans.ts` como fonte centralizada de todos os planos da plataforma.

**Valores Oficiais (em BRL):**
- Até 50 pontos → R$ 299,00
- 50–100 pontos → R$ 399,00
- 101–150 pontos → R$ 499,00 (Mais Popular)
- 151–200 pontos → R$ 599,00
- 201–250 pontos → R$ 699,00
- 251–300 pontos → R$ 799,00
- 301–350 pontos → R$ 899,00
- 351–400 pontos → R$ 999,00
- Mais de 400 pontos → Sob consulta (sem valor numérico)

### 1.2. Estrutura de Dados
```typescript
export interface PlanDefinition {
  id: string;
  range: PlanRange;
  name: string;
  description: string;
  minPoints: number;
  maxPoints: number | null; // null = ilimitado
  monthlyPrice: number; // em centavos (29900 = R$ 299,00)
  priceLabel: string;
  isPopular?: boolean;
}
```

### 1.3. Arquivos Atualizados
- ✅ `/lib/plans.ts` - Novo arquivo com planos centralizados
- ✅ `/types/signup.ts` - Re-exporta tipos de plans.ts
- ✅ `/components/landing/Pricing.tsx` - Usa PLATFORM_PLANS
- ✅ `/components/signup/Step1Plan.tsx` - Usa PLAN_DEFINITIONS
- ✅ `/lib/mockDataSettings.ts` - Mantém mockPlatformPlans alinhado

## 2. Validação e Formatação de Telefone

### 2.1. Regras Implementadas
- **Entrada:** Aceita apenas dígitos (0-9)
- **Tamanho:** 10 ou 11 dígitos (com DDD)
  - 10 dígitos: Telefone fixo (ex: 1134567890)
  - 11 dígitos: Celular (ex: 11987654321)
- **Display:** Formatação visual apenas
  - 10 dígitos → (11) 3456-7890
  - 11 dígitos → (11) 98765-4321
- **Backend:** Envia apenas dígitos, sem formatação

### 2.2. Helpers Criados em `/lib/validators.ts`
```typescript
onlyDigits(value: string): string
isValidPhone(digits: string): boolean
formatPhoneDisplay(digits: string): string
handlePhoneInput(value: string): string
```

### 2.3. Implementação
- ✅ **Cadastro - Passo 2:** Telefone da empresa
- ✅ **Cadastro - Passo 3:** Telefone do usuário
- ✅ Estado interno mantém apenas dígitos
- ✅ Display mostra formatação visual
- ✅ Payload enviado ao backend contém apenas dígitos

## 3. Autocomplete de UF/Estado e Cidade

### 3.1. Dados Criados em `/lib/locations.ts`
- **Estados:** Lista completa dos 27 estados brasileiros (UF + Nome)
- **Cidades:** Principais cidades de cada estado (~15 por UF)

### 3.2. Funcionalidades
- ✅ **UF/Estado:** 
  - Autocomplete com busca case-insensitive
  - Busca por UF ou nome do estado
  - Dropdown com sugestões
  
- ✅ **Cidade:**
  - Dependente da UF selecionada
  - Autocomplete reativo
  - Dropdown mostra apenas cidades do estado selecionado
  - Campo desabilitado se estado não foi selecionado

### 3.3. Helpers Criados
```typescript
searchStates(query: string): BrazilianState[]
getCitiesForState(uf: string): string[]
searchCities(uf: string, query: string): string[]
getStateByUF(uf: string): BrazilianState | undefined
```

### 3.4. UX
- Dropdown aparece no focus
- Filtragem em tempo real
- Delay de 200ms no onBlur para permitir click
- Ícone de chevron indica dropdown

## 4. Validação de Senha Forte (Cadastro)

### 4.1. Regras (apenas para CADASTRO)
- ✅ Mínimo de 8 caracteres
- ✅ Pelo menos 1 letra maiúscula (A-Z)
- ✅ Pelo menos 1 número (0-9)
- ✅ Pelo menos 1 caractere especial (!@#$%&*...)

### 4.2. UX no Cadastro
- Feedback visual em tempo real
- Lista de requisitos com checkmarks/X
- Cores:
  - ✅ Verde = requisito atendido
  - ❌ Vermelho = requisito não atendido
- Validação completa antes de permitir submit

### 4.3. Login
⚠️ **IMPORTANTE:** Validação forte NÃO é aplicada no login
- Login aceita qualquer senha não-vazia
- Usuários antigos podem ter senhas que não atendem aos novos requisitos

### 4.4. Helpers Criados
```typescript
validatePasswordRequirements(password: string): PasswordRequirements
getPasswordErrorMessage(password: string): string | null
```

## 5. Usuários Mockados para Login

### 5.1. Usuários de Teste
```typescript
// Com 2FA (TOTP)
carlos.mendes@outdoorbrasil.com.br / senha123
2FA Code: 123456

// Sem 2FA (ACTIVE)
ana.silva@outdoorbrasil.com.br / senha123
roberto.lima@outdoorbrasil.com.br / senha123

// INACTIVE (teste de erro)
maria.santos@outdoorbrasil.com.br / senha123
// Erro esperado: "Usuário inativo ou convite ainda não concluído."
```

### 5.2. Campos Atualizados
- ✅ Emails corrigidos para @outdoorbrasil.com.br
- ✅ Phone armazenado apenas com dígitos (sem formatação)
- ✅ Status apropriados (ACTIVE/INACTIVE)
- ✅ twoFactorEnabled correto para cada usuário

## 6. Navegação para Login

### 6.1. Verificação de useNavigation()
Todos os links que levam ao login agora usam `useNavigation()`:

- ✅ Header da landing → Botão "Entrar"
- ✅ Cadastro → Link "Já tenho uma conta"
- ✅ SuccessScreen → Botão "Ir para Login"
- ✅ LoginForm → Link "Começar teste grátis" (vai para /cadastro)

### 6.2. Padrão de Implementação
```typescript
const navigate = useNavigation();
<button onClick={() => navigate('/login')}>Entrar</button>
```

## 7. Validações de Formulário

### 7.1. Cadastro - Passo 2 (Empresa)
```typescript
- fantasyName: obrigatório
- cnpj: obrigatório, 14 dígitos
- phone: opcional, se preenchido deve ter 10 ou 11 dígitos
```

### 7.2. Cadastro - Passo 3 (Usuário)
```typescript
- name: obrigatório
- email: obrigatório, formato válido
- phone: obrigatório, 10 ou 11 dígitos
- password: obrigatório, requisitos fortes
- confirmPassword: obrigatório, deve ser igual a password
- acceptedTerms: obrigatório (checkbox)
```

### 7.3. Helpers de Validação
```typescript
isValidEmail(email: string): boolean
isValidCNPJ(value: string): boolean
isValidPhone(digits: string): boolean
validatePasswordRequirements(password: string): PasswordRequirements
```

## 8. Payload de Cadastro

### 8.1. Formato Enviado ao Backend
```typescript
{
  plan: {
    platformPlanId: string;
    planRange: PlanRange;
  },
  company: {
    fantasyName: string;
    legalName?: string;
    cnpj: string; // APENAS DÍGITOS
    phone?: string; // APENAS DÍGITOS
    website?: string;
    city?: string;
    state?: string;
    country?: string;
  },
  adminUser: {
    name: string;
    email: string;
    phone: string; // APENAS DÍGITOS
    password: string; // TEXTO PURO - backend faz hash
  }
}
```

### 8.2. Tratamento de Dados
- ✅ CNPJ: `onlyDigits(step2Data.cnpj)`
- ✅ Phone (company): `onlyDigits(step2Data.phone)`
- ✅ Phone (user): `onlyDigits(step3Data.phone)`
- ✅ Password: texto puro (backend fará bcrypt/hash)

## 9. Arquivos Criados/Atualizados

### Novos Arquivos
```
/lib/plans.ts - Planos centralizados
/lib/validators.ts - Validações e formatações
/lib/locations.ts - Estados e cidades brasileiras
/docs/PLANS_AND_VALIDATION_UPDATE.md - Esta documentação
```

### Arquivos Atualizados
```
/types/signup.ts - Re-exporta planos
/components/landing/Pricing.tsx - Usa planos centralizados
/components/signup/Step1Plan.tsx - Usa planos centralizados
/components/signup/Step2Company.tsx - Telefone + UF/Cidade
/components/signup/Step3User.tsx - Telefone + senha forte
/pages/cadastro.tsx - Validações atualizadas
/lib/mockDataSettings.ts - Usuários com emails corretos
/components/login/LoginForm.tsx - Validação simples de senha
```

## 10. Checklist de Funcionalidades

### ✅ Planos
- [x] Fonte única de verdade em /lib/plans.ts
- [x] Valores corretos (299/399/499/599/699/799/899/999/Sob consulta)
- [x] Landing usa planos centralizados
- [x] Cadastro passo 1 usa planos centralizados
- [x] Plano "Sob consulta" não mostra valor numérico
- [x] Navegação com ?planRange funciona

### ✅ Telefone
- [x] Formatação visual apenas
- [x] Backend recebe apenas dígitos
- [x] Validação 10 ou 11 dígitos
- [x] Implementado em cadastro passo 2
- [x] Implementado em cadastro passo 3
- [x] Máscara (11) 98765-4321

### ✅ UF/Cidade
- [x] Autocomplete de estados
- [x] Autocomplete de cidades (dependente de UF)
- [x] Busca case-insensitive
- [x] Dropdown funcional
- [x] Campo cidade desabilitado sem estado

### ✅ Senha
- [x] Validação forte no cadastro
- [x] Feedback visual em tempo real
- [x] Lista de requisitos com checkmarks
- [x] Login sem validação forte
- [x] Confirmação de senha obrigatória

### ✅ Login
- [x] Usuários mockados com emails corretos
- [x] Fluxo 2FA funcionando (carlos.mendes@...)
- [x] Fluxo sem 2FA funcionando (ana.silva@..., roberto.lima@...)
- [x] Usuário inativo retorna erro (maria.santos@...)
- [x] Navegação para login funcionando em todos os lugares

### ✅ Validações
- [x] Email válido
- [x] CNPJ 14 dígitos
- [x] Telefone 10 ou 11 dígitos
- [x] Senha forte no cadastro
- [x] Campos obrigatórios marcados com *
- [x] Mensagens de erro claras

## 11. Testes Manuais Recomendados

### 11.1. Fluxo de Planos
1. Acessar landing page
2. Verificar valores na seção de planos
3. Clicar em "Começar teste neste plano"
4. Verificar que plano foi pré-selecionado
5. Confirmar valores no passo 1

### 11.2. Cadastro Completo
1. Escolher plano
2. Preencher dados da empresa:
   - Testar telefone com formatação
   - Testar UF/Cidade com autocomplete
3. Preencher dados do usuário:
   - Testar senha forte com feedback visual
   - Testar telefone com formatação
4. Verificar payload no console (apenas dígitos)

### 11.3. Login
1. Testar com carlos.mendes@outdoorbrasil.com.br (2FA)
   - Verificar que pede código
   - Código: 123456
2. Testar com ana.silva@outdoorbrasil.com.br (sem 2FA)
   - Deve ir direto para dashboard
3. Testar com maria.santos@outdoorbrasil.com.br (inativa)
   - Deve mostrar erro "Usuário inativo"

## 12. Próximos Passos (API Integration)

### 12.1. Cadastro
- Substituir mockSignup por POST /api/signup
- Tratar erros do backend
- Validar CNPJ único no backend
- Enviar email de confirmação

### 12.2. Login
- Substituir mockLogin por POST /api/auth/login
- Substituir mockVerifyTwoFactor por POST /api/auth/2fa/verify
- Implementar refresh token
- Armazenar tokens no localStorage/sessionStorage

### 12.3. Validações
- Validação de CNPJ com dígito verificador
- Consulta de CEP para preencher endereço
- Integração com API de cidades (IBGE)

## Conclusão

Todas as atualizações foram implementadas com sucesso:
- ✅ Planos padronizados em fonte única
- ✅ Telefone validado e formatado corretamente
- ✅ UF/Cidade com autocomplete inteligente
- ✅ Senha forte com feedback visual
- ✅ Usuários mockados com dados corretos
- ✅ Navegação funcionando em todos os lugares
- ✅ Sistema 100% funcional e pronto para integração com API

O projeto está pronto para os próximos passos de integração com backend real.
