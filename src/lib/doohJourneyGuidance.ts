import type { OperationalScreen } from './doohOperationalScreenContract';

export function screenNextStep(screen: OperationalScreen, writable: boolean) {
  if (!writable) return { action: 'view', text: 'Você pode consultar esta tela. Peça a um administrador para fazer alterações.' } as const;
  switch (screen.status) {
    case 'WAITING_FOR_PLAYER': return { action: 'connect', text: 'Conecte um aparelho para poder publicar. Você também pode preparar o conteúdo antes.' } as const;
    case 'PLAYER_INACTIVE': return { action: 'attention', text: 'O aparelho precisa estar ativo antes de receber programação.' } as const;
    case 'NO_RECENT_CONTACT': return { action: 'attention', text: 'Confira a conexão do aparelho. Não é possível confirmar a exibição atual.' } as const;
    case 'UPDATE_PENDING': return { action: 'wait', text: 'O aparelho está baixando a nova programação. Ela começa sozinha quando terminar.' } as const;
    case 'INSTALL_FAILED': return { action: 'attention', text: 'O aparelho tentou instalar e não conseguiu. Veja o motivo abaixo; ele tenta de novo automaticamente.' } as const;
    case 'WAITING_FOR_PROGRAMMING': return { action: 'content', text: 'Escolha imagens ou vídeos e defina quando devem aparecer.' } as const;
    case 'VERSION_REPORTED': return { action: 'content', text: 'A programação está instalada, mas o aparelho ainda não informou que está exibindo. Confira se o Player está aberto na tela.' } as const;
    case 'PLAYING': return { action: 'content', text: 'O aparelho informou que está exibindo a programação atual.' } as const;
  }
}

export function contentNextStep(input: { uploadOpen: boolean; uploadedStatus?: string; trackingUpload: boolean; readyCount: number; itemCount: number; unavailableItems: boolean; orderDirty: boolean; selectedMedia: boolean; canAdd: boolean; busy: boolean }) {
  if (input.busy) return { action: 'wait', text: 'Aguarde a operação atual terminar.' } as const;
  if (input.orderDirty) return { action: 'save', text: 'Salve a nova ordem antes de continuar.' } as const;
  if (input.uploadOpen) return { action: 'upload', text: 'Escolha uma imagem ou vídeo para enviar.' } as const;
  if (input.trackingUpload && input.uploadedStatus !== 'READY' && input.uploadedStatus !== 'ERROR') return { action: 'wait', text: 'Acompanhe o preparo do arquivo ou escolha outro arquivo pronto.' } as const;
  if (input.unavailableItems) return { action: 'fix', text: 'Remova ou substitua arquivos indisponíveis antes de publicar.' } as const;
  if (input.canAdd) return { action: 'add', text: 'Adicione o arquivo escolhido à sequência desta tela.' } as const;
  if (input.selectedMedia) return { action: 'select', text: 'Confira o arquivo preparado e o tempo de exibição.' } as const;
  if (input.itemCount > 0) return { action: 'publish', text: 'Confira a sequência e configure a exibição.' } as const;
  if (input.readyCount > 0) return { action: 'select', text: 'Escolha um arquivo pronto para adicionar à tela.' } as const;
  return { action: 'upload', text: 'Envie sua primeira imagem ou vídeo.' } as const;
}
