import type { AssistantStructuredBlock } from '../../../types/assistant';
export const KNOWN_ASSISTANT_BLOCKS = new Set(['clarification','media_plan','proposal_draft','proposal_review','proposal_tracking','reservation','campaign_operations','operational_briefing','import','automation','metrics','error']);
export function isAssistantStructuredBlock(value: unknown): value is AssistantStructuredBlock {
  if (!value || typeof value !== 'object') return false;
  const item=value as Record<string,unknown>;
  return typeof item.type==='string' && KNOWN_ASSISTANT_BLOCKS.has(item.type) && item.version===1 && typeof item.generatedAt==='string' && !!item.payload && typeof item.payload==='object' && !Array.isArray(item.payload);
}
export function parseAssistantBlocks(value: unknown) { return Array.isArray(value) ? value.filter(isAssistantStructuredBlock).slice(0,20) : []; }
