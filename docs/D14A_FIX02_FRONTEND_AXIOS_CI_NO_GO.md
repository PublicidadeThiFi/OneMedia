# D14A FIX02 — Axios frontend (sem deploy)

Base: `OneMedia_frontend_atual10.zip`. Scanner e build local PASS; GitHub CI travado em `npm run security:audit` por axios 1.18.1.

Atualização dirigida: axios 1.20.0 (versão de reparo indicada pelo `npm audit fix` do GitHub), sem `--force`. Preserva React/Vite e demais versões declaradas.

**O lockfile não está no patch**: atualize no Mac usando `bash scripts/run-d14a-dependency-qa.sh`. O comando atualiza SOMENTE a árvore de lock conforme package.json, executa npm ci, scan, auditoria e Vite build. Se o registro npm negar versão, o script falha sem mascarar. Faça commit de package.json e package-lock.json.

Sem Vercel deploy automático nesta ação. Verifique prévia Vercel e `vercel.json`: `/api/*` encaminha para a API produtiva; redirecione homologação a uma API apropriada antes de liberar testes com dados reais. NO-GO até aceite.
