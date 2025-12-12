import { useEffect, useRef } from 'react';
import { Badge } from '../ui/badge';
import { Message, MessageDirection, MessageChannel, MessageSenderType } from '../../types';

interface MessageThreadProps {
  messages: Message[];
}

export function MessageThread({ messages }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para última mensagem quando a thread mudar
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getChannelIcon = (channel: MessageChannel) => {
    switch (channel) {
      case MessageChannel.EMAIL:
        return '📧';
      case MessageChannel.WHATSAPP:
        return '💬';
      case MessageChannel.SYSTEM:
        return '🔔';
    }
  };

  const getChannelLabel = (channel: MessageChannel) => {
    switch (channel) {
      case MessageChannel.EMAIL:
        return 'Email';
      case MessageChannel.WHATSAPP:
        return 'WhatsApp';
      case MessageChannel.SYSTEM:
        return 'Sistema';
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Nenhuma mensagem ainda</p>
          <p className="text-gray-400 text-sm">
            Envie a primeira mensagem para o cliente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.direction === MessageDirection.OUT ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[70%] rounded-lg p-4 ${
              message.direction === MessageDirection.OUT
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {/* Chips de canal e tipo de remetente */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`text-xs ${
                  message.direction === MessageDirection.OUT
                    ? 'opacity-75'
                    : 'opacity-60'
                }`}
              >
                {getChannelIcon(message.channel)} {getChannelLabel(message.channel)}
              </span>
              {message.senderType === MessageSenderType.CLIENTE && (
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    message.direction === MessageDirection.OUT
                      ? 'border-white/50 text-white'
                      : 'border-gray-400 text-gray-700'
                  }`}
                >
                  Cliente
                </Badge>
              )}
              {message.senderType === MessageSenderType.USER && (
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    message.direction === MessageDirection.OUT
                      ? 'border-white/50 text-white'
                      : 'border-gray-400 text-gray-700'
                  }`}
                >
                  Usuário
                </Badge>
              )}
            </div>

            {/* Texto da mensagem */}
            <p className="mb-2 whitespace-pre-wrap">{message.contentText}</p>

            {/* Nome do remetente e data/hora */}
            <div
              className={`flex items-center justify-between text-xs ${
                message.direction === MessageDirection.OUT ? 'opacity-75' : 'opacity-60'
              }`}
            >
              <span>{message.senderName}</span>
              <span>
                {new Date(message.createdAt).toLocaleDateString('pt-BR')} às{' '}
                {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      ))}
      {/* Ref para auto-scroll */}
      <div ref={messagesEndRef} />
    </div>
  );
}
