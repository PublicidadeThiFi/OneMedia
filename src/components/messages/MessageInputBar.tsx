import { useState, useRef } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Paperclip } from 'lucide-react';

interface MessageInputBarProps {
  onSend: (messageText: string) => void;
  onAttach: (files: FileList) => void;
  disabled?: boolean;
}

export function MessageInputBar({ onSend, onAttach, disabled = false }: MessageInputBarProps) {
  const [messageText, setMessageText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmedText = messageText.trim();
    if (!trimmedText) {
      return; // Não enviar mensagem vazia
    }

    onSend(trimmedText);
    setMessageText(''); // Limpar input após enviar
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter envia mensagem, Shift+Enter quebra linha (neste caso, só Enter mesmo)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    // Abrir file picker do sistema
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAttach(files);
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Input hidden para file picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      />
      
      <div className="flex items-center gap-2">
        <Input
          placeholder="Digite sua mensagem..."
          value={messageText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAttachClick}
          disabled={disabled}
          title="Anexar arquivo"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          className="gap-2"
          onClick={handleSend}
          disabled={disabled || !messageText.trim()}
        >
          <Send className="w-4 h-4" />
          Enviar
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Canal: Email • WhatsApp (via integração futura)
      </p>
    </div>
  );
}