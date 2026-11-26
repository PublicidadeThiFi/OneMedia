# UX13/F6 — painel operacional por tela

- Minhas telas conserva versões reportada/desejada, última comunicação e credencial quando informadas pela API. Indicador e filtro de atenção por página (não global). Consulta por botão, sem polling que desmonte editor ou rascunhos.
- Diagnóstico avançado por tela consulta GET específico, valida identidades do tenant/tela/player e contrato, cancela requisições ao desmontar. Permissões existentes preservadas, inclusive consulta READ_ONLY; nenhuma ação de escrita nova.
- Exibe janela e integridade do manifesto reportado no servidor e último evento recebido, quando disponível; não equivale a cache verificado, licença válida, reprodução ao vivo ou audiência. Sem evidência offline, não presume exibição. API antiga sem rota mantém lista disponível e informa diagnóstico indisponível.
- Não modifica CI, Vercel, licenciamento, pareamento nem infraestrutura. Manter rollout e homologação separados.
