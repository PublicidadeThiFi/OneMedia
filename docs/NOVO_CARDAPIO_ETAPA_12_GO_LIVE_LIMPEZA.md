# Novo Cardápio — Etapa 12: go-live controlado e limpeza do legado

## Objetivo
Concluir a implantação do novo cardápio do Mídia Kit com foco em publicação controlada, acabamento da linguagem exibida ao usuário e consolidação do que permanece ativo após a homologação.

## O que foi fechado nesta etapa
- o `/menu` permanece como entrada principal do cardápio
- o funil operacional atual continua ligado ao catálogo publicado
- textos residuais de transição foram removidos das áreas públicas
- a abertura do link compartilhado do Cardápio fica apresentada como experiência oficial

## Ajustes aplicados no frontend
- remoção de menções visuais a “novo catálogo” nas áreas públicas
- remoção de menções visuais a “fluxo legado” na ação lateral do catálogo
- manutenção das rotas antigas apenas como apoio de navegação interna e compatibilidade

## Decisão de limpeza
Nesta etapa **não houve exclusão de arquivos**.

Motivo:
- as rotas antigas ainda funcionam como fallback operacional
- a exclusão imediata aumentaria o risco de regressão em links já compartilhados ou em navegações profundas
- a limpeza física do legado só deve acontecer depois de um período estável em produção

## Checklist de go-live
1. publicar backend já compatível com o payload atual
2. publicar frontend com o `/menu` como vitrine oficial
3. validar abertura por token real
4. validar filtros compartilhados
5. validar funil completo até envio
6. monitorar erros e feedbacks antes de remover rotas antigas

## Resultado esperado
- cardápio publicado como experiência principal
- comunicação pública mais limpa
- base pronta para futura remoção técnica do legado, com menos risco
