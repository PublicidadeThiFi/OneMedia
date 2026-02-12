import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { submitWaitlistLead } from '../../lib/waitlist';
import imgOnemediaLogo from 'figma:asset/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

type Props = {
  open: boolean;
  origin: string;
  onClose: () => void;
};

function normalizePhone(v: string) {
  return v.replace(/\D/g, '');
}

export function WaitlistModal({ open, origin, onClose }: Props) {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [qtdPontosMidia, setQtdPontosMidia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    const emailOk = /.+@.+\..+/.test(email.trim());
    const phoneDigits = normalizePhone(whatsapp);
    const phoneOk = phoneDigits.length >= 10;
    return (
      nomeCompleto.trim().length >= 3 &&
      empresa.trim().length >= 2 &&
      emailOk &&
      phoneOk &&
      !isSubmitting
    );
  }, [nomeCompleto, empresa, email, whatsapp, isSubmitting]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // Reset fields when opening (keeps it predictable)
    setIsSubmitting(false);
    setNomeCompleto('');
    setEmpresa('');
    setEmail('');
    setWhatsapp('');
    setQtdPontosMidia('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const result = await submitWaitlistLead({
      nomeCompleto: nomeCompleto.trim(),
      empresa: empresa.trim(),
      email: email.trim(),
      whatsapp: normalizePhone(whatsapp),
      qtdPontosMidia: (qtdPontosMidia || '').trim(),
      origem: origin || 'unknown',
    });

    if (result.ok) {
      toast.success('Você entrou na lista de espera!');
      onClose();
      return;
    }

    toast.error(result.error || 'Não foi possível enviar.');
    setIsSubmitting(false);
  };

  return (
    <div
      className="waitlist-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="waitlist-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="waitlist-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <div className="waitlist-header">
          <img src={imgOnemediaLogo} alt="OneMedia" className="waitlist-logo" />
          <h2 className="waitlist-title">Chega de perder tempo (e dinheiro) com planilhas de OOH desatualizadas</h2>
          <p className="waitlist-subtitle">
            Estamos finalizando a plataforma que vai automatizar seu Mídia Kit e organizar seu inventário com precisão militar. Entre na lista de espera para ser um dos primeiros a dominar o mercado com a OneMedia.
          </p>
        </div>

        <div className="waitlist-form">
          <label className="waitlist-field">
            <span>Nome completo</span>
            <input
              className="waitlist-input"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
            />
          </label>

          <label className="waitlist-field">
            <span>Nome da empresa</span>
            <input
              className="waitlist-input"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Sua empresa"
              autoComplete="organization"
            />
          </label>

          <label className="waitlist-field">
            <span>Email</span>
            <input
              className="waitlist-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@empresa.com"
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <label className="waitlist-field">
            <span>WhatsApp</span>
            <input
              className="waitlist-input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(61) 99999-9999"
              autoComplete="tel"
              inputMode="tel"
            />
          </label>

          <label className="waitlist-field">
            <span>Quantidade de pontos de mídia</span>
            <input
              className="waitlist-input"
              value={qtdPontosMidia}
              onChange={(e) => setQtdPontosMidia(e.target.value)}
              placeholder="Ex: 50"
              inputMode="numeric"
            />
          </label>

          <button
            className="waitlist-submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Enviando…' : 'Entrar na lista de espera'}
          </button>

          <p className="waitlist-disclaimer">
            Fique tranquilo, também não gostamos de spam. Você receberá apenas novidades exclusivas e o convite de lançamento.
          </p>
        </div>
      </div>
    </div>
  );
}
