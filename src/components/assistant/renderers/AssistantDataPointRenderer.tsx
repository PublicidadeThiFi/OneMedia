import { getDataPointToneClasses } from '../../../lib/assistant';
import type { AssistantDataPoint } from '../../../types/assistant';
import { ProposalDraftChangePreviewCard } from '../ProposalDraftChangePreviewCard';
import { ProposalPdfResultCard } from '../ProposalPdfResultCard';
import { ProposalTrackingCard } from '../ProposalTrackingCard';
import { ProposalSendErrorCard } from '../ProposalSendErrorCard';
import { ReservationEligibilityCard } from '../ReservationEligibilityCard';
import { ReservationItemCard } from '../ReservationItemCard';
import { ExpiringReservationsCard } from '../ExpiringReservationsCard';
import { CampaignOperationalSummaryCard } from '../CampaignOperationalSummaryCard';
import { CampaignProgressCard } from '../CampaignProgressCard';
import { CampaignItemCard } from '../CampaignItemCard';
import { CampaignTimelineCard } from '../CampaignTimelineCard';
import { CampaignPendingActionsCard } from '../CampaignPendingActionsCard';
import { CampaignOperationalLimitationsCard } from '../CampaignOperationalLimitationsCard';
const specialized=[
  {can:(p:AssistantDataPoint)=>p.id==='change-preview',render:(p:AssistantDataPoint)=><ProposalDraftChangePreviewCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id==='proposal-pdf',render:(p:AssistantDataPoint)=><ProposalPdfResultCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('tracking-')||p.id.startsWith('unanswered-'),render:(p:AssistantDataPoint)=><ProposalTrackingCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id==='proposal-send-eligibility',render:(p:AssistantDataPoint)=><ProposalSendErrorCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id==='reservation-eligibility',render:(p:AssistantDataPoint)=><ReservationEligibilityCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('reservation-item-'),render:(p:AssistantDataPoint)=><ReservationItemCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('expiring-reservation-'),render:(p:AssistantDataPoint)=><ExpiringReservationsCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('campaign-summary-'),render:(p:AssistantDataPoint)=><CampaignOperationalSummaryCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('campaign-progress-'),render:(p:AssistantDataPoint)=><CampaignProgressCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('campaign-item-'),render:(p:AssistantDataPoint)=><CampaignItemCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('campaign-timeline-'),render:(p:AssistantDataPoint)=><CampaignTimelineCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('campaign-pending-'),render:(p:AssistantDataPoint)=><CampaignPendingActionsCard point={p}/>},
  {can:(p:AssistantDataPoint)=>p.id.startsWith('campaign-limitations-'),render:(p:AssistantDataPoint)=><CampaignOperationalLimitationsCard point={p}/>},
];
function fallback(point:AssistantDataPoint){return <div className={`rounded-xl border px-3 py-2 ${getDataPointToneClasses(point.tone)}`}><div className="text-[11px] font-medium uppercase tracking-wide opacity-75">{point.label}</div><div className="mt-1 text-sm font-semibold">{point.value}</div>{point.description?<div className="mt-1 text-[11px] leading-4 opacity-80">{point.description}</div>:null}</div>}
export function AssistantDataPointRenderer({points}:{points:AssistantDataPoint[]}){return <div className="mt-3 grid grid-cols-1 gap-2">{points.slice(0,10).map(point=><div key={point.id}>{specialized.find(item=>item.can(point))?.render(point)??fallback(point)}</div>)}</div>}
