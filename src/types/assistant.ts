import type { Page } from './app-page';

export type AssistantMessageRole = 'assistant' | 'user' | 'system';
export type AssistantActionType = 'navigate' | 'execute';
export type AssistantActionKind = 'read' | 'write';
export type AssistantExecutionStatus =
  | 'completed'
  | 'blocked'
  | 'pending_confirmation'
  | 'not_available';

export interface AssistantScreenContext {
  currentModule?: Page | null;
  currentPath?: string | null;
  currentTitle?: string | null;
  selectedEntityType?: string | null;
  selectedEntityId?: string | null;
  selectedEntityLabel?: string | null;
}

export interface AssistantDataPoint {
  id: string;
  label: string;
  value: string;
  description?: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning';
}

export interface AssistantActionSuggestion {
  id: string;
  key: string;
  type: AssistantActionType;
  kind: AssistantActionKind;
  label: string;
  description?: string;
  targetModule?: Page | null;
  targetPath?: string | null;
  autoExecute?: boolean;
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
  payload?: Record<string, unknown> | null;
}

export interface AssistantMessage {
  id: string;
  role: AssistantMessageRole;
  content: string;
  createdAt: string;
  actions?: AssistantActionSuggestion[];
  dataPoints?: AssistantDataPoint[];
}

export interface AssistantProviderInfo {
  name: string;
  mode: string;
}

export interface AssistantExecutionInfo {
  key?: string;
  kind?: AssistantActionKind;
  confirmed?: boolean;
  status?: AssistantExecutionStatus;
}

export interface AssistantHistoryEntry {
  id: string;
  type: 'chat' | 'action' | 'system';
  summary: string;
  createdAt: string;
  moduleKey?: string | null;
  actionKey?: string | null;
  status?: string | null;
}

export interface AssistantChatResponse {
  reply: AssistantMessage;
  provider: AssistantProviderInfo;
  capabilities: string[];
  suggestedPrompts: string[];
  proactivePrompts?: string[];
  memorySummary?: string | null;
  history?: AssistantHistoryEntry[];
  resolvedIntent?:
    | 'navigate'
    | 'read_summary'
    | 'context_help'
    | 'write_request'
    | 'inventory_search'
    | 'dashboard_analytics'
    | 'financial_analytics'
    | 'decision_support'
    | 'general_help';
  actionExecution?: AssistantExecutionInfo;
  context: {
    currentModule?: string | null;
    currentModuleLabel?: string | null;
    currentPath?: string | null;
    company?: {
      id?: string | null;
      name?: string | null;
    } | null;
    user?: {
      id?: string | null;
      name?: string | null;
      roles?: string[];
    } | null;
  };
}
