# UX12/F5 — orientação contextual

Base: frontend master `442fa6fa50f223b8bb49bf4d792329c72ce93ceb` (atual61). Somente frontend; não altera APIs, DTOs, CAS, flags, infraestrutura, billing ou CI.

- Próximo passo por estado real da tela e permissão; somente leitura sem controles de escrita. Cadastro recolhido quando já existem telas. O contexto de usuário/empresa/role reinicializa a seleção local.
- Editor por tela: orientação por conteúdo, ordem não salva, upload e prontidão; ações principais destacadas. Upload recém-preparado é selecionado somente se não houver mídia escolhida; escolha manual preservada durante consultas. Após adição confirmada, libera a próxima escolha. Polling somente quando o servidor indicar preparo automático; até 60 consultas; pausa durante edição de ordem, upload ou publicação. Ordem não salva bloqueia outras mutações, atualização e publicação; descarte explícito. A navegação externa pode desmontar o editor, portanto o rascunho persistido é a única garantia entre rotas.
- Mensagens de upload e conflito sem siglas internas, orientação do fluxo manual quando a capability estiver desativada. Validação junto a nome/duração/período, foco no título do editor, estados anunciados e aria-expanded. Confirmação única e fallback avançado mantêm os mesmos endpoints e condições.
- Conexão inicial permanece no fluxo existente de pareamento e associação; o usuário retorna a Minhas telas para vincular o dispositivo. Não há alteração de APIs para substituir publicação existente ou reatribuir destino.

Validação na preparação: 70/70 testes Node dirigidos (6 novos; 64 regressões, incluindo inspeção do serviço backend atual186), sintaxe TS/TSX dos sete arquivos, security scan dos arquivos presentes e git diff --check. Não executados Vite build, typecheck integral, teste DOM/navegador ou teste de operador; validar build no Mac e homologação final. Sem alteração de produção.
