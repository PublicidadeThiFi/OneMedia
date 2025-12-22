import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search } from 'lucide-react';

export interface ConversationSummary {
  id: string;
  type: 'proposal' | 'campaign';
  clientName: string;
  proposalId?: string;
  campaignId?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

interface ConversationsListProps {
  conversations: ConversationSummary[];
  selectedConversationId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (conversation: ConversationSummary) => void;
}

export function ConversationsList({
  conversations,
  selectedConversationId,
  searchQuery,
  onSearchChange,
  onSelectConversation,
}: ConversationsListProps) {
  const query = searchQuery.trim().toLowerCase();

  const filteredConversations = conversations.filter((conv) => {
    if (!query) return true;
    return (
      conv.clientName.toLowerCase().includes(query) ||
      (conv.proposalId || '').toLowerCase().includes(query) ||
      (conv.campaignId || '').toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

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
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={`w-full p-4 rounded-lg text-left transition-colors ${
                selectedConversationId === conv.id
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-gray-900">{conv.clientName}</h4>
                {conv.unreadCount > 0 && <Badge className="bg-indigo-600">{conv.unreadCount}</Badge>}
              </div>
              {conv.proposalId && (
                <p className="text-xs text-gray-500 mb-1">Proposta: {conv.proposalId}</p>
              )}
              {conv.campaignId && (
                <p className="text-xs text-gray-500 mb-1">Campanha: {conv.campaignId}</p>
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
