# Integração com API - Login Flow

## Objetivo

Este documento descreve como substituir as funções mock por chamadas HTTP reais para integração com o backend descrito no documento **Infra.pdf**.

---

## Endpoints da API de Autenticação

### Base URL

```
https://api.oohmanager.com/v1
ou
http://localhost:3000/api
```

---

## 1. POST /auth/login

### Descrição
Autentica o usuário com email e senha. Retorna tokens se não houver 2FA, ou indica necessidade de 2FA.

### Request

**Endpoint:**
```
POST /auth/login
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```typescript
{
  email: string;       // E-mail do usuário
  password: string;    // Senha em texto plano (será hasheada no backend)
  rememberMe: boolean; // Se true, refresh token tem validade maior
}
```

**Exemplo:**
```json
{
  "email": "carlos.mendes@outdoorbrasil.com.br",
  "password": "senha123",
  "rememberMe": true
}
```

---

### Response (Sucesso - Sem 2FA)

**Status:** `200 OK`

**Body:**
```typescript
{
  success: true;
  requiresTwoFactor: false;
  user: {
    id: string;
    companyId: string;
    name: string;
    email: string;
    isSuperAdmin: boolean;
    status: 'ACTIVE' | 'INACTIVE';
    twoFactorEnabled: boolean;
    twoFactorType: 'TOTP' | 'EMAIL' | 'SMS' | null;
  };
  tokens: {
    accessToken: string;  // JWT, validade 15min
    refreshToken: string; // JWT, validade 7 dias (ou mais se rememberMe)
  };
}
```

---

### Response (Sucesso - Requer 2FA)

**Status:** `200 OK`

**Body:**
```typescript
{
  success: true;
  requiresTwoFactor: true;
  twoFactorType: 'TOTP' | 'EMAIL' | 'SMS';
  message: string; // Ex: "Código enviado para seu email"
}
```

**Nota:** Não retorna `user` nem `tokens` neste caso. O frontend deve:
1. Guardar o email em memória
2. Mostrar a tela de 2FA
3. Chamar `/auth/2fa/verify` em seguida

---

### Response (Erro - Credenciais Inválidas)

**Status:** `401 Unauthorized`

**Body:**
```json
{
  "success": false,
  "error": "Credenciais inválidas"
}
```

---

### Response (Erro - Usuário Inativo)

**Status:** `403 Forbidden`

**Body:**
```json
{
  "success": false,
  "error": "Usuário inativo ou convite ainda não concluído."
}
```

---

### Response (Erro - Rate Limit)

**Status:** `429 Too Many Requests`

**Body:**
```json
{
  "success": false,
  "error": "Muitas tentativas de login. Tente novamente em 15 minutos."
}
```

---

## 2. POST /auth/2fa/verify

### Descrição
Verifica o código de 6 dígitos enviado via TOTP/Email/SMS e completa o login.

### Request

**Endpoint:**
```
POST /auth/2fa/verify
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```typescript
{
  email: string;   // E-mail do usuário
  code: string;    // Código de 6 dígitos
}
```

**Exemplo:**
```json
{
  "email": "carlos.mendes@outdoorbrasil.com.br",
  "code": "123456"
}
```

---

### Response (Sucesso)

**Status:** `200 OK`

**Body:**
```typescript
{
  success: true;
  user: {
    id: string;
    companyId: string;
    name: string;
    email: string;
    isSuperAdmin: boolean;
    status: 'ACTIVE' | 'INACTIVE';
    twoFactorEnabled: boolean;
    twoFactorType: 'TOTP' | 'EMAIL' | 'SMS' | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
```

---

### Response (Erro - Código Inválido)

**Status:** `401 Unauthorized`

**Body:**
```json
{
  "success": false,
  "error": "Código inválido ou expirado. Tente novamente."
}
```

---

### Response (Erro - Código Expirado)

**Status:** `401 Unauthorized`

**Body:**
```json
{
  "success": false,
  "error": "Código expirado. Solicite um novo código."
}
```

---

## 3. POST /auth/refresh

### Descrição
Renova o access token usando o refresh token.

### Request

**Endpoint:**
```
POST /auth/refresh
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {refreshToken}"
}
```

**Body:**
```typescript
{
  refreshToken: string;
}
```

---

### Response (Sucesso)

**Status:** `200 OK`

**Body:**
```typescript
{
  success: true;
  tokens: {
    accessToken: string;  // Novo access token
    refreshToken: string; // Novo refresh token (rotation)
  };
}
```

---

### Response (Erro - Token Inválido)

**Status:** `401 Unauthorized`

**Body:**
```json
{
  "success": false,
  "error": "Refresh token inválido ou expirado."
}
```

---

## 4. POST /auth/logout

### Descrição
Invalida o refresh token do usuário.

### Request

**Endpoint:**
```
POST /auth/logout
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {accessToken}"
}
```

---

### Response (Sucesso)

**Status:** `200 OK`

**Body:**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso."
}
```

---

## Como Substituir os Mocks

### Arquivo: `/lib/mockAuth.ts`

#### Antes (Mock):

```typescript
export async function mockLogin(credentials: LoginCredentials): Promise<LoginResult> {
  await new Promise(resolve => setTimeout(resolve, 800));
  const user = mockUsersSettings.find(u => u.email === credentials.email);
  // ... validações em memória
}
```

#### Depois (API Real):

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function mockLogin(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: credentials.email,
      password: credentials.password,
      rememberMe: credentials.rememberMe,
    });

    const data = response.data;

    if (data.requiresTwoFactor) {
      return {
        user: null,
        tokens: null,
        requiresTwoFactor: true,
      };
    }

    return {
      user: data.user,
      tokens: data.tokens,
      requiresTwoFactor: false,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Erro ao fazer login');
    }
    throw new Error('Erro de conexão com o servidor');
  }
}

export async function mockVerifyTwoFactor(payload: TwoFactorPayload): Promise<LoginResult> {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/2fa/verify`, {
      email: payload.email,
      code: payload.code,
    });

    const data = response.data;

    return {
      user: data.user,
      tokens: data.tokens,
      requiresTwoFactor: false,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Erro ao verificar código');
    }
    throw new Error('Erro de conexão com o servidor');
  }
}
```

---

## Configuração de Variáveis de Ambiente

### Arquivo: `.env`

```bash
# API Base URL
VITE_API_BASE_URL=https://api.oohmanager.com/v1

# Ou para desenvolvimento local:
# VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Armazenamento de Tokens

### LocalStorage vs SessionStorage

**Recomendação:** Use `localStorage` para `rememberMe: true` e `sessionStorage` para `rememberMe: false`.

### Implementação no AuthContext

```typescript
const login = async (credentials: LoginCredentials) => {
  const result = await mockLogin(credentials);

  if (result.requiresTwoFactor) {
    setRequiresTwoFactor(true);
    setPendingEmail(credentials.email);
  } else {
    setUser(result.user);
    setTokens(result.tokens);

    // Persistir tokens
    const storage = credentials.rememberMe ? localStorage : sessionStorage;
    storage.setItem('accessToken', result.tokens!.accessToken);
    storage.setItem('refreshToken', result.tokens!.refreshToken);
    storage.setItem('user', JSON.stringify(result.user));

    navigate('/dashboard');
  }
};
```

### Carregar Sessão Ao Iniciar

```typescript
useEffect(() => {
  // Tentar recuperar sessão ao montar o AuthProvider
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

  if (accessToken && refreshToken && userStr) {
    setTokens({ accessToken, refreshToken });
    setUser(JSON.parse(userStr));
  }
}, []);
```

### Limpar Tokens no Logout

```typescript
const logout = () => {
  setUser(null);
  setTokens(null);
  
  // Limpar storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
  
  navigate('/login');
};
```

---

## Interceptor Axios para Refresh Token

### Configuração

Crie um arquivo `/lib/api.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor - adiciona access token
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  
  return config;
});

// Response interceptor - renova access token se expirado
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se 401 e não tentou renovar ainda
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Tentar renovar tokens
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;

        // Salvar novos tokens
        const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
        storage.setItem('accessToken', accessToken);
        storage.setItem('refreshToken', newRefreshToken);

        // Retentar request original
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh falhou - fazer logout
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Uso

```typescript
import api from './lib/api';

// GET request com autenticação automática
const response = await api.get('/campaigns');

// POST request
const response = await api.post('/campaigns', campaignData);
```

---

## Estrutura JWT (Tokens)

### Access Token (15 minutos)

```json
{
  "sub": "user-id-uuid",
  "companyId": "company-id-uuid",
  "email": "carlos.mendes@outdoorbrasil.com.br",
  "isSuperAdmin": false,
  "iat": 1638360000,
  "exp": 1638360900
}
```

### Refresh Token (7 dias)

```json
{
  "sub": "user-id-uuid",
  "type": "refresh",
  "iat": 1638360000,
  "exp": 1638964800
}
```

---

## Validação Backend (Referência)

### Schema Prisma: User

```prisma
model User {
  id                String       @id @default(uuid())
  companyId         String
  name              String
  email             String       @unique
  passwordHash      String
  status            UserStatus   @default(ACTIVE)
  isSuperAdmin      Boolean      @default(false)
  twoFactorEnabled  Boolean      @default(false)
  twoFactorType     TwoFactorType?
  twoFactorSecret   String?
  lastLoginAt       DateTime?
  lastLoginIp       String?
  
  company           Company      @relation(fields: [companyId], references: [id])
  
  @@index([companyId])
  @@index([email])
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum TwoFactorType {
  TOTP
  EMAIL
  SMS
}
```

### Fluxo Backend (POST /auth/login)

1. Receber `{ email, password, rememberMe }`
2. Buscar usuário por email
3. Verificar `bcrypt.compare(password, user.passwordHash)`
4. Validar `user.status === 'ACTIVE'`
5. Se `user.twoFactorEnabled`:
   - Gerar código 2FA (ou esperar TOTP do app)
   - Enviar código por email/SMS conforme `user.twoFactorType`
   - Retornar `{ requiresTwoFactor: true }`
6. Senão:
   - Gerar JWT tokens
   - Atualizar `user.lastLoginAt` e `user.lastLoginIp`
   - Retornar `{ user, tokens }`

---

## Segurança

### HTTPS Obrigatório em Produção

```typescript
if (import.meta.env.PROD && !API_BASE_URL.startsWith('https://')) {
  throw new Error('API deve usar HTTPS em produção');
}
```

### CSRF Protection

```typescript
// Em requests que mudam estado (POST, PUT, DELETE)
api.defaults.headers.common['X-CSRF-Token'] = getCsrfToken();
```

### Rate Limiting

Backend deve implementar:
- Máximo 5 tentativas de login por IP a cada 15 minutos
- Captcha após 3 tentativas falhas

---

## Testes de Integração

### Exemplo com Vitest + MSW (Mock Service Worker)

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;

    if (email === 'test@example.com' && password === 'senha123') {
      return res(
        ctx.json({
          success: true,
          requiresTwoFactor: false,
          user: { id: '1', email, name: 'Test User' },
          tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
        })
      );
    }

    return res(ctx.status(401), ctx.json({ error: 'Credenciais inválidas' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Checklist de Integração

- [ ] Substituir `mockLogin` por chamada HTTP real
- [ ] Substituir `mockVerifyTwoFactor` por chamada HTTP real
- [ ] Implementar interceptor Axios para refresh token
- [ ] Configurar variáveis de ambiente (`.env`)
- [ ] Implementar persistência de tokens (localStorage/sessionStorage)
- [ ] Implementar recuperação de sessão ao iniciar app
- [ ] Limpar tokens ao fazer logout
- [ ] Adicionar HTTPS check em produção
- [ ] Implementar tratamento de erros (401, 403, 429, 500)
- [ ] Testar fluxo completo com backend real

---

## Endpoints Relacionados (Futuro)

- `POST /auth/forgot-password` - Solicitar reset de senha
- `POST /auth/reset-password` - Confirmar reset com token
- `POST /auth/2fa/setup` - Configurar 2FA (gerar QR code TOTP)
- `POST /auth/2fa/enable` - Habilitar 2FA após validar código
- `POST /auth/2fa/disable` - Desabilitar 2FA
- `GET /auth/sessions` - Listar sessões ativas
- `DELETE /auth/sessions/:id` - Revogar sessão específica

---

**Status:** 📝 Documentação completa para integração  
**Próximo:** Implementar chamadas HTTP reais no `/lib/mockAuth.ts`
