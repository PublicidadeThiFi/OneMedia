# OneMedia DOOH — UX10/F3B: horários e publicação guiada por tela

## Jornada
No painel **Minhas telas → Gerenciar conteúdo**, após subir, preparar e ordenar mídias, o operador abre **3. Horários e publicação**, mantendo a experiência em um único lugar:
A. Publicar a lista após revisão explícita (CAS da playlist com snapshot fresco). Nenhum horário ou manifest é gerado nesta etapa.
B. Escolher início e fim locais, período finito (máximo 30 dias; início até 7 dias), opcionalmente dias da semana e horas diárias, e salvar a agenda idempotente vinculada à tela. Requer player já pareado/ativo. Publicar horários exige revisão detalhada e CAS com snapshot e destino PLAYER conferido.
C. Fazer preflight consultivo de até 24h do manifest para esse player e só preparar a atualização quando o resultado for READY, a empresa tiver capability de materialização e o operador confirmar. Revalidar candidato (checksum, versões e identidade) imediatamente antes do CAS. Mensagem final distingue preparado, instalado e exibido.

## Segurança e compatibilidade
- Retém as APIs de playlist/agenda/manifest protegidas pelas allowlists e pelas autorizações de cada módulo; nenhuma publicação ocorre ao salvar um rascunho.
- F3B depende do backend atualizado e de `DOOH_GUIDED_SCHEDULE_ENABLED=true` juntamente com UX09 e UX10/F3A; fallback amigável se indisponível.
- Cada mutação é iniciada manualmente; não há retry silencioso, repetição cega ou criação paralela. Caso qualquer resposta seja ambígua, o painel orienta atualizar e consultar os registros.
- Não cria mídia fictícia; não troca credencial, não remove pareamento; dados de outra empresa e players sem ACTIVE são rejeitados.
- O frontend não deve usar F3B para override de campanhas comerciais nem como atestado de Proof-of-Play.

## Limitações assumidas
- Agendas já criadas **não podem ser substituídas automaticamente** no fluxo F3B; qualquer alteração ou renovação precisa de workflow versionado a ser implementado em iteração subsequente.
- O manifest publicado contempla apenas a janela revista (até 24 horas); não faz refresh automático de todos os dias. Não declarar reprodução contínua 24/7 nem offline sem UX11.
- Se a janela contém buracos (por exemplo, período fora dos dias/horários permitidos), preflight exige ajuste, sem publicar material incompleto.

## Testes locais
`node --experimental-strip-types --test scripts/ux10-guided-publication.test.mjs scripts/ux10-guided-content.test.mjs scripts/ux09-operational-screens-contract.test.mjs`
`npm run security:scan`
`npm run build`

**Não rodar C07/C09, AWS, migrações, flags ou QA visual nesta rodada.**
