# Verificação de CTAs - Landing Page → Cadastro

## Status: ✅ TODOS OS CTAs CONFIGURADOS

Este documento confirma que **todos os CTAs da landing page** estão corretamente apontando para `/cadastro`.

## 📍 Localização dos Arquivos

- Landing Page (Home): `/pages/index.tsx`
- Componentes da Landing: `/components/landing/`
- Página de Cadastro: `/pages/cadastro.tsx`

## ✅ CTAs Verificados

### 1. Header - `/components/landing/Header.tsx`

**Desktop (linhas 53-64):**
```tsx
<a href="/login">Entrar</a>
<a href="/cadastro">Começar teste grátis</a>
```

**Mobile (linhas 95-106):**
```tsx
<a href="/login">Entrar</a>
<a href="/cadastro">Começar teste grátis</a>
```

✅ **Status**: Configurado corretamente

---

### 2. Hero (Seção Principal) - `/components/landing/Hero.tsx`

**CTA Principal (linha 28):**
```tsx
<a href="/cadastro">
  Começar teste grátis de 30 dias
</a>
```

**Subtexto (linha 35):**
```
Sem cartão de crédito • Cancele quando quiser
```

**CTA Secundário (linha 38):**
```tsx
<button onClick={scrollToSolutions}>
  Ver como funciona
</button>
```
(Este é scroll interno, não precisa ir para cadastro)

✅ **Status**: Configurado corretamente

---

### 3. Pricing (Tabela de Planos) - `/components/landing/Pricing.tsx`

**9 Planos Configurados (linhas 7-17):**

| Plano | planRange | href |
|-------|-----------|------|
| Até 50 pontos | `0-50` | `/cadastro?planRange=0-50` |
| 50 a 100 pontos | `50-100` | `/cadastro?planRange=50-100` |
| 101 a 150 pontos | `101-150` | `/cadastro?planRange=101-150` |
| 151 a 200 pontos | `151-200` | `/cadastro?planRange=151-200` ⭐ |
| 201 a 250 pontos | `201-250` | `/cadastro?planRange=201-250` |
| 251 a 300 pontos | `251-300` | `/cadastro?planRange=251-300` |
| 301 a 350 pontos | `301-350` | `/cadastro?planRange=301-350` |
| 351 a 400 pontos | `351-400` | `/cadastro?planRange=351-400` |
| Mais de 400 pontos | `401-plus` | `/contato` (custom) |

**Botões (linhas 82-91):**
```tsx
{plan.custom ? (
  <a href="/contato">Falar com vendas</a>
) : (
  <a href={`/cadastro?planRange=${plan.planRange}`}>
    Começar teste neste plano
  </a>
)}
```

✅ **Status**: Todos os 8 planos regulares → `/cadastro?planRange=...`  
✅ **Status**: Plano enterprise → `/contato`

---

### 4. Final CTA - `/components/landing/FinalCTA.tsx`

**CTA Principal (linha 17):**
```tsx
<a href="/cadastro">
  Começar teste grátis agora
</a>
```

✅ **Status**: Configurado corretamente

---

## 🎯 Mapeamento Completo de Navegação

### CTAs sem Plano Pré-selecionado
Navegam para: `/cadastro`

1. Header - "Começar teste grátis" (desktop e mobile)
2. Hero - "Começar teste grátis de 30 dias"
3. Final CTA - "Começar teste grátis agora"

### CTAs com Plano Pré-selecionado
Navegam para: `/cadastro?planRange=X-Y`

1. Card "Até 50 pontos" → `?planRange=0-50`
2. Card "50 a 100 pontos" → `?planRange=50-100`
3. Card "101 a 150 pontos" → `?planRange=101-150`
4. Card "151 a 200 pontos" → `?planRange=151-200` (Mais Popular)
5. Card "201 a 250 pontos" → `?planRange=201-250`
6. Card "251 a 300 pontos" → `?planRange=251-300`
7. Card "301 a 350 pontos" → `?planRange=301-350`
8. Card "351 a 400 pontos" → `?planRange=351-400`

### CTA Enterprise
Navega para: `/contato`

9. Card "Mais de 400 pontos" → "/contato" (formulário de contato)

---

## 🔍 Como Testar

### Teste 1: CTAs Genéricos
1. Acesse a home: `/` ou `/pages/index.tsx`
2. Clique em qualquer botão "Começar teste grátis"
3. ✅ Deve navegar para `/cadastro` (sem query params)
4. ✅ Step 1 não deve ter plano pré-selecionado

### Teste 2: CTAs com Plano
1. Acesse a home: `/`
2. Role até a seção "Planos" (#planos)
3. Clique em "Começar teste neste plano" em qualquer card
4. ✅ Deve navegar para `/cadastro?planRange=X-Y`
5. ✅ Step 1 deve ter o plano correspondente pré-selecionado

### Teste 3: Plano Enterprise
1. Acesse a home: `/`
2. Role até "Planos"
3. Clique em "Falar com vendas" no card "+400 pontos"
4. ✅ Deve navegar para `/contato`

---

## 🐛 Troubleshooting

### Problema: "Clico mas não navega"

**Possíveis causas:**

1. **Cache do navegador**
   - Solução: Ctrl+Shift+R (hard refresh)
   - Ou: Limpar cache do navegador

2. **Está testando o arquivo errado**
   - ❌ NÃO: `/App.tsx` (este é apenas um componente)
   - ✅ SIM: Servidor rodando e acessando `http://localhost:3000/`

3. **Servidor não está rodando**
   - Solução: `npm run dev` ou `yarn dev`

4. **Está usando rotas client-side**
   - Verificar se tem React Router configurado
   - Verificar se está usando Next.js (sistema de rotas automático)

### Problema: "Link está como '#'"

**Verificação:**
```bash
# Buscar por href="#" nos componentes
grep -r 'href="#"' components/landing/
```

Se encontrar algum resultado, substituir por `href="/cadastro"`.

### Problema: "Query param não funciona"

**Verificação no cadastro:**
1. Abrir `/pages/cadastro.tsx`
2. Procurar por `router.query.planRange` (linha ~61)
3. Verificar se o useEffect está lendo corretamente

**Código esperado:**
```tsx
useEffect(() => {
  if (router.query.planRange) {
    const planRange = router.query.planRange as PlanRange;
    if (PLAN_DEFINITIONS.find((p) => p.range === planRange)) {
      setStep1Data({
        estimatedPoints: null,
        selectedPlanRange: planRange,
        selectedPlatformPlanId: `plan-${planRange}`,
      });
    }
  }
}, [router.query.planRange]);
```

---

## ✅ Checklist Final

- [x] Header desktop com `/cadastro`
- [x] Header mobile com `/cadastro`
- [x] Hero CTA com `/cadastro`
- [x] 8 planos regulares com `/cadastro?planRange=...`
- [x] 1 plano enterprise com `/contato`
- [x] Final CTA com `/cadastro`
- [x] Query params corretos (0-50, 50-100, etc.)
- [x] Nenhum link com `href="#"` ou `onClick` vazio

---

## 📝 Notas Adicionais

- Todos os links usam `<a href="...">` (navegação padrão HTML)
- Não há uso de `router.push()` nos CTAs (mais simples e direto)
- Os links são compatíveis com SEO e compartilhamento
- Funciona mesmo com JavaScript desabilitado
