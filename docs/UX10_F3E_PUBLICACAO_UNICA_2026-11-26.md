# UX10/F3E — primeira publicação em uma confirmação

Base: frontend `803ca478a3ac4423b95ec0c53e9e8bcf65fd7eb4` (PR #232). Backend F3E deve ser integrado; ausência ou negativa de capability mantém operação avançada existente.

- No editor de conteúdo por tela, apresentar o nome da tela/dispositivo, mídias em ordem, duração, início/fim, fuso, dias e horário diário. O botão **Confirmar e publicar** envia uma requisição de orquestração ao servidor, sem encadear POSTs no cliente.
- Bloquear enquanto a ordem local não foi salva, enquanto existem requisições de edição/publicação, ou sem autorização e player ativo independente. Validar resposta por tela, player, versão permitida, agenda e versão do manifesto.
- Em falha, reler o rascunho e a agenda reais. A próxima confirmação explicita retomada, usa o período persistido quando houver agenda e deixa o backend comparar o conteúdo imutável. A operação avançada fica acessível e nenhum estado é apresentado como exibição física.
- F3E é publicação inicial, não edição automática de agendas publicadas. Renovação delegada depende de F3D/gates e UX11 ainda precisa fechar a reconexão/offline. Sem alteração de Player Web, AWS ou cobrança.

Validação candidata: 6 testes de contrato novos + 28 regressões anteriores (34/34 Node), typecheck isolado do contrato e transpilação TS/TSX. Build Vite e validação operacional ainda pendentes no Mac e no rollout autorizado.
