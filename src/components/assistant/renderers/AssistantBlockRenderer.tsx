import type { ReactNode } from 'react';
import type { AssistantStructuredBlock } from '../../../types/assistant';
import { parseAssistantBlocks } from './assistant-block.guards';
export interface AssistantBlockRenderer { type:AssistantStructuredBlock['type']; render:(block:AssistantStructuredBlock)=>ReactNode }
const text = (block:AssistantStructuredBlock) => String(block.payload.summary || block.payload.message || block.payload.title || 'Conteúdo estruturado disponível.').slice(0,1000);
const card = (title:string,block:AssistantStructuredBlock) => <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs"><b>{title}</b><p className="mt-1 whitespace-pre-wrap text-slate-600">{text(block)}</p></div>;
export const assistantBlockRenderers:AssistantBlockRenderer[] = [
  ['clarification','Esclarecimento'],['media_plan','Plano de mídia'],['proposal_draft','Rascunho de proposta'],['proposal_review','Revisão da proposta'],['proposal_tracking','Acompanhamento da proposta'],['reservation','Reserva'],['campaign_operations','Operação da campanha'],['operational_briefing','Briefing operacional'],['import','Importação'],['automation','Automação'],['metrics','Métricas'],['error','Não foi possível concluir'],
].map(([type,title])=>({type:type as AssistantStructuredBlock['type'],render:(block)=>card(title,block)}));
export function AssistantStructuredBlocks({blocks}:{blocks:unknown}) { return <>{parseAssistantBlocks(blocks).map((block,index)=>{const renderer=assistantBlockRenderers.find(item=>item.type===block.type);return <div key={`${block.type}-${block.generatedAt}-${index}`}>{renderer?renderer.render(block):card('Conteúdo não reconhecido',block)}</div>})}</>; }
