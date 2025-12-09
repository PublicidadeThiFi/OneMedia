# Guia Definitivo de Integração Backend - OneMedia

## Índice

1. [Introdução](#1-introdução)
2. [Visão Geral de Módulos e Entidades](#2-visão-geral-de-módulos-e-entidades)
3. [Padrões Gerais de Integração](#3-padrões-gerais-de-integração)
4. [Mapeamento Detalhado por Módulo](#4-mapeamento-detalhado-por-módulo)
   - 4.1. [Auth / Usuário](#41-auth--usuário)
   - 4.2. [Empresa (Company)](#42-empresa-company)
   - 4.3. [Clientes](#43-clientes)
   - 4.4. [Inventário (Pontos de Mídia)](#44-inventário-pontos-de-mídia)
   - 4.5. [Produtos](#45-produtos)
   - 4.6. [Propostas](#46-propostas)
   - 4.7. [Campanhas e Reservas](#47-campanhas-e-reservas)
   - 4.8. [Financeiro](#48-financeiro)
   - 4.9. [Mensagens](#49-mensagens)
   - 4.10. [Atividades (Activity Log)](#410-atividades-activity-log)
   - 4.11. [Configurações e Assinatura](#411-configurações-e-assinatura)
5. [Checklists de Implementação](#5-checklists-de-implementação)
6. [Testes End-to-End](#6-testes-end-to-end)

---

## 1. Introdução

### 1.1. Objetivo do Guia

Este documento serve como **mapa definitivo de integração** entre o frontend React do OneMedia e o backend NestJS + Prisma + PostgreSQL. Ele mapeia:

- **Onde cada API será chamada** no frontend
- **Que arquivos e componentes serão modificados**
- **Quais endpoints serão consumidos** (método HTTP, URL, body, params)
- **Como os dados retornados serão usados** (contexts, states, hooks, forms)
- **Como substituir os mocks por chamadas reais**

### 1.2. Tecnologias

**Frontend:**
- React 18 + TypeScript
- Context API (AuthContext, CompanyContext)
- React Hook Form para formulários
- Tailwind CSS + Radix UI (shadcn/ui)
- Roteamento manual via Context (sem Next.js ou React Router)

**Backend:**
- NestJS
- Prisma ORM
- PostgreSQL
- JWT para autenticação
- Multipart/form-data para uploads

### 1.3. Conceitos Principais

**Multi-tenant:**
- Todas as entidades de negócio possuem `companyId`
- Usuário autenticado pertence a uma empresa (`User.companyId`)
- Backend deve filtrar dados automaticamente por `companyId` extraído do token JWT

**Contextos globais:**
- `AuthContext`: gerencia login, 2FA, logout, token JWT, usuário atual
- `CompanyContext`: empresa ativa do usuário, dados da empresa

**Roteamento:**
- Controlado por `App.tsx` (Context API)
- `MainApp.tsx` gerencia navegação entre módulos via `currentPage` state
- `Sidebar.tsx` chama `onNavigate('clients')` para trocar módulo

---

## 2. Visão Geral de Módulos e Entidades

### 2.1. Módulos Funcionais

| Módulo | Descrição | Entidades Principais |
|--------|-----------|---------------------|
| **Auth** | Login, 2FA, logout, sessão | `User`, `UserRole` |
| **Dashboard** | Visão geral de métricas | Agregações de várias entidades |
| **Inventário** | Gestão de pontos de mídia OOH/DOOH | `MediaPoint`, `MediaUnit`, `MediaPointOwner`, `MediaPointContract` |
| **Clientes** | CRM de clientes | `Client` |
| **Produtos** | Catálogo de produtos e serviços | `Product` |
| **Propostas** | Criação e gestão de propostas comerciais | `Proposal`, `ProposalItem` |
| **Campanhas** | Gestão de campanhas aprovadas | `Campaign`, `CampaignItem` |
| **Reservas** | Gestão de bloqueios de mídia | `Reservation` |
| **Financeiro** | Cobranças e fluxo de caixa | `BillingInvoice`, `CashTransaction`, `TransactionCategory` |
| **Mensagens** | Comunicação com clientes | `Message` |
| **Atividades** | Log de auditoria | `ActivityLog` |
| **Configurações** | Usuários, empresa, assinatura | `Company`, `User`, `PlatformSubscription`, `PlatformPlan` |

### 2.2. Entidades do Schema Prisma

**Principais modelos no schema:**

```typescript
// Usuários e empresa
Company, User, UserRole

// Inventário
MediaPoint, MediaUnit, MediaPointOwner, MediaPointContract

// Clientes e produtos
Client, Product

// Propostas e itens
Proposal, ProposalItem

// Campanhas e reservas
Campaign, CampaignItem, Reservation

// Financeiro
BillingInvoice, CashTransaction, TransactionCategory

// Assinatura plataforma
PlatformPlan, PlatformSubscription

// Auditoria e comunicação
ActivityLog, Message
```

---

## 3. Padrões Gerais de Integração

### 3.1. Cliente HTTP Central

**Arquivo:** `/lib/apiClient.ts` (criar se não existir)

**Estrutura proposta:**

```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Criar instância do axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT em todas as requisições
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros globalmente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado - fazer logout
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    
    // Logs e toast de erro podem ser adicionados aqui
    console.error('API Error:', error.response?.data || error.message);
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Uso nos componentes:**

```typescript
import apiClient from '../lib/apiClient';

// Exemplo de chamada
const response = await apiClient.get('/clients');
const clients = response.data;
```

### 3.2. Autenticação e Multi-tenant

**Token JWT:**
- Armazenado em `localStorage` após login bem-sucedido
- Incluído automaticamente em todas as requisições via interceptor
- Contém payload: `{ userId, companyId, email, roles }`

**Company ID:**
- Backend extrai `companyId` do token JWT decodificado
- Todas as queries Prisma filtram automaticamente por `companyId`
- Frontend **não precisa enviar** `companyId` explicitamente nas requisições (exceto casos especiais)

**Header de autenticação:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Refresh token:**
- Armazenado em `localStorage` (ou httpOnly cookie, se backend suportar)
- Usado para renovar `access_token` quando expirar
- Endpoint: `POST /api/auth/refresh`

### 3.3. Convenções de Endpoints REST

**Padrão geral para todas as entidades:**

| Operação | Método | Endpoint | Body | Resposta |
|----------|--------|----------|------|----------|
| Listar | `GET` | `/api/{resource}` | - | `{ data: T[], total: number }` |
| Listar com filtros | `GET` | `/api/{resource}?search=&status=&page=&pageSize=` | - | `{ data: T[], total: number }` |
| Buscar por ID | `GET` | `/api/{resource}/:id` | - | `T` |
| Criar | `POST` | `/api/{resource}` | `Partial<T>` | `T` |
| Atualizar | `PUT` | `/api/{resource}/:id` | `Partial<T>` | `T` |
| Deletar/Inativar | `DELETE` | `/api/{resource}/:id` | - | `{ success: true }` |

**Query params comuns:**

```typescript
interface ListQueryParams {
  search?: string;        // Busca textual livre
  status?: string;        // Filtro por status
  page?: number;          // Página atual (default: 1)
  pageSize?: number;      // Itens por página (default: 50)
  sortBy?: string;        // Campo de ordenação
  sortOrder?: 'asc' | 'desc'; // Ordem
  // Filtros específicos por recurso
}
```

**Exemplo de resposta paginada:**

```json
{
  "data": [...],
  "total": 245,
  "page": 1,
  "pageSize": 50,
  "totalPages": 5
}
```

### 3.4. Estratégia de Substituição de Mocks

**Arquivos de mock atuais:**
- `/lib/mockData.ts` - dados de clientes, propostas, campanhas
- `/lib/mockDataCentral.ts` - dados centrais (company, users, media points)
- `/lib/mockDataFinance.ts` - dados financeiros
- `/lib/mockAuth.ts` - autenticação mock
- `/lib/mockDataDashboard.ts` - métricas dashboard
- `/lib/mockDataMessages.ts` - mensagens
- `/lib/mockDataSettings.ts` - configurações

**Processo de substituição (passo a passo):**

1. **Identificar a função mock**
   - Ex: `mockClients` em `/lib/mockData.ts`

2. **Criar hook customizado para API**
   - Criar `/hooks/useClients.ts`:
   
   ```typescript
   import { useState, useEffect } from 'react';
   import apiClient from '../lib/apiClient';
   import { Client } from '../types';

   export function useClients() {
     const [clients, setClients] = useState<Client[]>([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<Error | null>(null);

     const fetchClients = async (filters?: any) => {
       try {
         setLoading(true);
         const response = await apiClient.get('/clients', { params: filters });
         setClients(response.data.data || response.data);
       } catch (err) {
         setError(err as Error);
       } finally {
         setLoading(false);
       }
     };

     const createClient = async (data: Partial<Client>) => {
       const response = await apiClient.post('/clients', data);
       setClients(prev => [...prev, response.data]);
       return response.data;
     };

     const updateClient = async (id: string, data: Partial<Client>) => {
       const response = await apiClient.put(`/clients/${id}`, data);
       setClients(prev => prev.map(c => c.id === id ? response.data : c));
       return response.data;
     };

     const deleteClient = async (id: string) => {
       await apiClient.delete(`/clients/${id}`);
       setClients(prev => prev.filter(c => c.id !== id));
     };

     useEffect(() => {
       fetchClients();
     }, []);

     return {
       clients,
       loading,
       error,
       fetchClients,
       createClient,
       updateClient,
       deleteClient,
     };
   }
   ```

3. **Atualizar componente para usar o hook**
   - Em `/components/Clients.tsx`:
   
   ```typescript
   // ANTES (mock):
   import { mockClients } from '../lib/mockData';
   const [clients, setClients] = useState<Client[]>(mockClients);

   // DEPOIS (API):
   import { useClients } from '../hooks/useClients';
   const { clients, loading, createClient, updateClient } = useClients();
   ```

4. **Ajustar handlers de eventos**
   
   ```typescript
   // ANTES:
   const handleSaveClient = (data: Partial<Client>) => {
     if (editingClient) {
       setClients(prev => prev.map(c => c.id === editingClient.id ? {...c, ...data} : c));
     } else {
       setClients(prev => [...prev, data as Client]);
     }
   };

   // DEPOIS:
   const handleSaveClient = async (data: Partial<Client>) => {
     try {
       if (editingClient) {
         await updateClient(editingClient.id, data);
         toast.success('Cliente atualizado!');
       } else {
         await createClient(data);
         toast.success('Cliente criado!');
       }
     } catch (error) {
       toast.error('Erro ao salvar cliente');
       console.error(error);
     }
   };
   ```

5. **Adicionar estados de loading/error no componente**

   ```tsx
   {loading && <div>Carregando...</div>}
   {error && <div>Erro: {error.message}</div>}
   {!loading && <ClientsTable clients={clients} />}
   ```

6. **Manter mocks para Storybook/testes (opcional)**
   - Criar arquivo `/lib/mockData.stories.ts` apenas para Storybook
   - Manter funções mock isoladas para testes unitários

---

## 4. Mapeamento Detalhado por Módulo

---

## 4.1. Auth / Usuário

### 4.1.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/contexts/AuthContext.tsx` | Gerencia estado global de autenticação |
| `/lib/mockAuth.ts` | Mock atual de login/2FA (será substituído) |
| `/pages/login.tsx` | Página de login |
| `/components/login/LoginForm.tsx` | Formulário de login |
| `/components/login/TwoFactorStep.tsx` | Verificação 2FA |

### 4.1.2. Endpoints de Autenticação

#### **POST /api/auth/login**

**Descrição:** Realiza login com email e senha

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (sem 2FA):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "João Silva",
    "companyId": "company-456",
    "isSuperAdmin": false,
    "twoFactorEnabled": false
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Response (com 2FA habilitado):**
```json
{
  "requiresTwoFactor": true,
  "email": "user@example.com"
}
```

**Onde integrar:**
- **Arquivo:** `/contexts/AuthContext.tsx`
- **Função:** `login()`

**Código atual (mock):**
```typescript
const login = async (credentials: LoginCredentials) => {
  const result = await mockLogin(credentials); // <-- Substituir aqui
  // ...
};
```

**Código integrado:**
```typescript
import apiClient from '../lib/apiClient';

const login = async (credentials: LoginCredentials) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    const result = response.data;

    if (result.requiresTwoFactor) {
      setRequiresTwoFactor(true);
      setPendingEmail(credentials.email);
    } else {
      // Armazenar tokens
      localStorage.setItem('access_token', result.tokens.accessToken);
      localStorage.setItem('refresh_token', result.tokens.refreshToken);
      
      setUser(result.user);
      setTokens(result.tokens);
      setRequiresTwoFactor(false);
      setPendingEmail(null);
      
      navigate('/app');
    }
  } catch (error: any) {
    const message = error.response?.data?.message || 'Erro ao fazer login';
    toast.error(message);
    throw error;
  }
};
```

---

#### **POST /api/auth/verify-2fa**

**Descrição:** Verifica código 2FA (TOTP, EMAIL ou SMS)

**Request body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "João Silva",
    "companyId": "company-456"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Onde integrar:**
- **Arquivo:** `/contexts/AuthContext.tsx`
- **Função:** `verifyTwoFactor()`

**Código integrado:**
```typescript
const verifyTwoFactor = async (payload: TwoFactorPayload) => {
  try {
    const response = await apiClient.post('/auth/verify-2fa', payload);
    const result = response.data;

    if (result.user && result.tokens) {
      localStorage.setItem('access_token', result.tokens.accessToken);
      localStorage.setItem('refresh_token', result.tokens.refreshToken);
      
      setUser(result.user);
      setTokens(result.tokens);
      setRequiresTwoFactor(false);
      setPendingEmail(null);
      
      navigate('/app');
    }
  } catch (error: any) {
    toast.error('Código inválido');
    throw error;
  }
};
```

---

#### **POST /api/auth/refresh**

**Descrição:** Renova access token usando refresh token

**Request body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Onde integrar:**
- **Arquivo:** `/lib/apiClient.ts`
- **Uso:** Interceptor de resposta 401

**Código integrado:**
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh falhou - fazer logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

#### **GET /api/auth/me**

**Descrição:** Retorna dados do usuário autenticado (com base no token)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "João Silva",
  "companyId": "company-456",
  "phone": "11987654321",
  "isSuperAdmin": false,
  "twoFactorEnabled": true,
  "twoFactorType": "TOTP",
  "status": "ACTIVE",
  "roles": ["COMERCIAL", "FINANCEIRO"],
  "company": {
    "id": "company-456",
    "name": "Outdoor Mídia Digital",
    "cnpj": "12.345.678/0001-90"
  }
}
```

**Onde integrar:**
- **Arquivo:** `/contexts/AuthContext.tsx`
- **Função:** Criar `loadUser()` para ser chamada no mount do `AuthProvider`

**Código integrado:**
```typescript
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar usuário ao montar (se token existir)
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        localStorage.removeItem('access_token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // ...resto do código
}
```

---

#### **POST /api/auth/logout**

**Descrição:** Invalida refresh token (opcional, se backend mantiver lista de tokens válidos)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true
}
```

**Onde integrar:**
- **Arquivo:** `/contexts/AuthContext.tsx`
- **Função:** `logout()`

**Código integrado:**
```typescript
const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  } finally {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  }
};
```

---

## 4.2. Empresa (Company)

### 4.2.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/contexts/CompanyContext.tsx` | Gerencia dados da empresa atual |
| `/lib/mockDataCentral.ts` | Mock `getCurrentCompany()`, `updateCompany()` |
| `/components/settings/CompanySettings.tsx` | Formulário de configurações da empresa |

### 4.2.2. Endpoints de Empresa

#### **GET /api/company**

**Descrição:** Retorna dados da empresa do usuário autenticado

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "company-456",
  "name": "Outdoor Mídia Digital",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@outdoormidia.com.br",
  "phone": "11987654321",
  "site": "https://outdoormidia.com.br",
  "logoUrl": "https://...",
  "primaryColor": "#4F46E5",
  "addressZipcode": "01310-100",
  "addressStreet": "Avenida Paulista",
  "addressNumber": "1578",
  "addressDistrict": "Bela Vista",
  "addressCity": "São Paulo",
  "addressState": "SP",
  "addressCountry": "Brasil",
  "defaultProposalNotes": "Obrigado pela preferência!",
  "planId": "plan-003",
  "pointsLimit": 150,
  "storageLimitMb": 5000,
  "usersLimit": 10,
  "subscriptionStatus": "TRIAL",
  "trialEndsAt": "2025-01-15T00:00:00.000Z"
}
```

**Onde integrar:**
- **Arquivo:** `/contexts/CompanyContext.tsx`

**Código integrado:**
```typescript
import apiClient from '../lib/apiClient';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const response = await apiClient.get('/company');
        setCompany(response.data);
      } catch (error) {
        console.error('Erro ao carregar empresa:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, []);

  // ...
}
```

---

#### **PUT /api/company**

**Descrição:** Atualiza dados da empresa

**Headers:** `Authorization: Bearer <token>`

**Request body:**
```json
{
  "name": "Outdoor Mídia Digital Ltda",
  "phone": "11987654322",
  "primaryColor": "#3B82F6",
  "defaultProposalNotes": "Agradecemos a preferência!"
}
```

**Response:**
```json
{
  "id": "company-456",
  "name": "Outdoor Mídia Digital Ltda",
  "phone": "11987654322",
  "primaryColor": "#3B82F6",
  ...
}
```

**Onde integrar:**
- **Arquivo:** `/components/settings/CompanySettings.tsx`

**Código integrado:**
```typescript
const handleSave = async (data: Partial<Company>) => {
  try {
    const response = await apiClient.put('/company', data);
    // Atualizar CompanyContext
    setCompany(response.data);
    toast.success('Dados da empresa atualizados!');
  } catch (error) {
    toast.error('Erro ao atualizar empresa');
  }
};
```

---

#### **POST /api/company/logo**

**Descrição:** Upload da logo da empresa

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request body (FormData):**
```javascript
const formData = new FormData();
formData.append('file', logoFile);
```

**Response:**
```json
{
  "logoUrl": "https://storage.example.com/companies/company-456/logo.png"
}
```

**Onde integrar:**
- **Arquivo:** `/components/settings/CompanySettings.tsx`
- **Componente:** Input de upload de logo

**Código integrado:**
```typescript
const handleLogoUpload = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setCompany(prev => prev ? { ...prev, logoUrl: response.data.logoUrl } : null);
    toast.success('Logo atualizada!');
  } catch (error) {
    toast.error('Erro ao fazer upload da logo');
  }
};
```

---

## 4.3. Clientes

### 4.3.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Clients.tsx` | Página principal de clientes |
| `/components/clients/ClientsTable.tsx` | Tabela de listagem |
| `/components/clients/ClientFormDialog.tsx` | Formulário de cadastro/edição |
| `/components/clients/ClientDetailsDrawer.tsx` | Drawer de detalhes do cliente |
| `/components/clients/ClientFiltersBar.tsx` | Barra de filtros |
| `/lib/mockData.ts` | Mock `mockClients` |

### 4.3.2. Endpoints de Clientes

#### **GET /api/clients**

**Descrição:** Lista clientes da empresa com filtros e paginação

**Query params:**
```typescript
{
  search?: string;        // Busca em nome, empresa, email, telefone, CNPJ
  status?: ClientStatus;  // LEAD | PROSPECT | CLIENTE | INATIVO
  ownerUserId?: string;   // Filtrar por responsável
  page?: number;
  pageSize?: number;
  sortBy?: string;        // ex: 'contactName', 'createdAt'
  sortOrder?: 'asc' | 'desc';
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "client-001",
      "companyId": "company-456",
      "contactName": "Maria Silva",
      "email": "maria@example.com",
      "phone": "11987654321",
      "companyName": "Empresa XYZ Ltda",
      "cnpj": "12.345.678/0001-90",
      "role": "Gerente de Marketing",
      "addressCity": "São Paulo",
      "addressState": "SP",
      "status": "CLIENTE",
      "origin": "Indicação",
      "notes": "Cliente preferencial",
      "ownerUserId": "user-123",
      "createdAt": "2024-11-15T10:30:00.000Z",
      "updatedAt": "2024-12-01T14:20:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 50,
  "totalPages": 3
}
```

**Onde integrar:**
- **Arquivo:** `/components/Clients.tsx`
- **Criar hook:** `/hooks/useClients.ts`

**Hook:**
```typescript
// /hooks/useClients.ts
import { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { Client, ClientStatus } from '../types';

interface UseClientsParams {
  search?: string;
  status?: string;
  ownerUserId?: string;
  page?: number;
  pageSize?: number;
}

export function useClients(params: UseClientsParams = {}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/clients', { params });
      
      setClients(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [params.search, params.status, params.ownerUserId, params.page]);

  return {
    clients,
    total,
    loading,
    error,
    refetch: fetchClients,
  };
}
```

**Uso no componente:**
```typescript
// /components/Clients.tsx
import { useClients } from '../hooks/useClients';

export function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { clients, total, loading, error, refetch } = useClients({
    search: searchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    pageSize: 50,
  });

  // ...resto do código
}
```

---

#### **GET /api/clients/:id**

**Descrição:** Busca cliente por ID

**Response:**
```json
{
  "id": "client-001",
  "contactName": "Maria Silva",
  "email": "maria@example.com",
  ...
}
```

**Onde integrar:**
- **Arquivo:** `/components/clients/ClientDetailsDrawer.tsx`

---

#### **POST /api/clients**

**Descrição:** Cria novo cliente

**Request body:**
```json
{
  "contactName": "João Oliveira",
  "email": "joao@example.com",
  "phone": "11987654321",
  "companyName": "Empresa ABC",
  "cnpj": "98.765.432/0001-10",
  "role": "Diretor",
  "addressZipcode": "01310-100",
  "addressStreet": "Av. Paulista",
  "addressNumber": "1000",
  "addressDistrict": "Bela Vista",
  "addressCity": "São Paulo",
  "addressState": "SP",
  "addressCountry": "Brasil",
  "status": "LEAD",
  "origin": "Site",
  "notes": "",
  "ownerUserId": "user-123"
}
```

**Response:**
```json
{
  "id": "client-new-001",
  "contactName": "João Oliveira",
  ...
  "createdAt": "2024-12-09T10:00:00.000Z",
  "updatedAt": "2024-12-09T10:00:00.000Z"
}
```

**Onde integrar:**
- **Arquivo:** `/components/clients/ClientFormDialog.tsx`
- **Função:** `handleSubmit` do formulário

**Código integrado:**
```typescript
// /components/clients/ClientFormDialog.tsx
import { useForm } from 'react-hook-form@7.55.0';
import apiClient from '../../lib/apiClient';

export function ClientFormDialog({ client, open, onOpenChange, onSave }: Props) {
  const form = useForm<Client>({
    defaultValues: client || {...},
  });

  const handleSubmit = async (data: Partial<Client>) => {
    try {
      let savedClient: Client;
      
      if (client?.id) {
        // Editar
        const response = await apiClient.put(`/clients/${client.id}`, data);
        savedClient = response.data;
        toast.success('Cliente atualizado!');
      } else {
        // Criar
        const response = await apiClient.post('/clients', data);
        savedClient = response.data;
        toast.success('Cliente criado!');
      }

      onSave(savedClient);
      onOpenChange(false);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao salvar cliente';
      toast.error(message);
    }
  };

  // ...
}
```

---

#### **PUT /api/clients/:id**

**Descrição:** Atualiza cliente existente

**Request body:** Mesma estrutura do POST

**Response:** Cliente atualizado

**Onde integrar:** Mesmo local do POST (vide código acima)

---

#### **DELETE /api/clients/:id**

**Descrição:** Inativa ou exclui cliente (soft delete ou hard delete conforme backend)

**Response:**
```json
{
  "success": true
}
```

**Onde integrar:**
- **Arquivo:** `/components/Clients.tsx`
- **Função:** `handleDeleteClient`

**Código integrado:**
```typescript
const handleDeleteClient = async (clientId: string) => {
  if (!confirm('Deseja realmente excluir este cliente?')) return;

  try {
    await apiClient.delete(`/clients/${clientId}`);
    toast.success('Cliente excluído!');
    refetch(); // Recarregar lista
  } catch (error) {
    toast.error('Erro ao excluir cliente');
  }
};
```

---

#### **POST /api/clients/:id/documents**

**Descrição:** Upload de documentos do cliente

**Headers:** `Content-Type: multipart/form-data`

**Request body (FormData):**
```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('documentType', 'CONTRATO'); // ou outro tipo
```

**Response:**
```json
{
  "id": "doc-001",
  "clientId": "client-001",
  "fileName": "contrato.pdf",
  "fileUrl": "https://storage.../contrato.pdf",
  "documentType": "CONTRATO",
  "uploadedAt": "2024-12-09T10:00:00.000Z"
}
```

**Onde integrar:**
- **Arquivo:** `/components/clients/ClientDocumentsSection.tsx`

---

## 4.4. Inventário (Pontos de Mídia)

### 4.4.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Inventory.tsx` | Página principal de inventário |
| `/components/inventory/MediaPointFormDialog.tsx` | Formulário de ponto de mídia |
| `/components/inventory/MediaUnitsDialog.tsx` | CRUD de faces/telas de um ponto |
| `/components/inventory/MediaPointOwnersDialog.tsx` | CRUD de proprietários/locadores |
| `/components/inventory/MediaPointContractsDialog.tsx` | Upload/gestão de contratos PDF |
| `/lib/mockDataCentral.ts` | Mock `getMediaPoints()`, `getMediaUnitsForPoint()` |

### 4.4.2. Endpoints de Pontos de Mídia (MediaPoint)

#### **GET /api/media-points**

**Descrição:** Lista pontos de mídia com filtros

**Query params:**
```typescript
{
  search?: string;        // Busca em nome, endereço, subcategoria
  type?: MediaType;       // OOH | DOOH
  city?: string;
  state?: string;
  showInMediaKit?: boolean;
  page?: number;
  pageSize?: number;
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "mp-001",
      "companyId": "company-456",
      "type": "OOH",
      "subcategory": "Painel",
      "name": "Painel Av. Paulista 1000",
      "description": "Ponto estratégico em frente ao metrô",
      "addressZipcode": "01310-100",
      "addressStreet": "Av. Paulista",
      "addressNumber": "1000",
      "addressDistrict": "Bela Vista",
      "addressCity": "São Paulo",
      "addressState": "SP",
      "addressCountry": "Brasil",
      "latitude": -23.561684,
      "longitude": -46.655981,
      "dailyImpressions": 50000,
      "socialClasses": ["A", "B"],
      "environment": "Via pública",
      "showInMediaKit": true,
      "basePriceMonth": 5000.00,
      "basePriceWeek": 1500.00,
      "basePriceDay": 300.00,
      "mainImageUrl": "https://storage.../ponto-001.jpg",
      "productionCosts": {
        "lona": 800.00,
        "adesivo": 500.00,
        "vinil": 600.00,
        "montagem": 400.00
      },
      "createdAt": "2024-11-01T10:00:00.000Z",
      "updatedAt": "2024-12-01T10:00:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "pageSize": 50
}
```

**Onde integrar:**
- **Arquivo:** `/components/Inventory.tsx`
- **Hook:** `/hooks/useMediaPoints.ts`

---

#### **GET /api/media-points/:id**

**Descrição:** Busca ponto de mídia por ID (com unidades e proprietários)

**Response:**
```json
{
  "id": "mp-001",
  "name": "Painel Av. Paulista 1000",
  ...,
  "units": [
    {
      "id": "unit-001",
      "unitType": "FACE",
      "label": "Face A",
      "widthM": 9.0,
      "heightM": 3.0,
      "imageUrl": "https://storage.../face-a.jpg",
      "priceMonth": 2500.00,
      "isActive": true
    }
  ],
  "owners": [
    {
      "id": "owner-001",
      "ownerName": "DER/SP",
      "regime": "DER",
      "derMonthlyFee": 1200.00,
      "rentPeriodicity": "MENSAL",
      "fixedExpenseDueDay": 10
    }
  ]
}
```

---

#### **POST /api/media-points**

**Descrição:** Cria novo ponto de mídia

**Request body:**
```json
{
  "type": "OOH",
  "subcategory": "Painel",
  "name": "Painel Marginal Pinheiros km 5",
  "description": "",
  "addressZipcode": "05508-000",
  "addressStreet": "Marginal Pinheiros",
  "addressNumber": "5000",
  "addressCity": "São Paulo",
  "addressState": "SP",
  "addressCountry": "Brasil",
  "latitude": -23.567890,
  "longitude": -46.690123,
  "dailyImpressions": 80000,
  "socialClasses": ["A", "B", "C"],
  "environment": "Via expressa",
  "showInMediaKit": true,
  "basePriceMonth": 8000.00,
  "productionCosts": {
    "lona": 1200.00,
    "montagem": 600.00
  }
}
```

**Response:** MediaPoint criado

**Onde integrar:**
- **Arquivo:** `/components/inventory/MediaPointFormDialog.tsx`

---

#### **PUT /api/media-points/:id**

**Descrição:** Atualiza ponto de mídia

**Request body:** Mesma estrutura do POST

---

#### **DELETE /api/media-points/:id**

**Descrição:** Exclui ponto de mídia (verifica se não há reservas/campanhas ativas)

---

#### **POST /api/media-points/:id/image**

**Descrição:** Upload da imagem principal do ponto

**Headers:** `Content-Type: multipart/form-data`

**Request body (FormData):**
```javascript
const formData = new FormData();
formData.append('file', imageFile);
```

**Response:**
```json
{
  "mainImageUrl": "https://storage.../media-points/mp-001/main.jpg"
}
```

**Onde integrar:**
- **Arquivo:** `/components/inventory/MediaPointFormDialog.tsx`
- **Componente:** Input de upload de imagem

---

### 4.4.3. Endpoints de Unidades de Mídia (MediaUnit)

#### **GET /api/media-points/:mediaPointId/units**

**Descrição:** Lista unidades (faces/telas) de um ponto

**Response:**
```json
[
  {
    "id": "unit-001",
    "companyId": "company-456",
    "mediaPointId": "mp-001",
    "unitType": "FACE",
    "label": "Face A",
    "orientation": "FLUXO",
    "widthM": 9.0,
    "heightM": 3.0,
    "priceMonth": 2500.00,
    "priceWeek": 750.00,
    "priceDay": 150.00,
    "imageUrl": "https://storage.../units/unit-001.jpg",
    "isActive": true,
    "createdAt": "2024-11-01T10:00:00.000Z"
  }
]
```

**Onde integrar:**
- **Arquivo:** `/components/inventory/MediaUnitsDialog.tsx`

---

#### **POST /api/media-points/:mediaPointId/units**

**Descrição:** Cria nova unidade (face/tela) em um ponto

**Request body:**
```json
{
  "unitType": "FACE",
  "label": "Face B",
  "orientation": "CONTRA_FLUXO",
  "widthM": 9.0,
  "heightM": 3.0,
  "priceMonth": 2200.00,
  "isActive": true
}
```

**Response:** MediaUnit criada

---

#### **PUT /api/media-units/:id**

**Descrição:** Atualiza unidade existente

---

#### **DELETE /api/media-units/:id**

**Descrição:** Exclui unidade (verifica reservas)

---

#### **POST /api/media-units/:id/image**

**Descrição:** Upload de imagem específica da face/tela

**Response:**
```json
{
  "imageUrl": "https://storage.../units/unit-001.jpg"
}
```

**Onde integrar:**
- **Arquivo:** `/components/inventory/MediaUnitsDialog.tsx`
- **Componente:** Campo de upload de imagem da face

---

### 4.4.4. Endpoints de Proprietários (MediaPointOwner)

#### **GET /api/media-points/:id/owners**

**Descrição:** Lista proprietários/locadores de um ponto

**Response:**
```json
[
  {
    "id": "owner-001",
    "companyId": "company-456",
    "mediaPointId": "mp-001",
    "ownerName": "DER/SP",
    "ownerDocument": "12.345.678/0001-90",
    "ownerPhone": "1133334444",
    "regime": "DER",
    "derMonthlyFee": 1200.00,
    "rentValue": null,
    "rentPeriodicity": "MENSAL",
    "fixedExpenseDueDay": 10,
    "notes": "Pagamento via boleto DER",
    "createdAt": "2024-11-01T10:00:00.000Z"
  },
  {
    "id": "owner-002",
    "ownerName": "Imobiliária XYZ",
    "regime": "AREA_PARTICULAR",
    "rentValue": 800.00,
    "rentPeriodicity": "MENSAL",
    "fixedExpenseDueDay": 5
  }
]
```

**Onde integrar:**
- **Arquivo:** `/components/inventory/MediaPointOwnersDialog.tsx`

---

#### **POST /api/media-points/:id/owners**

**Descrição:** Adiciona proprietário/locador ao ponto

**Request body:**
```json
{
  "ownerName": "Prefeitura de São Paulo",
  "ownerDocument": "46.395.000/0001-39",
  "ownerPhone": "1133221100",
  "regime": "ADMIN_PUBLICA",
  "derMonthlyFee": 2000.00,
  "rentPeriodicity": "MENSAL",
  "fixedExpenseDueDay": 15,
  "notes": "Contrato renovado anualmente"
}
```

**Response:** MediaPointOwner criado

---

#### **PUT /api/media-point-owners/:id**

**Descrição:** Atualiza proprietário

---

#### **DELETE /api/media-point-owners/:id**

**Descrição:** Remove proprietário do ponto

---

### 4.4.5. Endpoints de Contratos (MediaPointContract)

#### **GET /api/media-points/:id/contracts**

**Descrição:** Lista contratos (PDFs) de um ponto

**Response:**
```json
[
  {
    "id": "contract-001",
    "companyId": "company-456",
    "mediaPointId": "mp-001",
    "fileName": "contrato_der_2024.pdf",
    "fileUrl": "https://storage.../contracts/contract-001.pdf",
    "description": "Contrato DER/SP renovação 2024",
    "uploadedAt": "2024-11-01T10:00:00.000Z"
  }
]
```

**Onde integrar:**
- **Arquivo:** `/components/inventory/MediaPointContractsDialog.tsx`

---

#### **POST /api/media-points/:id/contracts**

**Descrição:** Upload de contrato (PDF)

**Headers:** `Content-Type: multipart/form-data`

**Request body (FormData):**
```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('description', 'Contrato de locação 2024');
```

**Response:**
```json
{
  "id": "contract-002",
  "fileName": "contrato_locacao_2024.pdf",
  "fileUrl": "https://storage.../contracts/contract-002.pdf",
  "description": "Contrato de locação 2024",
  "uploadedAt": "2024-12-09T10:00:00.000Z"
}
```

**Onde integrar:**
- **Arquivo:** `/components/inventory/MediaPointContractsDialog.tsx`
- **Componente:** Input de upload de arquivo

**Código integrado:**
```typescript
const handleUploadContract = async (file: File, description: string) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);

    const response = await apiClient.post(
      `/media-points/${mediaPointId}/contracts`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    setContracts(prev => [...prev, response.data]);
    toast.success('Contrato enviado!');
  } catch (error) {
    toast.error('Erro ao enviar contrato');
  }
};
```

---

#### **GET /api/media-point-contracts/:id/download**

**Descrição:** Download de contrato

**Response:** Stream do arquivo PDF

**Onde integrar:**
- **Arquivo:** `/components/inventory/MediaPointContractsDialog.tsx`
- **Botão:** "Baixar" ou "Visualizar"

**Código integrado:**
```typescript
const handleDownloadContract = async (contractId: string, fileName: string) => {
  try {
    const response = await apiClient.get(
      `/media-point-contracts/${contractId}/download`,
      { responseType: 'blob' }
    );

    // Criar link de download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    toast.error('Erro ao baixar contrato');
  }
};
```

---

#### **DELETE /api/media-point-contracts/:id**

**Descrição:** Exclui contrato

---

## 4.5. Produtos

### 4.5.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Products.tsx` | Página principal de produtos |
| `/components/products/ProductFormDialog.tsx` | Formulário de produto |
| `/components/products/ProductsGrid.tsx` | Grid de listagem |
| `/lib/mockData.ts` | Mock `mockProducts` |

### 4.5.2. Endpoints de Produtos

#### **GET /api/products**

**Descrição:** Lista produtos e serviços

**Query params:**
```typescript
{
  search?: string;
  type?: ProductType;     // PRODUTO | SERVICO
  category?: string;
  isAdditional?: boolean; // true para produtos adicionais
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "prod-001",
      "companyId": "company-456",
      "name": "Instalação Padrão",
      "description": "Instalação de lona em painel",
      "category": "Serviços",
      "type": "SERVICO",
      "priceType": "UNITARIO",
      "basePrice": 400.00,
      "isAdditional": true,
      "createdAt": "2024-11-01T10:00:00.000Z"
    }
  ],
  "total": 25
}
```

**Onde integrar:**
- **Arquivo:** `/components/Products.tsx`

---

#### **POST /api/products**

**Descrição:** Cria novo produto/serviço

**Request body:**
```json
{
  "name": "Troca de Lona Emergencial",
  "description": "Serviço de troca em até 24h",
  "category": "Serviços",
  "type": "SERVICO",
  "priceType": "UNITARIO",
  "basePrice": 600.00,
  "isAdditional": true
}
```

---

#### **PUT /api/products/:id**

**Descrição:** Atualiza produto

---

#### **DELETE /api/products/:id**

**Descrição:** Exclui produto (verifica se não está em uso)

---

## 4.6. Propostas

### 4.6.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Proposals.tsx` | Página principal de propostas |
| `/components/proposals/ProposalFormWizard.tsx` | Wizard de criação de proposta |
| `/components/proposals/ProposalStep1General.tsx` | Passo 1: dados gerais |
| `/components/proposals/ProposalStep2Items.tsx` | Passo 2: itens da proposta |
| `/components/proposals/ProposalItemsEditor.tsx` | Editor de itens |
| `/components/proposals/ProposalsTable.tsx` | Tabela de listagem |
| `/components/proposals/ProposalDetailsDrawer.tsx` | Drawer de detalhes |
| `/components/proposals/ClientSelect.tsx` | Seletor de cliente |
| `/lib/mockData.ts` | Mock `mockProposals` |

### 4.6.2. Endpoints de Propostas

#### **GET /api/proposals**

**Descrição:** Lista propostas com filtros avançados

**Query params:**
```typescript
{
  search?: string;
  status?: ProposalStatus | ProposalStatus[];  // RASCUNHO | ENVIADA | APROVADA | etc.
  clientId?: string;
  responsibleUserId?: string;
  createdFrom?: string;   // ISO date
  createdTo?: string;
  page?: number;
  pageSize?: number;
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "prop-001",
      "companyId": "company-456",
      "clientId": "client-001",
      "responsibleUserId": "user-123",
      "title": "Campanha Verão 2025",
      "status": "ENVIADA",
      "totalAmount": 15000.00,
      "discountAmount": 1500.00,
      "discountPercent": 10,
      "conditionsText": "Pagamento em 3x sem juros",
      "validUntil": "2025-01-15T23:59:59.000Z",
      "publicHash": "abc123def456",
      "createdAt": "2024-12-01T10:00:00.000Z",
      "updatedAt": "2024-12-05T14:30:00.000Z",
      "client": {
        "id": "client-001",
        "contactName": "Maria Silva",
        "companyName": "Empresa XYZ"
      },
      "items": [
        {
          "id": "item-001",
          "mediaUnitId": "unit-001",
          "productId": null,
          "description": "Painel Av. Paulista - Face A",
          "startDate": "2025-01-01T00:00:00.000Z",
          "endDate": "2025-01-31T23:59:59.000Z",
          "quantity": 1,
          "unitPrice": 2500.00,
          "totalPrice": 2500.00
        },
        {
          "id": "item-002",
          "mediaUnitId": null,
          "productId": "prod-001",
          "description": "Instalação Padrão",
          "quantity": 1,
          "unitPrice": 400.00,
          "totalPrice": 400.00
        }
      ]
    }
  ],
  "total": 78
}
```

**Onde integrar:**
- **Arquivo:** `/components/Proposals.tsx`

---

#### **GET /api/proposals/:id**

**Descrição:** Busca proposta por ID (com itens, cliente, etc.)

---

#### **POST /api/proposals**

**Descrição:** Cria nova proposta

**Request body:**
```json
{
  "clientId": "client-001",
  "responsibleUserId": "user-123",
  "title": "Campanha Black Friday",
  "status": "RASCUNHO",
  "conditionsText": "Pagamento à vista com 5% de desconto",
  "validUntil": "2024-12-20T23:59:59.000Z",
  "discountPercent": 5,
  "items": [
    {
      "mediaUnitId": "unit-005",
      "description": "Painel Shopping Center - Tela Digital",
      "startDate": "2024-11-20",
      "endDate": "2024-11-30",
      "quantity": 1,
      "unitPrice": 3500.00,
      "totalPrice": 3500.00
    },
    {
      "productId": "prod-002",
      "description": "Criação de arte",
      "quantity": 1,
      "unitPrice": 800.00,
      "totalPrice": 800.00
    }
  ]
}
```

**Response:**
```json
{
  "id": "prop-new-001",
  "clientId": "client-001",
  "totalAmount": 4300.00,
  "discountAmount": 215.00,
  "publicHash": "xyz789abc123",
  "items": [...],
  ...
}
```

**Onde integrar:**
- **Arquivo:** `/components/proposals/ProposalFormWizard.tsx`
- **Função:** `handleSubmit` do wizard

**Código integrado:**
```typescript
// /components/proposals/ProposalFormWizard.tsx
const handleSubmit = async () => {
  try {
    const payload = {
      clientId: formData.clientId,
      responsibleUserId: formData.responsibleUserId,
      title: formData.title,
      status: formData.status,
      conditionsText: formData.conditionsText,
      validUntil: formData.validUntil,
      discountPercent: formData.discountPercent,
      items: formData.items.map(item => ({
        mediaUnitId: item.mediaUnitId,
        productId: item.productId,
        description: item.description,
        startDate: item.startDate,
        endDate: item.endDate,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };

    if (editingProposal) {
      await apiClient.put(`/proposals/${editingProposal.id}`, payload);
      toast.success('Proposta atualizada!');
    } else {
      await apiClient.post('/proposals', payload);
      toast.success('Proposta criada!');
    }

    onSuccess();
    onOpenChange(false);
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Erro ao salvar proposta');
  }
};
```

---

#### **PUT /api/proposals/:id**

**Descrição:** Atualiza proposta (dados gerais e itens)

**Request body:** Mesma estrutura do POST

---

#### **PATCH /api/proposals/:id/status**

**Descrição:** Atualiza apenas o status da proposta

**Request body:**
```json
{
  "status": "ENVIADA"
}
```

**Onde integrar:**
- **Arquivo:** `/components/Proposals.tsx`
- **Botão:** "Enviar proposta"

---

#### **GET /api/proposals/public/:hash**

**Descrição:** Acesso público à proposta (sem autenticação)

**Response:** Proposta completa com items, dados do cliente, etc.

**Uso:** Link público compartilhado com cliente

---

#### **POST /api/proposals/:id/approve**

**Descrição:** Marca proposta como aprovada (usado pelo cliente)

**Response:**
```json
{
  "id": "prop-001",
  "status": "APROVADA",
  "approvedAt": "2024-12-09T15:30:00.000Z"
}
```

---

#### **POST /api/proposals/:id/reject**

**Descrição:** Marca proposta como reprovada

**Response:**
```json
{
  "id": "prop-001",
  "status": "REPROVADA",
  "rejectedAt": "2024-12-09T15:30:00.000Z"
}
```

---

#### **POST /api/proposals/:id/duplicate**

**Descrição:** Duplica proposta

**Response:** Nova proposta (cópia)

**Onde integrar:**
- **Arquivo:** `/components/Proposals.tsx`
- **Menu:** Ação "Duplicar"

---

#### **GET /api/proposals/:id/pdf**

**Descrição:** Gera PDF da proposta

**Response:** Stream do arquivo PDF

**Onde integrar:**
- **Arquivo:** `/components/proposals/ProposalDetailsDrawer.tsx`
- **Botão:** "Baixar PDF"

---

## 4.7. Campanhas e Reservas

### 4.7.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Campaigns.tsx` | Página principal de campanhas |
| `/components/campaigns/CampaignDetailsDrawer.tsx` | Drawer de detalhes |
| `/components/campaigns/CampaignBookingDialog.tsx` | Dialog de reserva de faces |
| `/components/Reservations.tsx` | Visão de calendário de reservas |
| `/lib/mockData.ts` | Mock `mockCampaigns`, `mockReservations` |

### 4.7.2. Endpoints de Campanhas

#### **GET /api/campaigns**

**Descrição:** Lista campanhas

**Query params:**
```typescript
{
  search?: string;
  status?: CampaignStatus;
  clientId?: string;
  startDateFrom?: string;
  startDateTo?: string;
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "camp-001",
      "companyId": "company-456",
      "proposalId": "prop-001",
      "clientId": "client-001",
      "name": "Campanha Verão 2025",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-01-31T23:59:59.000Z",
      "status": "ATIVA",
      "totalAmountCents": 1500000,
      "approvedAt": "2024-12-05T10:00:00.000Z",
      "createdAt": "2024-12-01T10:00:00.000Z",
      "client": {
        "id": "client-001",
        "contactName": "Maria Silva",
        "companyName": "Empresa XYZ"
      },
      "items": [
        {
          "id": "campitem-001",
          "mediaUnitId": "unit-001",
          "startDate": "2025-01-01",
          "endDate": "2025-01-31"
        }
      ]
    }
  ]
}
```

**Onde integrar:**
- **Arquivo:** `/components/Campaigns.tsx`

---

#### **GET /api/campaigns/:id**

**Descrição:** Busca campanha por ID

---

#### **POST /api/campaigns**

**Descrição:** Cria campanha a partir de proposta aprovada

**Request body:**
```json
{
  "proposalId": "prop-001",
  "clientId": "client-001",
  "name": "Campanha Black Friday",
  "startDate": "2024-11-20",
  "endDate": "2024-11-30",
  "status": "APROVADA",
  "items": [
    {
      "mediaUnitId": "unit-005",
      "startDate": "2024-11-20",
      "endDate": "2024-11-30"
    }
  ]
}
```

**Response:** Campanha criada

**Onde integrar:**
- **Arquivo:** `/components/Proposals.tsx` ou `/components/Campaigns.tsx`
- **Ação:** "Criar Campanha" a partir de proposta aprovada

---

#### **PUT /api/campaigns/:id**

**Descrição:** Atualiza campanha

---

#### **PATCH /api/campaigns/:id/status**

**Descrição:** Atualiza status da campanha

**Request body:**
```json
{
  "status": "EM_VEICULACAO"
}
```

**Onde integrar:**
- **Arquivo:** `/components/Campaigns.tsx`
- **Botão:** Ações de mudança de status

---

### 4.7.3. Endpoints de Reservas

#### **GET /api/reservations**

**Descrição:** Lista reservas com filtros

**Query params:**
```typescript
{
  mediaUnitId?: string;
  campaignId?: string;
  proposalId?: string;
  startDate?: string;
  endDate?: string;
  status?: ReservationStatus;
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "res-001",
      "companyId": "company-456",
      "mediaUnitId": "unit-001",
      "campaignId": "camp-001",
      "proposalId": "prop-001",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-01-31T23:59:59.000Z",
      "status": "CONFIRMADA",
      "createdAt": "2024-12-01T10:00:00.000Z"
    }
  ]
}
```

**Onde integrar:**
- **Arquivo:** `/components/Reservations.tsx`
- **Arquivo:** `/components/Inventory.tsx` (para mostrar ocupação das faces)

---

#### **POST /api/reservations**

**Descrição:** Cria reserva (bloqueia face/tela em um período)

**Request body:**
```json
{
  "mediaUnitId": "unit-001",
  "proposalId": "prop-001",
  "startDate": "2025-02-01",
  "endDate": "2025-02-28",
  "status": "RESERVADA"
}
```

**Response:** Reservation criada

**Onde integrar:**
- **Arquivo:** `/components/proposals/ProposalFormWizard.tsx`
- **Momento:** Quando itens com mediaUnit são adicionados à proposta

---

#### **PATCH /api/reservations/:id/status**

**Descrição:** Atualiza status da reserva

**Request body:**
```json
{
  "status": "CONFIRMADA"
}
```

---

#### **DELETE /api/reservations/:id**

**Descrição:** Cancela reserva

---

#### **GET /api/reservations/availability**

**Descrição:** Verifica disponibilidade de faces/telas em um período

**Query params:**
```typescript
{
  mediaUnitIds: string[];  // Array de IDs
  startDate: string;
  endDate: string;
}
```

**Response:**
```json
{
  "unit-001": {
    "available": false,
    "conflicts": [
      {
        "reservationId": "res-001",
        "startDate": "2025-01-15",
        "endDate": "2025-02-15"
      }
    ]
  },
  "unit-002": {
    "available": true,
    "conflicts": []
  }
}
```

**Onde integrar:**
- **Arquivo:** `/components/proposals/MediaSelectionDrawer.tsx`
- **Função:** Validar disponibilidade antes de adicionar item à proposta

---

## 4.8. Financeiro

### 4.8.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Financial.tsx` | Página principal (tabs) |
| `/components/financial/FinancialCharges.tsx` | Aba de cobranças (billing invoices) |
| `/components/financial/CashFlow.tsx` | Aba de fluxo de caixa |
| `/components/financial/CashTransactionFormDialog.tsx` | Form de lançamento de caixa |
| `/components/financial/BillingInvoiceEditDialog.tsx` | Form de cobrança |
| `/lib/mockDataFinance.ts` | Mock `mockCashTransactions`, `mockBillingInvoices` |

### 4.8.2. Endpoints de Cobranças (BillingInvoice)

#### **GET /api/billing-invoices**

**Descrição:** Lista cobranças/faturas

**Query params:**
```typescript
{
  search?: string;
  status?: BillingStatus;  // ABERTA | PAGA | VENCIDA | CANCELADA
  clientId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "inv-001",
      "companyId": "company-456",
      "clientId": "client-001",
      "proposalId": "prop-001",
      "campaignId": "camp-001",
      "dueDate": "2025-01-15T00:00:00.000Z",
      "amount": 5000.00,
      "amountCents": 500000,
      "status": "ABERTA",
      "paymentMethod": "PIX",
      "gatewayInvoiceId": "gw-inv-123",
      "generateNf": true,
      "paidAt": null,
      "createdAt": "2024-12-01T10:00:00.000Z",
      "client": {
        "id": "client-001",
        "contactName": "Maria Silva",
        "companyName": "Empresa XYZ"
      }
    }
  ],
  "total": 120
}
```

**Onde integrar:**
- **Arquivo:** `/components/financial/FinancialCharges.tsx`

---

#### **POST /api/billing-invoices**

**Descrição:** Cria nova cobrança

**Request body:**
```json
{
  "clientId": "client-001",
  "proposalId": "prop-001",
  "campaignId": "camp-001",
  "dueDate": "2025-02-10",
  "amount": 7500.00,
  "paymentMethod": "BOLETO",
  "generateNf": true
}
```

**Response:** BillingInvoice criada

---

#### **PUT /api/billing-invoices/:id**

**Descrição:** Atualiza cobrança

---

#### **PATCH /api/billing-invoices/:id/mark-paid**

**Descrição:** Marca cobrança como paga

**Request body:**
```json
{
  "paidAt": "2025-01-10T15:30:00.000Z",
  "paymentMethod": "PIX"
}
```

**Response:**
```json
{
  "id": "inv-001",
  "status": "PAGA",
  "paidAt": "2025-01-10T15:30:00.000Z"
}
```

**Onde integrar:**
- **Arquivo:** `/components/financial/FinancialCharges.tsx`
- **Botão:** "Marcar como Paga"

---

#### **GET /api/billing-invoices/:id/pdf**

**Descrição:** Gera PDF da cobrança/fatura

**Response:** Stream PDF

---

### 4.8.3. Endpoints de Fluxo de Caixa (CashTransaction)

#### **GET /api/cash-transactions**

**Descrição:** Lista lançamentos de caixa

**Query params:**
```typescript
{
  search?: string;
  flowType?: CashFlowType;  // RECEITA | DESPESA | TRANSFERENCIA | IMPOSTO | PESSOAS
  categoryId?: string;
  mediaPointId?: string;     // Filtrar por ponto de mídia
  dateFrom?: string;
  dateTo?: string;
  isPaid?: boolean;
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "tx-001",
      "companyId": "company-456",
      "date": "2024-12-05T00:00:00.000Z",
      "description": "Pagamento taxa DER",
      "partnerName": "DER/SP",
      "categoryId": "cat-002",
      "tags": ["DER", "mensal"],
      "amount": 1200.00,
      "flowType": "DESPESA",
      "paymentType": "A_VISTA",
      "paymentMethod": "TRANSFERENCIA",
      "isPaid": true,
      "billingInvoiceId": null,
      "mediaPointId": "mp-001",
      "createdAt": "2024-12-01T10:00:00.000Z"
    }
  ],
  "total": 450
}
```

**Onde integrar:**
- **Arquivo:** `/components/financial/CashFlow.tsx`

---

#### **POST /api/cash-transactions**

**Descrição:** Cria lançamento de caixa

**Request body:**
```json
{
  "date": "2024-12-10",
  "description": "Pagamento energia elétrica",
  "partnerName": "Eletropaulo",
  "categoryId": "cat-005",
  "tags": ["energia", "mensal"],
  "amount": 450.00,
  "flowType": "DESPESA",
  "paymentType": "A_VISTA",
  "paymentMethod": "PIX",
  "isPaid": true,
  "mediaPointId": "mp-002"
}
```

**Response:** CashTransaction criada

**Onde integrar:**
- **Arquivo:** `/components/financial/CashTransactionFormDialog.tsx`
- **Função:** `handleSubmit`

**Código integrado:**
```typescript
// /components/financial/CashTransactionFormDialog.tsx
const handleSubmit = async (data: Partial<CashTransaction>) => {
  try {
    if (editingTransaction) {
      const response = await apiClient.put(
        `/cash-transactions/${editingTransaction.id}`,
        data
      );
      onSave(response.data);
      toast.success('Lançamento atualizado!');
    } else {
      const response = await apiClient.post('/cash-transactions', data);
      onSave(response.data);
      toast.success('Lançamento criado!');
    }

    onOpenChange(false);
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Erro ao salvar lançamento');
  }
};
```

---

#### **PUT /api/cash-transactions/:id**

**Descrição:** Atualiza lançamento

---

#### **DELETE /api/cash-transactions/:id**

**Descrição:** Exclui lançamento

---

### 4.8.4. Endpoints de Categorias de Transação

#### **GET /api/transaction-categories**

**Descrição:** Lista categorias de transação

**Response:**
```json
[
  {
    "id": "cat-001",
    "companyId": "company-456",
    "name": "Energia Elétrica",
    "createdAt": "2024-11-01T10:00:00.000Z"
  },
  {
    "id": "cat-002",
    "name": "Taxas DER"
  },
  {
    "id": "cat-003",
    "name": "Aluguel de Área"
  }
]
```

**Onde integrar:**
- **Arquivo:** `/components/financial/CashTransactionFormDialog.tsx`
- **Componente:** Select de categorias

---

#### **POST /api/transaction-categories**

**Descrição:** Cria nova categoria

**Request body:**
```json
{
  "name": "Manutenção Preventiva"
}
```

---

#### **PUT /api/transaction-categories/:id**

**Descrição:** Atualiza categoria

---

#### **DELETE /api/transaction-categories/:id**

**Descrição:** Exclui categoria (verifica se não está em uso)

---

## 4.9. Mensagens

### 4.9.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Messages.tsx` | Página principal de mensagens |
| `/components/messages/ConversationsList.tsx` | Lista de conversas |
| `/components/messages/MessageThread.tsx` | Thread de mensagens |
| `/components/messages/MessageInputBar.tsx` | Input de nova mensagem |
| `/lib/mockDataMessages.ts` | Mock `mockMessages` |

### 4.9.2. Endpoints de Mensagens

#### **GET /api/messages**

**Descrição:** Lista mensagens (filtradas por proposta/campanha)

**Query params:**
```typescript
{
  proposalId?: string;
  campaignId?: string;
  channel?: MessageChannel;  // EMAIL | WHATSAPP | SYSTEM
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "msg-001",
      "companyId": "company-456",
      "proposalId": "prop-001",
      "campaignId": null,
      "direction": "OUT",
      "channel": "EMAIL",
      "senderType": "USER",
      "senderName": "João Silva",
      "senderContact": "joao@outdoormidia.com.br",
      "contentText": "Olá Maria, segue proposta conforme solicitado.",
      "createdAt": "2024-12-05T10:30:00.000Z"
    }
  ]
}
```

**Onde integrar:**
- **Arquivo:** `/components/Messages.tsx`

---

#### **POST /api/messages**

**Descrição:** Envia nova mensagem

**Request body:**
```json
{
  "proposalId": "prop-001",
  "direction": "OUT",
  "channel": "EMAIL",
  "senderType": "USER",
  "senderName": "João Silva",
  "senderContact": "joao@outdoormidia.com.br",
  "contentText": "Boa tarde! Confirma recebimento da proposta?"
}
```

**Response:** Message criada

**Onde integrar:**
- **Arquivo:** `/components/messages/MessageInputBar.tsx`

---

## 4.10. Atividades (Activity Log)

### 4.10.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Activities.tsx` | Página de log de atividades |
| `/lib/mockDataActivityLog.ts` | Mock `mockActivityLogs` |

### 4.10.2. Endpoints de Activity Log

#### **GET /api/activity-logs**

**Descrição:** Lista logs de auditoria

**Query params:**
```typescript
{
  resourceType?: ActivityResourceType;  // CLIENTE | PROPOSTA | MIDIA | etc.
  resourceId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "log-001",
      "companyId": "company-456",
      "userId": "user-123",
      "resourceType": "PROPOSTA",
      "resourceId": "prop-001",
      "action": "created",
      "details": {
        "title": "Campanha Verão 2025",
        "clientId": "client-001"
      },
      "createdAt": "2024-12-01T10:00:00.000Z",
      "user": {
        "id": "user-123",
        "name": "João Silva"
      }
    }
  ]
}
```

**Onde integrar:**
- **Arquivo:** `/components/Activities.tsx`
- **Arquivo:** `/components/clients/ClientDetailsDrawer.tsx` (aba "Atividades" do cliente)

**Observação:** Activity logs são criados automaticamente pelo backend em ações de create/update/delete. Frontend apenas lê.

---

## 4.11. Configurações e Assinatura

### 4.11.1. Arquivos Frontend Envolvidos

| Arquivo | Função |
|---------|--------|
| `/components/Settings.tsx` | Página principal de configurações |
| `/components/settings/CompanySettings.tsx` | Dados da empresa |
| `/components/settings/UsersSettings.tsx` | Gestão de usuários |
| `/components/settings/UserInviteDialog.tsx` | Convite de usuário |
| `/components/settings/AccountSettings.tsx` | Dados do usuário atual |
| `/components/settings/SubscriptionSettings.tsx` | Assinatura da plataforma |
| `/lib/mockDataSettings.ts` | Mock de usuários e assinatura |

### 4.11.2. Endpoints de Usuários

#### **GET /api/users**

**Descrição:** Lista usuários da empresa

**Response:**
```json
[
  {
    "id": "user-001",
    "companyId": "company-456",
    "name": "João Silva",
    "email": "joao@outdoormidia.com.br",
    "phone": "11987654321",
    "isSuperAdmin": false,
    "twoFactorEnabled": true,
    "twoFactorType": "TOTP",
    "status": "ACTIVE",
    "lastLoginAt": "2024-12-09T08:30:00.000Z",
    "createdAt": "2024-11-01T10:00:00.000Z",
    "roles": ["COMERCIAL", "FINANCEIRO"]
  }
]
```

**Onde integrar:**
- **Arquivo:** `/components/settings/UsersSettings.tsx`

---

#### **POST /api/users**

**Descrição:** Cria novo usuário (convite)

**Request body:**
```json
{
  "name": "Maria Oliveira",
  "email": "maria@outdoormidia.com.br",
  "phone": "11987654322",
  "roles": ["COMERCIAL"]
}
```

**Response:** User criado (backend envia email de convite)

**Onde integrar:**
- **Arquivo:** `/components/settings/UserInviteDialog.tsx`

---

#### **PUT /api/users/:id**

**Descrição:** Atualiza usuário

---

#### **PATCH /api/users/:id/status**

**Descrição:** Ativa/desativa usuário

**Request body:**
```json
{
  "status": "INACTIVE"
}
```

---

#### **PATCH /api/users/:id/roles**

**Descrição:** Atualiza papéis do usuário

**Request body:**
```json
{
  "roles": ["ADMINISTRATIVO", "FINANCEIRO", "COMERCIAL"]
}
```

---

### 4.11.3. Endpoints de Assinatura da Plataforma

#### **GET /api/platform-plans**

**Descrição:** Lista planos disponíveis da plataforma

**Response:**
```json
[
  {
    "id": "plan-001",
    "name": "Até 50 pontos",
    "minPoints": 0,
    "maxPoints": 50,
    "monthlyPrice": 297.00,
    "isPopular": false
  },
  {
    "id": "plan-002",
    "name": "51 a 100 pontos",
    "minPoints": 51,
    "maxPoints": 100,
    "monthlyPrice": 497.00,
    "isPopular": true
  }
]
```

**Onde integrar:**
- **Arquivo:** `/components/settings/SubscriptionSettings.tsx`
- **Arquivo:** `/pages/cadastro.tsx` (signup wizard)

---

#### **GET /api/platform-subscription**

**Descrição:** Busca assinatura da empresa atual

**Response:**
```json
{
  "id": "sub-001",
  "companyId": "company-456",
  "planId": "plan-003",
  "maxOwnersPerMediaPoint": 2,
  "addonExtraStorage": false,
  "status": "ATIVA",
  "startAt": "2024-11-01T00:00:00.000Z",
  "currentPeriodStart": "2024-12-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-12-31T23:59:59.000Z",
  "gatewayCustomerId": "gw-cust-123",
  "plan": {
    "id": "plan-003",
    "name": "101 a 150 pontos",
    "monthlyPrice": 697.00
  }
}
```

**Onde integrar:**
- **Arquivo:** `/components/settings/SubscriptionSettings.tsx`

---

#### **POST /api/platform-subscription**

**Descrição:** Cria assinatura (ao criar empresa no signup)

**Request body:**
```json
{
  "planId": "plan-002",
  "maxOwnersPerMediaPoint": 2,
  "addonExtraStorage": false
}
```

**Response:** PlatformSubscription criada

**Onde integrar:**
- **Arquivo:** `/pages/cadastro.tsx` (Signup wizard)
- **Componente:** `/components/signup/SignupStepper.tsx`

---

#### **PUT /api/platform-subscription**

**Descrição:** Atualiza assinatura (upgrade/downgrade de plano)

**Request body:**
```json
{
  "planId": "plan-004",
  "maxOwnersPerMediaPoint": 3,
  "addonExtraStorage": true
}
```

**Onde integrar:**
- **Arquivo:** `/components/settings/SubscriptionSettings.tsx`

---

## 5. Checklists de Implementação

### 5.1. Checklist: Substituição de Mocks por API

**Progresso geral:** 0/60 itens

#### Auth / Usuário
- [ ] Login (POST /api/auth/login)
- [ ] Verificação 2FA (POST /api/auth/verify-2fa)
- [ ] Refresh token (POST /api/auth/refresh)
- [ ] Carregar usuário (GET /api/auth/me)
- [ ] Logout (POST /api/auth/logout)

#### Empresa
- [ ] Carregar dados da empresa (GET /api/company)
- [ ] Atualizar empresa (PUT /api/company)
- [ ] Upload de logo (POST /api/company/logo)

#### Clientes
- [ ] Listar clientes (GET /api/clients)
- [ ] Buscar cliente por ID (GET /api/clients/:id)
- [ ] Criar cliente (POST /api/clients)
- [ ] Atualizar cliente (PUT /api/clients/:id)
- [ ] Excluir cliente (DELETE /api/clients/:id)
- [ ] Upload de documentos (POST /api/clients/:id/documents)

#### Inventário - Pontos
- [ ] Listar pontos de mídia (GET /api/media-points)
- [ ] Buscar ponto por ID (GET /api/media-points/:id)
- [ ] Criar ponto (POST /api/media-points)
- [ ] Atualizar ponto (PUT /api/media-points/:id)
- [ ] Excluir ponto (DELETE /api/media-points/:id)
- [ ] Upload de imagem do ponto (POST /api/media-points/:id/image)

#### Inventário - Unidades (Faces/Telas)
- [ ] Listar unidades de um ponto (GET /api/media-points/:id/units)
- [ ] Criar unidade (POST /api/media-points/:id/units)
- [ ] Atualizar unidade (PUT /api/media-units/:id)
- [ ] Excluir unidade (DELETE /api/media-units/:id)
- [ ] Upload de imagem da face (POST /api/media-units/:id/image)

#### Inventário - Proprietários
- [ ] Listar proprietários de um ponto (GET /api/media-points/:id/owners)
- [ ] Criar proprietário (POST /api/media-points/:id/owners)
- [ ] Atualizar proprietário (PUT /api/media-point-owners/:id)
- [ ] Excluir proprietário (DELETE /api/media-point-owners/:id)

#### Inventário - Contratos
- [ ] Listar contratos de um ponto (GET /api/media-points/:id/contracts)
- [ ] Upload de contrato (POST /api/media-points/:id/contracts)
- [ ] Download de contrato (GET /api/media-point-contracts/:id/download)
- [ ] Excluir contrato (DELETE /api/media-point-contracts/:id)

#### Produtos
- [ ] Listar produtos (GET /api/products)
- [ ] Criar produto (POST /api/products)
- [ ] Atualizar produto (PUT /api/products/:id)
- [ ] Excluir produto (DELETE /api/products/:id)

#### Propostas
- [ ] Listar propostas (GET /api/proposals)
- [ ] Buscar proposta por ID (GET /api/proposals/:id)
- [ ] Criar proposta (POST /api/proposals)
- [ ] Atualizar proposta (PUT /api/proposals/:id)
- [ ] Atualizar status (PATCH /api/proposals/:id/status)
- [ ] Duplicar proposta (POST /api/proposals/:id/duplicate)
- [ ] Gerar PDF (GET /api/proposals/:id/pdf)
- [ ] Aprovar proposta (POST /api/proposals/:id/approve)

#### Campanhas
- [ ] Listar campanhas (GET /api/campaigns)
- [ ] Buscar campanha por ID (GET /api/campaigns/:id)
- [ ] Criar campanha (POST /api/campaigns)
- [ ] Atualizar campanha (PUT /api/campaigns/:id)
- [ ] Atualizar status (PATCH /api/campaigns/:id/status)

#### Reservas
- [ ] Listar reservas (GET /api/reservations)
- [ ] Criar reserva (POST /api/reservations)
- [ ] Atualizar status (PATCH /api/reservations/:id/status)
- [ ] Cancelar reserva (DELETE /api/reservations/:id)
- [ ] Verificar disponibilidade (GET /api/reservations/availability)

#### Financeiro - Cobranças
- [ ] Listar cobranças (GET /api/billing-invoices)
- [ ] Criar cobrança (POST /api/billing-invoices)
- [ ] Atualizar cobrança (PUT /api/billing-invoices/:id)
- [ ] Marcar como paga (PATCH /api/billing-invoices/:id/mark-paid)
- [ ] Gerar PDF (GET /api/billing-invoices/:id/pdf)

#### Financeiro - Fluxo de Caixa
- [ ] Listar transações (GET /api/cash-transactions)
- [ ] Criar transação (POST /api/cash-transactions)
- [ ] Atualizar transação (PUT /api/cash-transactions/:id)
- [ ] Excluir transação (DELETE /api/cash-transactions/:id)
- [ ] Listar categorias (GET /api/transaction-categories)
- [ ] Criar categoria (POST /api/transaction-categories)

#### Mensagens
- [ ] Listar mensagens (GET /api/messages)
- [ ] Enviar mensagem (POST /api/messages)

#### Atividades
- [ ] Listar logs de atividade (GET /api/activity-logs)

#### Configurações - Usuários
- [ ] Listar usuários (GET /api/users)
- [ ] Criar/convidar usuário (POST /api/users)
- [ ] Atualizar usuário (PUT /api/users/:id)
- [ ] Atualizar status (PATCH /api/users/:id/status)
- [ ] Atualizar papéis (PATCH /api/users/:id/roles)

#### Configurações - Assinatura
- [ ] Listar planos (GET /api/platform-plans)
- [ ] Buscar assinatura (GET /api/platform-subscription)
- [ ] Criar assinatura (POST /api/platform-subscription)
- [ ] Atualizar assinatura (PUT /api/platform-subscription)

---

### 5.2. Checklist: Criação de Hooks Customizados

- [ ] `/hooks/useAuth.ts` (ou integrar no AuthContext)
- [ ] `/hooks/useClients.ts`
- [ ] `/hooks/useMediaPoints.ts`
- [ ] `/hooks/useMediaUnits.ts`
- [ ] `/hooks/useProducts.ts`
- [ ] `/hooks/useProposals.ts`
- [ ] `/hooks/useCampaigns.ts`
- [ ] `/hooks/useReservations.ts`
- [ ] `/hooks/useBillingInvoices.ts`
- [ ] `/hooks/useCashTransactions.ts`
- [ ] `/hooks/useTransactionCategories.ts`
- [ ] `/hooks/useMessages.ts`
- [ ] `/hooks/useActivityLogs.ts`
- [ ] `/hooks/useUsers.ts`
- [ ] `/hooks/usePlatformPlans.ts`

---

### 5.3. Checklist: Atualização de Componentes

- [ ] `/components/Clients.tsx` - usar `useClients()`
- [ ] `/components/clients/ClientFormDialog.tsx` - criar/atualizar via API
- [ ] `/components/Inventory.tsx` - usar `useMediaPoints()`
- [ ] `/components/inventory/MediaPointFormDialog.tsx` - criar/atualizar via API
- [ ] `/components/inventory/MediaUnitsDialog.tsx` - CRUD via API
- [ ] `/components/inventory/MediaPointOwnersDialog.tsx` - CRUD via API
- [ ] `/components/inventory/MediaPointContractsDialog.tsx` - upload/download via API
- [ ] `/components/Products.tsx` - usar `useProducts()`
- [ ] `/components/Proposals.tsx` - usar `useProposals()`
- [ ] `/components/proposals/ProposalFormWizard.tsx` - criar/atualizar via API
- [ ] `/components/Campaigns.tsx` - usar `useCampaigns()`
- [ ] `/components/Reservations.tsx` - usar `useReservations()`
- [ ] `/components/financial/FinancialCharges.tsx` - usar `useBillingInvoices()`
- [ ] `/components/financial/CashFlow.tsx` - usar `useCashTransactions()`
- [ ] `/components/financial/CashTransactionFormDialog.tsx` - criar/atualizar via API
- [ ] `/components/Messages.tsx` - usar `useMessages()`
- [ ] `/components/Activities.tsx` - usar `useActivityLogs()`
- [ ] `/components/settings/UsersSettings.tsx` - usar `useUsers()`
- [ ] `/components/settings/SubscriptionSettings.tsx` - usar assinatura via API
- [ ] `/contexts/AuthContext.tsx` - substituir mockAuth por apiClient
- [ ] `/contexts/CompanyContext.tsx` - substituir mockDataCentral por apiClient

---

### 5.4. Checklist: Infraestrutura

- [ ] Criar `/lib/apiClient.ts` com axios configurado
- [ ] Configurar interceptor de autenticação (token JWT)
- [ ] Configurar interceptor de refresh token
- [ ] Configurar variável de ambiente `VITE_API_URL`
- [ ] Criar tratamento global de erros (toast, log)
- [ ] Adicionar estados de loading em componentes
- [ ] Adicionar tratamento de erro em formulários
- [ ] Documentar formato de erros da API no frontend

---

## 6. Testes End-to-End

### 6.1. Fluxo 1: Cadastro e Login

**Passos:**
1. Acessar `/cadastro`
2. Preencher dados da empresa e plano
3. Criar usuário administrador
4. Verificar email (mock ou real)
5. Fazer login
6. Habilitar 2FA (opcional)
7. Logout
8. Login novamente com 2FA
9. Acessar `/app` (dashboard)

**Validações:**
- Token JWT armazenado em localStorage
- Usuário autenticado em AuthContext
- Empresa carregada em CompanyContext
- Redirecionamento correto após login

---

### 6.2. Fluxo 2: Criação de Cliente e Proposta

**Passos:**
1. Login
2. Navegar para "Clientes"
3. Criar novo cliente (preencher formulário completo)
4. Visualizar cliente criado na tabela
5. Abrir drawer de detalhes do cliente
6. Navegar para "Propostas"
7. Criar nova proposta (wizard)
   - Passo 1: selecionar cliente recém-criado, definir datas, condições
   - Passo 2: adicionar faces/telas do inventário, adicionar produtos
8. Salvar proposta como "RASCUNHO"
9. Editar proposta
10. Alterar status para "ENVIADA"
11. Gerar PDF da proposta
12. Simular aprovação do cliente (via link público)
13. Verificar proposta com status "APROVADA"

**Validações:**
- Cliente criado com sucesso (GET /api/clients retorna o cliente)
- Proposta criada com itens corretos (GET /api/proposals/:id retorna proposta completa)
- PDF gerado com sucesso
- Status atualizado corretamente

---

### 6.3. Fluxo 3: Campanha, Reservas e Faturamento

**Passos:**
1. A partir de proposta aprovada, criar campanha
2. Verificar que reservas foram criadas automaticamente para as faces/telas
3. Atualizar status da campanha para "EM_VEICULACAO"
4. Navegar para "Financeiro" > "Cobranças"
5. Criar cobrança vinculada à campanha
6. Gerar PDF da cobrança
7. Marcar cobrança como "PAGA"
8. Navegar para "Financeiro" > "Fluxo de Caixa"
9. Verificar lançamento de receita criado automaticamente (ou criar manualmente)

**Validações:**
- Campanha criada (GET /api/campaigns/:id)
- Reservas criadas para cada face/tela (GET /api/reservations?campaignId=...)
- Cobrança criada (GET /api/billing-invoices/:id)
- Status da cobrança atualizado para "PAGA"
- Lançamento de caixa de receita criado

---

### 6.4. Fluxo 4: Gestão de Inventário Completo

**Passos:**
1. Navegar para "Inventário"
2. Criar novo ponto de mídia OOH
   - Preencher endereço, tipo, preços
   - Adicionar custos de produção (lona, montagem)
   - Upload de imagem principal
3. Abrir dialog de "Faces/Telas"
   - Criar Face A (9m x 3m, preços)
   - Upload de imagem da face
   - Criar Face B
4. Abrir dialog de "Proprietários"
   - Adicionar proprietário DER com taxa mensal
   - Adicionar proprietário particular com aluguel
5. Abrir dialog de "Contratos"
   - Upload de contrato PDF
   - Baixar contrato para validar
6. Duplicar ponto de mídia
7. Editar ponto duplicado (alterar endereço)
8. Verificar que faces foram duplicadas junto

**Validações:**
- Ponto criado (GET /api/media-points/:id)
- Unidades criadas (GET /api/media-points/:id/units retorna 2 faces)
- Proprietários criados (GET /api/media-points/:id/owners retorna 2 owners)
- Contratos criados e download funciona
- Ponto duplicado com sucesso

---

### 6.5. Fluxo 5: Financeiro - Despesas por Ponto de Mídia

**Passos:**
1. Navegar para "Financeiro" > "Fluxo de Caixa"
2. Criar lançamento de DESPESA
   - Tipo: Despesa
   - Descrição: "Energia elétrica"
   - Categoria: "Energia Elétrica"
   - Valor: R$ 450,00
   - **Ponto de Mídia:** selecionar ponto específico
   - Data de vencimento: 15/12/2024
   - Status: Pago
3. Criar lançamento de taxa DER
   - Categoria: "Taxas DER"
   - **Ponto de Mídia:** selecionar outro ponto
   - Valor: R$ 1200,00
4. Filtrar lançamentos por ponto de mídia
5. Exportar relatório (futuro)

**Validações:**
- Lançamentos criados com `mediaPointId` correto (GET /api/cash-transactions?mediaPointId=...)
- Filtro por ponto funciona
- Categorias listadas corretamente

---

### 6.6. Fluxo 6: Configurações e Assinatura

**Passos:**
1. Navegar para "Configurações"
2. Aba "Empresa"
   - Editar nome da empresa, CNPJ, telefone
   - Atualizar cor primária
   - Upload de nova logo
   - Salvar
3. Aba "Usuários"
   - Convidar novo usuário
   - Definir papéis: Comercial
   - Enviar convite (backend envia email)
   - Editar usuário existente (alterar papéis)
   - Desativar usuário
4. Aba "Assinatura"
   - Visualizar plano atual
   - Fazer upgrade de plano (ex: de 50 pontos para 100 pontos)
   - Adicionar addon de storage extra
   - Salvar alterações
5. Aba "Conta"
   - Atualizar dados do usuário logado (nome, email, telefone)
   - Habilitar 2FA (configurar TOTP)

**Validações:**
- Empresa atualizada (GET /api/company retorna dados atualizados)
- Logo atualizada e visível na sidebar
- Usuário convidado criado (GET /api/users retorna novo usuário)
- Assinatura atualizada (GET /api/platform-subscription retorna novo plano)
- 2FA habilitado (próximo login exige código)

---

### 6.7. Fluxo 7: Mensagens e Atividades

**Passos:**
1. Navegar para "Propostas"
2. Abrir drawer de detalhes de uma proposta
3. Aba "Mensagens"
   - Enviar mensagem para o cliente (simulando email)
4. Navegar para "Mensagens" (módulo principal)
5. Ver thread da proposta
6. Responder mensagem
7. Navegar para "Atividades"
8. Filtrar por tipo de recurso "PROPOSTA"
9. Verificar logs de criação, edição, envio de mensagem

**Validações:**
- Mensagem criada (GET /api/messages?proposalId=...)
- Activity logs registrados (GET /api/activity-logs?resourceType=PROPOSTA)

---

## Conclusão

Este guia mapeia **todos os pontos de integração** entre o frontend OneMedia e o backend NestJS + Prisma.

**Próximos passos:**

1. **Backend:** Implementar endpoints REST conforme especificações deste guia
2. **Frontend:** Criar `/lib/apiClient.ts` e hooks customizados
3. **Frontend:** Substituir mocks progressivamente, módulo por módulo
4. **Testes:** Executar fluxos end-to-end descritos na seção 6
5. **Deploy:** Configurar variáveis de ambiente (`VITE_API_URL`)
6. **Documentação:** Manter este guia atualizado conforme mudanças

**Contato e suporte:**
- Este guia é vivo e deve ser atualizado conforme o projeto evolui
- Qualquer dúvida sobre integração deve ser documentada aqui

---

**Documento criado em:** 09/12/2024  
**Versão:** 1.0  
**Autor:** Equipe OneMedia
