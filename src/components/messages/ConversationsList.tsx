import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search } from 'lucide-react';

export interface ConversationSummary {
  key: string;
  id: string;
  type: 'proposal' | 'campaign';
  clientName: string;
  proposalId?: string;
  proposalTitle?: string | null;
  campaignId?: string;
  campaignName?: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

interface ConversationsListProps {
  conversations: ConversationSummary[];
  selectedConversationKey: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (conversation: ConversationSummary) => void;
}

export function ConversationsList({
  conversations,
  selectedConversationKey,
  searchQuery,
  onSearchChange,
  onSelectConversation,
}: ConversationsListProps) {
  // Filtro textual por nome do cliente, título/ID da proposta/campanha, ou trecho da última mensagem
  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase();
    const proposalLabel = (conv.proposalTitle || conv.proposalId || '').toLowerCase();
    const campaignLabel = (conv.campaignName || conv.campaignId || '').toLowerCase();

    return (
      conv.clientName.toLowerCase().includes(query) ||
      proposalLabel.includes(query) ||
      campaignLabel.includes(query) ||
      (conv.proposalId || '').toLowerCase().includes(query) ||
      (conv.campaignId || '').toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col">
      {/* Campo de busca */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onSearchChange(e.target.value)
            }
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.key}
              onClick={() => onSelectConversation(conv)}
              className={`w-full p-4 rounded-lg text-left transition-colors ${
                selectedConversationKey === conv.key
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-gray-900">{conv.clientName}</h4>
                {conv.unreadCount > 0 && (
                  <Badge className="bg-indigo-600">{conv.unreadCount}</Badge>
                )}
              </div>

              {conv.type === 'proposal' && conv.proposalId && (
                <p className="text-xs text-gray-500 mb-1">
                  Proposta: {conv.proposalTitle || conv.proposalId}
                  {conv.proposalTitle && (
                    <span className="text-gray-400"> · {conv.proposalId}</span>
                  )}
                </p>
              )}

              {conv.type === 'campaign' && conv.campaignId && (
                <p className="text-xs text-gray-500 mb-1">
                  Campanha: {conv.campaignName || conv.campaignId}
                  {conv.campaignName && (
                    <span className="text-gray-400"> · {conv.campaignId}</span>
                  )}
                </p>
              )}

              <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
              <p className="text-xs text-gray-500 mt-1">
                {conv.lastMessageAt.toLocaleString('pt-BR')}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
