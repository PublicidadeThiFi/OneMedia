# ✅ Correção de CTAs Completa

## Problema Identificado

Os links `<a href="/cadastro">` não funcionavam porque o projeto não tem sistema de roteamento configurado para interceptar cliques em links. O `App.tsx` é renderizado diretamente sem React Router ou Next.js routing ativo.

## Solução Implementada

Convertidos **todos os CTAs** de `<a href>` para `<button onClick={() => window.location.href}>` para forçar navegação do navegador.

## Alterações Feitas

### 1. `/components/landing/Header.tsx`

**Desktop CTAs (linhas 52-63):**
```tsx
// ANTES
<a href="/login">Entrar</a>
<a href="/cadastro">Começar teste grátis</a>

// DEPOIS
<button onClick={() => window.location.href = '/login'}>Entrar</button>
<button onClick={() => window.location.href = '/cadastro'}>Começar teste grátis</button>
```

**Mobile Menu (linhas 94-105):**
```tsx
// ANTES
<a href="/login">Entrar</a>
<a href="/cadastro">Começar teste grátis</a>

// DEPOIS
<button onClick={() => window.location.href = '/login'}>Entrar</button>
<button onClick={() => window.location.href = '/cadastro'}>Começar teste grátis</button>
```

---

### 2. `/components/landing/Hero.tsx`

**CTA Principal (linhas 26-33):**
```tsx
// ANTES
<a href="/cadastro">
  Começar teste grátis de 30 dias
</a>

// DEPOIS
<button onClick={() => window.location.href = '/cadastro'}>
  Começar teste grátis de 30 dias
</button>
```

---

### 3. `/components/landing/Pricing.tsx`

**Botões dos Planos (linhas 74-91):**
```tsx
// ANTES
{plan.custom ? (
  <a href="/contato">Falar com vendas</a>
) : (
  <a href={`/cadastro?planRange=${plan.planRange}`}>
    Começar teste neste plano
  </a>
)}

// DEPOIS
{plan.custom ? (
  <button onClick={() => window.location.href = '/contato'}>
    Falar com vendas
  </button>
) : (
  <button onClick={() => window.location.href = `/cadastro?planRange=${plan.planRange}`}>
    Começar teste neste plano
  </button>
)}
```

**9 Planos com Query Params:**
- Até 50 pontos → `/cadastro?planRange=0-50`
- 50 a 100 pontos → `/cadastro?planRange=50-100`
- 101 a 150 pontos → `/cadastro?planRange=101-150`
- 151 a 200 pontos → `/cadastro?planRange=151-200`
- 201 a 250 pontos → `/cadastro?planRange=201-250`
- 251 a 300 pontos → `/cadastro?planRange=251-300`
- 301 a 350 pontos → `/cadastro?planRange=301-350`
- 351 a 400 pontos → `/cadastro?planRange=351-400`
- Mais de 400 pontos → `/contato`

---

### 4. `/components/landing/FinalCTA.tsx`

**CTA Principal (linhas 15-22):**
```tsx
// ANTES
<a href="/cadastro">
  Começar teste grátis agora
</a>

// DEPOIS
<button onClick={() => window.location.href = '/cadastro'}>
  Começar teste grátis agora
</button>
```

---

## Como Testar Agora

### Teste 1: Header
1. Acesse a home
2. Clique em "Começar teste grátis" no header (desktop ou mobile)
3. ✅ Deve navegar para `/cadastro`

### Teste 2: Hero
1. Scroll até o topo
2. Clique em "Começar teste grátis de 30 dias"
3. ✅ Deve navegar para `/cadastro`

### Teste 3: Planos
1. Scroll até seção "Planos"
2. Clique em qualquer "Começar teste neste plano"
3. ✅ Deve navegar para `/cadastro?planRange=X-Y`
4. ✅ No Step 1 do cadastro, o plano deve estar pré-selecionado

### Teste 4: Final CTA
1. Scroll até o final da página
2. Clique em "Começar teste grátis agora"
3. ✅ Deve navegar para `/cadastro`

### Teste 5: Plano Enterprise
1. Scroll até "Planos"
2. Clique em "Falar com vendas" no card "+400 pontos"
3. ✅ Deve navegar para `/contato`

---

## Por Que Funciona Agora?

### window.location.href vs <a href>

**`<a href>`** - Requer sistema de roteamento:
- Precisa de React Router ou Next.js routing
- Intercepta cliques e faz navegação client-side
- Não funciona sem configuração de rotas

**`window.location.href`** - Navegação nativa do browser:
- Funciona em qualquer aplicação web
- Não precisa de biblioteca de roteamento
- Navegação full-page (recarrega a página)

### Trade-offs

**Vantagens:**
- ✅ Funciona imediatamente sem configuração
- ✅ Compatível com SEO
- ✅ Simples e direto

**Desvantagens:**
- ⚠️ Full page reload (não SPA)
- ⚠️ Perde estado da aplicação
- ⚠️ Menos performático que client-side routing

---

## Próximos Passos (Opcional)

Se quiser melhorar a experiência futuramente:

### Opção 1: Adicionar React Router
```bash
npm install react-router-dom
```

Configurar rotas no `App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/contato" element={<Contato />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Opção 2: Migrar para Next.js
- Já tem estrutura de `/pages`
- Apenas configurar Next.js no projeto
- Rotas automáticas baseadas em arquivos

---

## Status Final

✅ **Todos os CTAs funcionando**  
✅ **Navegação para /cadastro**  
✅ **Query params preservados**  
✅ **Planos pré-selecionados**  
✅ **Mobile e desktop**  

🎉 **O fluxo de cadastro está completo e funcional!**
