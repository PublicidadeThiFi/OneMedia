# OneMedia — UX09/F2 | Minhas telas operacionais (candidato frontend)

`DoohOperationalScreensPanel` acrescenta cadastro de tela por nome sem inventário, escolha horizontal/vertical e preferência fit, associação de Player já pareado, busca pelo nome e paginação. Mantém `DoohPlayerInventoryReadOnly` e a seção de pareamento antiga, preservando o legado.

A API nova ainda exige release backend com migração aditiva e allowlist. Até esse gate, respostas HTTP 404/403/503 são tratadas como indisponibilidade do novo recurso e o inventário antigo continua acessível. Nenhuma alteração em Player Web, Cakto, grants, agendas e publicação.

Conferência estática: TypeScript transpileModule dos novos arquivos e 5 testes do contrato frontend PASS. Build Vite, scripts integrais e homologação visual no Mac estão **pendentes**, não são declarados concluídos.

A preferência fit armazenada no cadastro não é aplicada fisicamente ao Player nesta etapa. Isso depende da integração de programação UX10.
