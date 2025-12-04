# Fluxo de Login - OOH Manager

## ✅ Status: 100% Funcional (Mock)

O fluxo de login completo foi implementado conforme especificação do documento v2 e Infra.pdf, com autenticação por e-mail/senha e suporte a 2FA (TOTP, EMAIL, SMS).

---

## Estrutura de Arquivos

### Tipos de Autenticação
- `/types/auth.ts` - Tipos TypeScript para autenticação
  - `LoginCredentials` - Email, senha e rememberMe
  - `TwoFactorPayload` - Email e código de 6 dígitos
  - `AuthUser` - Dados do usuário autenticado
  - `AuthTokens` - Access token e refresh token
  - `LoginResult` - Resultado do login (user, tokens, requiresTwoFactor)

### Contexto de Autenticação
- `/contexts/AuthContext.tsx` - Estado global de autenticação
  - `useAuth()` - Hook para acessar estado e funções de auth
  - `login()` - Fazer login com email/senha
  - `verifyTwoFactor()` - Verificar código 2FA
  - `logout()` - Fazer logout e limpar sessão

### Mock de Autenticação
- `/lib/mockAuth.ts` - Funções de mock para desenvolvimento
  - `mockLogin()` - Simula login com email/senha
  - `mockVerifyTwoFactor()` - Simula verificação de código 2FA

### Componentes de Login
- `/components/login/LoginForm.tsx` - Formulário de email/senha
- `/components/login/TwoFactorStep.tsx` - Formulário de código 2FA

### Páginas
- `/pages/login.tsx` - Página principal de login
- `/pages/dashboard.tsx` - Dashboard pós-login (demo)

---

## Fluxo de Autenticação

### 1. Login Normal (Sem 2FA)

#### Passo a Passo:

1. **Usuário acessa** `/login`
2. **Preenche o formulário**:
   - E-mail corporativo
   - Senha (mínimo 8 caracteres)
   - ✓ Lembrar de mim (opcional)
3. **Clica em "Entrar"**
4. **Sistema valida**:
   - ✅ E-mail existe no sistema
   - ✅ Senha está correta
   - ✅ `User.status === UserStatus.ACTIVE`
   - ✅ `User.twoFactorEnabled === false`
5. **Login concluído**:
   - Gera tokens (access + refresh)
   - Salva usuário no `AuthContext`
   - **Redireciona para** `/dashboard`

#### Usuários de Teste (Sem 2FA):

```
Email: ana.silva@outdoorbrasil.com.br
Senha: senha123
Status: ACTIVE
2FA: Desabilitado
```

```
Email: roberto.lima@outdoorbrasil.com.br
Senha: senha123
Status: ACTIVE
2FA: Desabilitado
```

---

### 2. Login com 2FA

#### Passo a Passo:

1. **Usuário acessa** `/login`
2. **Preenche o formulário** (email + senha)
3. **Clica em "Entrar"**
4. **Sistema valida**:
   - ✅ E-mail existe
   - ✅ Senha está correta
   - ✅ `User.status === UserStatus.ACTIVE`
   - ✅ `User.twoFactorEnabled === true`
5. **Sistema retorna** `requiresTwoFactor: true`
6. **Tela muda para o componente** `TwoFactorStep`
7. **Usuário insere código de 6 dígitos**:
   - Código recebido por TOTP/Email/SMS (conforme `User.twoFactorType`)
   - **Mock:** código é sempre `123456`
8. **Clica em "Confirmar código"**
9. **Sistema valida código**:
   - ✅ Código está correto
   - ✅ Código não expirou
10. **Login concluído**:
    - Gera tokens (access + refresh)
    - Salva usuário no `AuthContext`
    - **Redireciona para** `/dashboard`

#### Usuário de Teste (Com 2FA):

```
Email: carlos.mendes@outdoorbrasil.com.br
Senha: senha123
Status: ACTIVE
2FA: Habilitado (TOTP)
Código 2FA: 123456
```

---

### 3. Login com Usuário Inativo

#### Cenário:

Usuário foi convidado mas ainda não concluiu o aceite do convite, ou foi desativado.

#### Resultado:

```
❌ Erro: "Usuário inativo ou convite ainda não concluído."
```

#### Usuário de Teste (Inativo):

```
Email: maria.santos@outdoorbrasil.com.br
Senha: senha123
Status: INACTIVE
```

---

### 4. Login com Credenciais Inválidas

#### Cenários:

- Email não existe no sistema
- Senha incorreta

#### Resultado:

```
❌ Erro: "Credenciais inválidas"
```

---

## Componentes

### LoginForm

**Campos:**
- ✅ E-mail corporativo (obrigatório, regex de validação)
- ✅ Senha (obrigatória, mínimo 8 caracteres)
- ✅ Checkbox "Lembrar de mim neste dispositivo"
- ✅ Link "Esqueci minha senha" (TODO)

**Botões:**
- ✅ "Entrar" (primário, com loading state)
- ✅ "Começar teste grátis" (link para `/cadastro`)

**Validações:**
- Email válido (regex padrão)
- Senha com pelo menos 8 caracteres
- Mensagens de erro inline por campo
- Mensagem de erro global no topo (credenciais inválidas, usuário inativo, etc.)

**UX:**
- Show/hide password toggle
- Loading spinner durante autenticação
- Desabilita campos durante loading
- Auto-focus no campo de email ao montar

---

### TwoFactorStep

**Campos:**
- ✅ 6 inputs para código de 6 dígitos
- ✅ Auto-advance para o próximo input
- ✅ Suporte a paste (colar código completo)
- ✅ Aceita apenas números

**Botões:**
- ✅ "Confirmar código" (primário, desabilitado até preencher 6 dígitos)
- ✅ "Voltar" (retorna para formulário de email/senha)

**Validações:**
- Código com exatamente 6 dígitos
- Mensagem de erro: "Código inválido ou expirado. Tente novamente."

**UX:**
- Auto-focus no primeiro input ao montar
- Backspace volta para input anterior se atual estiver vazio
- Loading spinner durante verificação
- Exibe email do usuário como referência

---

## Navegação

### Rotas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | Home (Landing) | Página de marketing |
| `/login` | Login | Tela de login |
| `/dashboard` | Dashboard | Área logada (demo) |
| `/cadastro` | Cadastro | Wizard de signup |

### Fluxo de Redirecionamento

**Após login bem-sucedido:**
```
/login → /dashboard
```

**Após logout:**
```
/dashboard → /login
```

**Botões "Entrar" no site:**
- Header (desktop e mobile) → `/login`
- Tela de sucesso do cadastro → `/login`

**Botões "Começar teste grátis":**
- Header → `/cadastro`
- Login → `/cadastro`

---

## AuthContext (Estado Global)

### Interface

```typescript
interface AuthContextValue {
  user: AuthUser | null;                    // Usuário autenticado
  tokens: AuthTokens | null;                // Access + refresh tokens
  isAuthenticated: boolean;                 // true se user && tokens existem
  requiresTwoFactor: boolean;               // true se aguardando código 2FA
  pendingEmail: string | null;              // Email do usuário aguardando 2FA
  login: (credentials) => Promise<void>;    // Fazer login
  verifyTwoFactor: (payload) => Promise<void>; // Verificar código 2FA
  logout: () => void;                       // Fazer logout
}
```

### Uso

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <p>Por favor, faça login.</p>;
  }

  return (
    <div>
      <p>Bem-vindo, {user.name}!</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

---

## Conformidade com Schema Prisma

### User Model

| Campo Frontend (AuthUser) | Campo DB (User) | Tipo | Descrição |
|---------------------------|-----------------|------|-----------|
| `id` | `id` | String | UUID do usuário |
| `companyId` | `companyId` | String | FK para Company |
| `name` | `name` | String | Nome completo |
| `email` | `email` | String | E-mail (login) |
| `isSuperAdmin` | `isSuperAdmin` | Boolean | Super admin flag |
| `status` | `status` | UserStatus | ACTIVE, INACTIVE |
| `twoFactorEnabled` | `twoFactorEnabled` | Boolean | 2FA habilitado? |
| `twoFactorType` | `twoFactorType` | TwoFactorType? | TOTP, EMAIL, SMS |

### Regras de Validação (Conforme Schema)

✅ **Login permitido APENAS se:**
- `User.status === UserStatus.ACTIVE`

✅ **2FA obrigatório se:**
- `User.twoFactorEnabled === true`
- Deve validar código de 6 dígitos
- Tipo de 2FA definido em `User.twoFactorType`

✅ **Tokens gerados após autenticação:**
- `accessToken` (JWT, vida curta ~15min)
- `refreshToken` (JWT, vida longa ~7 dias)

---

## Mock de Autenticação

### Credenciais de Teste

Todos os usuários usam a senha: `senha123`

| Email | Nome | 2FA | Status | Tipo 2FA |
|-------|------|-----|--------|----------|
| carlos.mendes@outdoorbrasil.com.br | Carlos Mendes | ✅ Sim | ACTIVE | TOTP |
| ana.silva@outdoorbrasil.com.br | Ana Silva | ❌ Não | ACTIVE | - |
| roberto.lima@outdoorbrasil.com.br | Roberto Lima | ❌ Não | ACTIVE | - |
| maria.santos@outdoorbrasil.com.br | Maria Santos | ❌ Não | INACTIVE | - |

### Código 2FA Mock

Para todos os usuários com 2FA habilitado, o código válido é:

```
123456
```

**Nota:** Na implementação real, este código será:
- Gerado pelo backend via TOTP (Google Authenticator)
- Enviado por email
- Enviado por SMS

---

## Segurança

### ✅ Implementado (Frontend Mock)

- Validação de email (regex)
- Validação de senha (mínimo 8 caracteres)
- Verificação de status do usuário (ACTIVE/INACTIVE)
- Fluxo de 2FA completo
- Show/hide password toggle
- Mensagens de erro genéricas (não expõem se email existe)

### 🔒 TODO (Backend Real)

- Hash de senha com bcrypt (bcrypt.compare)
- Rate limiting para prevenir brute force
- CSRF protection
- Tokens JWT assinados e validados
- Refresh token rotation
- IP whitelisting (opcional)
- Logging de tentativas de login
- Bloqueio temporário após X tentativas falhas

---

## Estados de Loading e Erro

### Loading States

**Durante login:**
```tsx
<button disabled={isLoading}>
  {isLoading ? 'Entrando...' : 'Entrar'}
</button>
```

**Durante verificação 2FA:**
```tsx
<button disabled={isLoading}>
  {isLoading ? 'Verificando...' : 'Confirmar código'}
</button>
```

### Error States

**Erro global:**
```tsx
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-sm text-red-700">{error}</p>
  </div>
)}
```

**Erro por campo:**
```tsx
{errors.email && (
  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
)}
```

---

## Próximos Passos

### Implementação Backend

Consulte o documento [LOGIN_API_INTEGRATION.md](./LOGIN_API_INTEGRATION.md) para:

1. Endpoints esperados
2. Payloads de request/response
3. Como substituir mocks por chamadas HTTP reais
4. Estrutura de JWT tokens
5. Refresh token flow

### Funcionalidades Futuras

- [ ] Recuperação de senha ("Esqueci minha senha")
- [ ] Configuração de 2FA (habilitar/desabilitar)
- [ ] Múltiplas sessões simultâneas
- [ ] Histórico de logins (lastLoginAt, lastLoginIp)
- [ ] Notificação de novo login por email
- [ ] Login social (Google, Microsoft)
- [ ] SSO (Single Sign-On) para empresas

---

## Testes de Fluxo

### ✅ Cenário 1: Login Bem-Sucedido (Sem 2FA)

1. Acessar `/login`
2. Inserir: `ana.silva@outdoorbrasil.com.br` / `senha123`
3. Clicar em "Entrar"
4. **Esperado:** Redireciona para `/dashboard`

### ✅ Cenário 2: Login Bem-Sucedido (Com 2FA)

1. Acessar `/login`
2. Inserir: `carlos.mendes@outdoorbrasil.com.br` / `senha123`
3. Clicar em "Entrar"
4. **Esperado:** Mostra tela de código 2FA
5. Inserir código: `123456`
6. Clicar em "Confirmar código"
7. **Esperado:** Redireciona para `/dashboard`

### ✅ Cenário 3: Credenciais Inválidas

1. Acessar `/login`
2. Inserir: `invalido@email.com` / `senhaerrada`
3. Clicar em "Entrar"
4. **Esperado:** Erro "Credenciais inválidas"

### ✅ Cenário 4: Usuário Inativo

1. Acessar `/login`
2. Inserir: `maria.santos@outdoorbrasil.com.br` / `senha123`
3. Clicar em "Entrar"
4. **Esperado:** Erro "Usuário inativo ou convite ainda não concluído."

### ✅ Cenário 5: Código 2FA Inválido

1. Fazer login com usuário com 2FA
2. Inserir código errado: `000000`
3. Clicar em "Confirmar código"
4. **Esperado:** Erro "Código inválido ou expirado. Tente novamente."

### ✅ Cenário 6: Logout

1. Estar logado no `/dashboard`
2. Clicar em "Sair" (header)
3. **Esperado:** Redireciona para `/login`

---

## Documentos Relacionados

- [SIGNUP_FLOW.md](./SIGNUP_FLOW.md) - Fluxo de cadastro
- [LOGIN_API_INTEGRATION.md](./LOGIN_API_INTEGRATION.md) - Integração com API
- Schema Prisma - Modelo de dados User

---

**Status:** ✅ Implementação completa e funcional em modo mock  
**Próximo:** Integração com API real conforme Infra.pdf
