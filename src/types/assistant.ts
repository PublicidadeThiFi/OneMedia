import type { Page } from './app-page';

export type AssistantMessageRole = 'assistant' | 'user' | 'system';
export type AssistantActionType = 'navigate' | 'execute';
export type AssistantActionKind = 'read' | 'write';
export type AssistantExecutionStatus =
  | 'completed'
  | 'blocked'
  | 'pending_confirmation'
  | 'not_available';

export type AssistantIntent =
  | 'navigate'
  | 'read_summary'
  | 'operational_report'
  | 'context_help'
  | 'write_request'
  | 'inventory_search'
  | 'dashboard_analytics'
  | 'financial_analytics'
  | 'decision_support'
  | 'media_planning'
  | 'greeting'
  | 'general_help';

export type AssistantEntityType =
  | 'client' | 'legal_name' | 'trade_name' | 'cnpj'
  | 'city' | 'state' | 'region' | 'media_point' | 'media_unit'
  | 'product' | 'media_type' | 'proposal' | 'campaign' | 'period'
  | 'start_date' | 'end_date' | 'budget' | 'price' | 'status'
  | 'media_quantity' | 'objective' | 'audience' | 'estimated_reach';

export interface AssistantExtractedEntity {
  type: AssistantEntityType;
  rawValue: string;
  normalizedValue?: string | number | null;
  confidence: number;
  source: 'message' | 'screen_context' | 'conversation_context';
}

export interface AssistantInterpretation {
  intent: AssistantIntent;
  confidence: number;
  entities: AssistantExtractedEntity[];
  missingFields: AssistantEntityType[];
  ambiguities: Array<{
    entityType: AssistantEntityType;
    message: string;
    candidateIds?: string[];
    candidateLabels?: string[];
    candidates?: AssistantEntityCandidate[];
  }>;
  requiresClarification: boolean;
  executionAllowed: boolean;
  signals: string[];
  resolution?: AssistantEntityResolution;
}

export interface AssistantEntityCandidate {
  id: string;
  label: string;
  secondaryLabel?: string | null;
  city?: string | null;
  state?: string | null;
  maskedDocument?: string | null;
  status?: string | null;
  confidence: number;
  reason: string;
}

export interface AssistantResolvedEntity {
  type: AssistantEntityType;
  inputValue?: string | null;
  status: 'resolved' | 'ambiguous' | 'not_found' | 'missing' | 'invalid';
  confidence: number;
  resolvedId?: string | null;
  resolvedLabel?: string | null;
  normalizedValue?: string | number | null;
  source: 'database' | 'catalog' | 'conversation_context' | 'message';
  candidates?: AssistantEntityCandidate[];
  reason: string;
}

export interface AssistantEntityResolution {
  status: 'resolved' | 'blocked' | 'partial';
  entities: AssistantResolvedEntity[];
  unresolvedTypes: AssistantEntityType[];
  ambiguities: AssistantInterpretation['ambiguities'];
  canAdvance: boolean;
  nextStep: string;
}

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

export interface AssistantQuickReply {
  label: string;
  value: string;
}

export type AssistantExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';
export interface AssistantOperationalException {
  key: string; source: 'proposals' | 'reservations' | 'campaigns' | 'inventory' | 'financial'; type: string;
  severity: AssistantExceptionSeverity; priorityScore: number; title: string; summary: string; entityLabel?: string;
  occurredAt: string; suggestedPrompt: string;
}
export interface AssistantImportFieldResult { field:string; sourceValue?:unknown; normalizedValue?:unknown; status:'valid'|'warning'|'invalid'|'missing'|'modified'; message?:string }
export interface AssistantImportRow { rowId:string; sourceIndex:number; selected:boolean; deleted?:boolean; status:'valid'|'warning'|'invalid'|'possible_duplicate'|'confirmed_duplicate'|'ready'|'executing'|'success'|'failed'|'skipped'; originalData:Record<string,unknown>; normalizedData:Record<string,unknown>; fieldResults:AssistantImportFieldResult[]; duplicateCandidates:Array<{candidateReference:string;label:string;reason:string;confidence:number;result:string}>; warnings:string[]; errors:string[]; executionResult?:{status:string;message:string;attempt:number;completedAt?:string} }
export interface AssistantImportSession { sessionId:string;version:number;importType:'clients'|'products'|'media_points';sourceFile:{name:string;extension:string;size:number;sourceType:string};status:string;createdAt:string;updatedAt:string;expiresAt:string;rows:AssistantImportRow[];summary:{total:number;valid:number;warnings:number;invalid:number;possibleDuplicates:number;selected:number;notSelected:number;withImage:number;withoutImage:number;withoutGeocoding:number;financialTotal?:number};warnings:string[];blockingIssues:string[];persistence:'in_memory';progress?:{total:number;processed:number;successes:number;failures:number;skipped:number;percent:number;elapsedMs:number;cancellable:boolean} }

export type AssistantAvailabilityStatus = 'available' | 'unavailable' | 'partially_available' | 'unknown' | 'invalid';
export interface AssistantMediaCandidate {
  id: string; mediaPointId: string; mediaUnitId: string; displayName: string; code: string; mediaType: string;
  city: string | null; state: string | null; address: string | null; region: string | null; photoUrl: string | null;
  availability: AssistantAvailabilityStatus; availabilityReason: string; price: number | null;
  priceOrigin: 'unit' | 'media_point' | 'none'; priceUnit: 'month' | 'week' | 'day' | 'period' | 'unknown';
  priceEstimated: boolean; estimatedReach: number | null; score: { total: number; reasons: string[] } | null;
  recommendationReasons: string[]; alerts: string[]; missingData: string[];
}
export interface AssistantMediaPlan {
  briefing: { client: { label: string }; city: string; state: string; startDate: string; endDate: string; budget: number };
  consultedCount: number; eligibleCount: number; recommendedCount: number;
  recommended: AssistantMediaCandidate[]; alternatives: AssistantMediaCandidate[];
  totalValue: number; budget: number; remainingBudget: number; budgetUsedPercent: number; estimatedReachTotal: number | null;
  geographicCoverage: { regions: string[]; repeatedRegions: string[]; detailed: boolean };
  limitations: string[]; alerts: string[]; status: 'ready' | 'limited' | 'empty' | 'blocked'; nextStep: string;
  readOnly: true; noActionExecuted: true;
}
export interface AssistantMediaPlanState {
  planId: string; version: number; createdAt: string; updatedAt: string; expiresAt: string; command: string;
  addedFaces: string[]; removedFaces: string[]; previousTotal: number | null; previousBudget: number | null;
  status: 'draft' | 'adjusted' | 'ready_for_confirmation' | 'expired' | 'invalid';
}

export interface AssistantMessage {
  id: string;
  role: AssistantMessageRole;
  content: string;
  createdAt: string;
  actions?: AssistantActionSuggestion[];
  dataPoints?: AssistantDataPoint[];
  quickReplies?: AssistantQuickReply[];
  interpretation?: AssistantInterpretation;
  mediaPlan?: AssistantMediaPlan;
  mediaPlanState?: AssistantMediaPlanState;
  operationalExceptions?: AssistantOperationalException[];
  blocks?: AssistantStructuredBlock[];
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
  meta?: {
    created?: boolean;
    reused?: boolean;
    entityId?: string | null;
    entityName?: string | null;
  };
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

export interface AssistantMissingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  options?: string[];
}

export interface AssistantEnrichmentUnit {
  actionId: string;
  label: string;
  action: AssistantActionSuggestion;
}

export interface AssistantPendingEnrichment {
  entityId: string;
  entityName: string;
  mediaType: string;
  queuePosition: number;
  totalItems: number;
  units: AssistantEnrichmentUnit[];
  missingFields: AssistantMissingField[];
}

export interface AssistantPendingClientEnrichment {
  entityId: string;
  entityName: string;
  queuePosition: number;
  totalItems: number;
  missingFields: AssistantMissingField[];
}

export interface AssistantPendingClientReview {
  queuePosition: number;
  totalItems: number;
  extractedRecord: Record<string, unknown>;
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
    | 'media_planning'
    | 'general_help';
  interpretation?: AssistantInterpretation;
  mediaPlan?: AssistantMediaPlan;
  mediaPlanState?: AssistantMediaPlanState;
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
export type AssistantAutomationFrontendState='idle'|'drafting'|'needs_clarification'|'preview_ready'|'awaiting_confirmation'|'creating'|'active'|'paused'|'updating'|'executing'|'success'|'partial'|'failed'|'blocked'|'temporary'|'expired'|'deleting';
export interface AssistantAutomation { automationReference:string;type:string;title:string;description:string;status:string;schedule?:{mode:string;time?:string;weekdays?:number[];startAt?:string};condition?:{source:string;conditionType:string;operator:string;expectedValue?:unknown};filters:Array<{field:string;operator:string;value:unknown}>;delivery:{channel:string};timezone:string;nextExecutionAt?:string;lastExecutionAt?:string;expiresAt?:string;limitations:string[];persistence:'in_memory';actions:string[] }
export interface AssistantAutomationExecution { trigger:string;startedAt:string;completedAt?:string;status:string;resultSummary?:string;resultCount?:number;results?:Array<{title:string;summary:string;severity?:string;source?:string}>;limitations:string[];suppressedCount?:number }

export interface AssistantBlockBase { type:string;version:number;generatedAt:string }
type AssistantPayloadBlock<T extends string> = AssistantBlockBase & { type:T;payload:Record<string,unknown> };
export type AssistantStructuredBlock =
  | AssistantPayloadBlock<'clarification'> | AssistantPayloadBlock<'media_plan'>
  | AssistantPayloadBlock<'proposal_draft'> | AssistantPayloadBlock<'proposal_review'>
  | AssistantPayloadBlock<'proposal_tracking'> | AssistantPayloadBlock<'reservation'>
  | AssistantPayloadBlock<'campaign_operations'> | AssistantPayloadBlock<'operational_briefing'>
  | AssistantPayloadBlock<'import'> | AssistantPayloadBlock<'automation'>
  | AssistantPayloadBlock<'metrics'> | AssistantPayloadBlock<'error'>;
export interface AssistantSafeError { code:string;category:'validation'|'permission'|'ambiguity'|'expired'|'conflict'|'external_contract'|'temporary'|'internal';title:string;message:string;recoverable:boolean;suggestedAction?:string }
export interface AssistantResponseEnvelope { message:{content:string};interpretation?:AssistantInterpretation;blocks:AssistantStructuredBlock[];actions:AssistantActionSuggestion[];warnings:Array<{code:string;message:string}>;limitations:string[];metadata:{generatedAt:string;contractVersion:1;truncated?:boolean} }
