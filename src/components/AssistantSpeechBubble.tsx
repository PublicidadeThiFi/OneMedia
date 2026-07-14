/**
 * AssistantSpeechBubble
 * Notificações proativas acima do botão do assistente.
 * Cada balão contém uma mensagem específica e humanizada derivada
 * dos dados reais da conta do usuário.
 */
import { useEffect, useRef, useState } from 'react';
import {
  X,
  AlertTriangle,
  MessageSquare,
  Clock,
  FileX,
  Bell,
  Sparkles,
  ReceiptText,
} from 'lucide-react';
import { useAssistant } from '../contexts/AssistantContext';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface DataPoint {
  id?: string;
  label?: string;
  value?: string;
  description?: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
}

interface Briefing {
  shouldNotify?: boolean;
  severity?: 'info' | 'warning' | 'critical';
  dataPoints?: DataPoint[];
}

type IconKey = 'alert' | 'message' | 'clock' | 'expired' | 'bell' | 'invoice' | 'idle';

interface Notification {
  text: string;
  iconKey: IconKey;
  level: 'critical' | 'warning' | 'info';
}

// ── Constantes ────────────────────────────────────────────────────────────────

const IDLE_NOTIFICATIONS: Notification[] = [
  { text: 'Posso resumir sua operação a qualquer momento.', iconKey: 'idle', level: 'info' },
  { text: 'Precisa de ajuda? É só falar comigo!', iconKey: 'idle', level: 'info' },
  { text: 'Tenho acesso a contratos, mensagens e inventário.', iconKey: 'idle', level: 'info' },
];

const DURATION_MS = 6000;
const DELAY_MS = 3000;
const MAX_CYCLES = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(value?: string): number {
  const n = parseInt(value ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}

function extractFirstPointName(description?: string): string | null {
  if (!description) return null;
  const m = description.match(/Pontos liberados:\s*([^—,([\n]+?)(?:\s*\(|\s*—|,|$)/);
  return m ? m[1].trim() : null;
}

function extractAlertTitles(description?: string): string[] {
  if (!description) return [];
  const body = description.replace(/^Alertas da plataforma:\s*/i, '');
  const parts = body.split(/,(?=\s*(?:Alta|Média|Baixa|Alerta):)/i);
  return parts
    .map((part) => {
      const m = part.trim().match(/^(?:Alta|Média|Baixa|Alerta):\s*([^(]+?)(?:\s*\(|$)/i);
      return m ? m[1].trim() : '';
    })
    .filter((title) => title.length > 0 && !title.toLowerCase().includes('mock'));
}

function buildNotifications(briefing: Briefing | null): Notification[] {
  if (!briefing?.dataPoints?.length) return IDLE_NOTIFICATIONS;

  const dp: Record<string, DataPoint> = {};
  for (const point of briefing.dataPoints) {
    if (point.id) dp[point.id] = point;
  }

  const list: Notification[] = [];

  // 1. Pontos liberados por encerramento de contrato
  const recentlyExpired = dp['login-contracts-recently-expired'];
  const expiredCount = num(recentlyExpired?.value);
  if (expiredCount > 0) {
    const pointName = extractFirstPointName(recentlyExpired?.description);
    list.push({
      text:
        expiredCount === 1 && pointName
          ? `O contrato do ponto "${pointName}" encerrou — ele está disponível novamente!`
          : expiredCount === 1
            ? 'Um contrato foi encerrado e o ponto está disponível novamente.'
            : `${expiredCount} contratos foram encerrados — pontos liberados para nova ocupação.`,
      iconKey: 'expired',
      level: 'warning',
    });
  }

  // 2. Contratos aguardando assinatura
  const pendingSigCount = num(dp['login-contracts-pending-signature']?.value);
  if (pendingSigCount > 0) {
    list.push({
      text:
        pendingSigCount === 1
          ? 'Você tem 1 contrato aguardando assinatura.'
          : `Você tem ${pendingSigCount} contratos aguardando assinatura.`,
      iconKey: 'clock',
      level: 'warning',
    });
  }

  // 3. Contratos vencendo em 30 dias
  const expiringSoonCount = num(dp['login-contracts-expiring-soon']?.value);
  if (expiringSoonCount > 0) {
    list.push({
      text:
        expiringSoonCount === 1
          ? '1 contrato vence nos próximos 30 dias — revise antes do prazo.'
          : `${expiringSoonCount} contratos vencem nos próximos 30 dias.`,
      iconKey: 'clock',
      level: 'warning',
    });
  }

  // 4. Clientes aguardando resposta
  const noResponseCount = num(dp['login-client-pending-responses']?.value);
  if (noResponseCount > 0) {
    list.push({
      text:
        noResponseCount === 1
          ? 'Há 1 cliente aguardando sua resposta.'
          : `Há ${noResponseCount} clientes aguardando sua resposta.`,
      iconKey: 'message',
      level: 'warning',
    });
  }

  // 5. Novas mensagens de clientes (só se não há "sem retorno" para não duplicar)
  const clientMsgsCount = num(dp['login-client-messages']?.value);
  if (clientMsgsCount > 0 && noResponseCount === 0) {
    list.push({
      text:
        clientMsgsCount === 1
          ? 'Você recebeu 1 nova mensagem de cliente.'
          : `Você recebeu ${clientMsgsCount} novas mensagens de clientes.`,
      iconKey: 'message',
      level: 'warning',
    });
  }

  // 6. Solicitações pendentes
  const pendingReqCount = num(dp['login-pending-requests']?.value);
  if (pendingReqCount > 0) {
    list.push({
      text:
        pendingReqCount === 1
          ? '1 solicitação aguarda sua análise.'
          : `${pendingReqCount} solicitações aguardam sua análise.`,
      iconKey: 'alert',
      level: 'warning',
    });
  }

  // 7. Próximo do limite de pontos do plano
  const pointsLimit = dp['login-plan-points-limit'];
  if (pointsLimit?.tone === 'warning') {
    list.push({
      text: `Você está próximo do limite de pontos do seu plano (${pointsLimit.value ?? ''}).`,
      iconKey: 'alert',
      level: 'warning',
    });
  }

  // 8. Assinatura vencendo em breve
  const subExpiringDays = num(dp['login-subscription-expiring-soon']?.value?.replace(/\D/g, ''));
  if (subExpiringDays > 0) {
    list.push({
      text: `Sua assinatura vence em ${subExpiringDays} dia${subExpiringDays === 1 ? '' : 's'} — renove para manter o acesso.`,
      iconKey: 'bell',
      level: 'critical',
    });
  }

  // 9. Assinatura com status problemático
  const subStatus = dp['login-subscription-status'];
  if (subStatus?.tone === 'warning') {
    const statusLabel = subStatus.value?.split(' •')[0]?.toLowerCase() ?? 'com problema';
    list.push({ text: `Atenção: sua assinatura está ${statusLabel}.`, iconKey: 'bell', level: 'critical' });
  }

  // 10. Faturas vencidas
  const invoices = dp['login-platform-invoices-open'];
  if (invoices?.tone === 'warning') {
    list.push({ text: 'Você tem faturas da plataforma vencidas — verifique o financeiro.', iconKey: 'invoice', level: 'critical' });
  }

  // 11. Alertas reais do dashboard (filtra mocks)
  const opAlerts = dp['login-operational-alerts'];
  const opAlertsCount = num(opAlerts?.value);
  if (opAlertsCount > 0) {
    const titles = extractAlertTitles(opAlerts?.description);
    if (titles.length > 0) {
      const text =
        titles.length === 1
          ? `Alerta: ${titles[0]}.`
          : `${opAlertsCount} alertas ativos — ex.: ${titles.slice(0, 2).join(' e ')}.`;
      list.push({ text, iconKey: 'bell', level: 'warning' });
    }
  }

  return list.length > 0 ? list : IDLE_NOTIFICATIONS;
}

// ── Estilos ───────────────────────────────────────────────────────────────────

interface BubbleStyle { bg: string; tailColor: string; border: string; glowColor: string; iconColor: string; }

function styleForLevel(level: Notification['level']): BubbleStyle {
  switch (level) {
    case 'critical': return { bg: 'linear-gradient(135deg,#dc2626 0%,#7f1d1d 100%)', tailColor: '#7f1d1d', border: 'rgba(252,165,165,0.4)', glowColor: 'rgba(220,38,38,0.6)', iconColor: 'rgba(254,226,226,0.95)' };
    case 'warning':  return { bg: 'linear-gradient(135deg,#b45309 0%,#78350f 100%)', tailColor: '#78350f', border: 'rgba(253,230,138,0.4)', glowColor: 'rgba(180,83,9,0.6)',   iconColor: 'rgba(254,243,199,0.95)' };
    default:         return { bg: 'linear-gradient(135deg,#1d4ed8 0%,#1e3a5f 100%)', tailColor: '#1e3a5f', border: 'rgba(147,197,253,0.3)', glowColor: 'rgba(29,78,216,0.5)',  iconColor: 'rgba(191,219,254,0.95)' };
  }
}

function Icon({ iconKey }: { iconKey: IconKey }) {
  switch (iconKey) {
    case 'clock':   return <Clock size={15} />;
    case 'expired': return <FileX size={15} />;
    case 'message': return <MessageSquare size={15} />;
    case 'bell':    return <Bell size={15} />;
    case 'invoice': return <ReceiptText size={15} />;
    case 'idle':    return <Sparkles size={15} />;
    default:        return <AlertTriangle size={15} />;
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function AssistantSpeechBubble() {
  const { loginBriefing, isOpen, setIsOpen } = useAssistant();
  const briefing = loginBriefing as Briefing | null;
  const isPanelOpen = isOpen;
  const onOpen = () => setIsOpen(true);
  const notificationsRef = useRef<Notification[]>(buildNotifications(briefing));

  const [index, setIndex]         = useState(0);
  const [visible, setVisible]     = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cyclesRef = useRef(0);

  function stopAll() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (delayRef.current) { clearTimeout(delayRef.current);  delayRef.current = null; }
  }

  useEffect(() => {
    if (dismissed) return;

    delayRef.current = setTimeout(() => {
      setIndex(0);
      setVisible(true);

      const total = notificationsRef.current.length;
      if (total <= 1) return;

      timerRef.current = setInterval(() => {
        setIndex((prev) => {
          const next = prev + 1;
          if (next >= total) {
            cyclesRef.current += 1;
            if (cyclesRef.current >= MAX_CYCLES) { stopAll(); setVisible(false); return prev; }
            return 0;
          }
          return next;
        });
      }, DURATION_MS);
    }, DELAY_MS);

    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed]);

  useEffect(() => {
    if (isPanelOpen && visible) { stopAll(); setVisible(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPanelOpen]);

  if (!visible || dismissed) return null;

  const notification = notificationsRef.current[index] ?? notificationsRef.current[0];
  const total = notificationsRef.current.length;
  const s = styleForLevel(notification.level);

  return (
    <div style={{ position: 'fixed', right: '1.25rem', bottom: 'calc(max(1.5rem, env(safe-area-inset-bottom)) + 4.75rem)', zIndex: 2147483646, maxWidth: 'min(290px, calc(100vw - 2.5rem))', animation: 'assistant-bubble-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}>

      {/* Brilho pulsante */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: '-10px', borderRadius: '24px', background: s.glowColor, filter: 'blur(18px)', opacity: 0.75, zIndex: -1, animation: 'bubble-glow-pulse 2.5s ease-in-out infinite' }} />

      {/* Corpo — clicável para abrir o chat */}
      <div
        role="button" tabIndex={0} aria-label="Abrir assistente"
        onClick={() => { stopAll(); setVisible(false); onOpen(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { stopAll(); setVisible(false); onOpen(); } }}
        style={{ position: 'relative', background: s.bg, borderRadius: '16px', padding: '13px 40px 13px 14px', border: `1.5px solid ${s.border}`, cursor: 'pointer', userSelect: 'none', boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)' }}
      >
        {/* Ícone + texto */}
        <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', animation: 'assistant-bubble-msg 0.35s ease-out both' }}>
          <span style={{ color: s.iconColor, flexShrink: 0, marginTop: '2px' }}>
            <Icon iconKey={notification.iconKey} />
          </span>
          <p style={{ margin: 0, color: '#fff', fontSize: '13.5px', fontWeight: 700, lineHeight: 1.45, letterSpacing: '0.01em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {notification.text}
          </p>
        </div>

        {/* Barra de progresso */}
        {total > 1 && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '10px', paddingLeft: '25px', alignItems: 'center' }}>
            {notificationsRef.current.map((_, i) => (
              <div key={i} style={{ height: '3px', borderRadius: '2px', background: i === index ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)', width: i === index ? '20px' : '4px', flexShrink: 0, transition: 'width 0.35s ease, background 0.35s ease' }} />
            ))}
            <span style={{ marginLeft: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{index + 1}/{total}</span>
          </div>
        )}

        {/* Botão de fechar */}
        <button
          aria-label="Fechar notificação"
          onClick={(e) => { e.stopPropagation(); stopAll(); setDismissed(true); }}
          style={{ position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', padding: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Rabinho do balão */}
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '-7px', right: '28px', width: '14px', height: '14px', background: s.tailColor, transform: 'rotate(45deg)', borderRight: `1.5px solid ${s.border}`, borderBottom: `1.5px solid ${s.border}` }} />
    </div>
  );
}
