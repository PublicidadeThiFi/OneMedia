# F7 — Interface de republicação futura (2026-11-26)

- Exibe escolha de início futuro somente com capability explícita; datas locais do navegador, período máximo de 30 dias e início até sete dias à frente.
- Confirmação envia snapshot e consentimento ao endpoint separado; o recibo PENDING não equivale a publicação. Consulta estados PENDING, ACTIVATED, CANCELLED, FAILED, permite cancelar por ID exato e recarregar a situação.
- Bloqueia nova republicação guiada enquanto a intenção está pendente; alteração posterior do rascunho invalida sua execução no backend. Não há retry automático pelo navegador.
- UI permanece compatível com backend antigo sem capability. Nenhuma mudança de Player, licença, quota, cobrança ou infraestrutura. Testar no Mac antes de merge.
