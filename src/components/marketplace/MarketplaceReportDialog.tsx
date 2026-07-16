import { useEffect, useId, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { TurnstileWidget } from "../turnstile/TurnstileWidget";
import { publicApiClient } from "../../lib/apiClient";
import { createMarketplaceReport } from "../../lib/marketplaceApi";
import { getApiError } from "../../lib/getApiError";
import type { MarketplaceReportReason } from "../../types/marketplace";

const reasons: Array<{ value: MarketplaceReportReason; label: string }> = [
  { value: "INACCURATE_INFORMATION", label: "Informações incorretas" },
  { value: "UNAVAILABLE", label: "Ponto indisponível ou inexistente" },
  { value: "DUPLICATE", label: "Anúncio duplicado" },
  { value: "INAPPROPRIATE_CONTENT", label: "Conteúdo impróprio" },
  { value: "FRAUD_OR_SCAM", label: "Suspeita de fraude ou golpe" },
  { value: "OTHER", label: "Outro motivo" },
];

type MarketplaceReportDialogProps = {
  open: boolean;
  slug: string;
  pointName: string;
  initialEmail?: string | null;
  onClose: () => void;
};

export function MarketplaceReportDialog({
  open,
  slug,
  pointName,
  initialEmail,
  onClose,
}: MarketplaceReportDialogProps) {
  const titleId = useId();
  const [reason, setReason] = useState<MarketplaceReportReason>(
    "INACCURATE_INFORMATION",
  );
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState(initialEmail || "");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaSiteKey, setCaptchaSiteKey] = useState(
    String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || ""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail || "");
    setError(null);
    setSuccess(false);
    const controller = new AbortController();
    publicApiClient
      .get("/public/menu/config", { signal: controller.signal })
      .then((response) => {
        const data = response.data as any;
        const key =
          data?.captcha?.siteKey ||
          data?.turnstile?.siteKey ||
          data?.captchaSiteKey;
        if (typeof key === "string" && key.trim()) {
          setCaptchaSiteKey(key.trim());
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialEmail, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open, submitting]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (captchaSiteKey && !captchaToken) {
      setError("Valide o captcha para enviar a denúncia.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await createMarketplaceReport({
        slug,
        reason,
        email: email.trim() || undefined,
        details: details.trim() || undefined,
        captchaToken: captchaSiteKey ? captchaToken : undefined,
      });
      setSuccess(true);
    } catch (requestError) {
      setError(
        getApiError(
          requestError,
          "Não foi possível enviar a denúncia. Tente novamente.",
        ).message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="marketplace-modal-backdrop marketplace-report-dialog__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !submitting) onClose();
      }}
    >
      <section
        className="marketplace-report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="marketplace-report-dialog__close"
          onClick={onClose}
          aria-label="Fechar denúncia"
          disabled={submitting}
        >
          <X aria-hidden="true" />
        </button>

        {success ? (
          <div className="marketplace-report-dialog__success">
            <CheckCircle2 aria-hidden="true" />
            <h2 id={titleId}>Denúncia recebida</h2>
            <p>
              Obrigado por ajudar a manter o Marketplace OneMedia confiável. A
              equipe responsável analisará este anúncio.
            </p>
            <button
              type="button"
              className="marketplace-button marketplace-button--primary"
              onClick={onClose}
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="marketplace-report-dialog__heading">
              <AlertTriangle aria-hidden="true" />
              <div>
                <h2 id={titleId}>Denunciar este anúncio</h2>
                <p>{pointName}</p>
              </div>
            </div>

            <label>
              Motivo
              <select
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as MarketplaceReportReason)
                }
              >
                {reasons.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Conte o que aconteceu <span>(opcional)</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={3000}
                rows={5}
                placeholder="Descreva de forma objetiva o problema encontrado."
              />
              <small>{details.length}/3000</small>
            </label>

            <label>
              E-mail para retorno <span>(opcional)</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                autoComplete="email"
                placeholder="voce@exemplo.com"
              />
            </label>

            {captchaSiteKey ? (
              <div className="marketplace-report-dialog__captcha">
                <TurnstileWidget
                  siteKey={captchaSiteKey}
                  onToken={setCaptchaToken}
                />
              </div>
            ) : null}

            {error ? (
              <p className="marketplace-report-dialog__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="marketplace-report-dialog__actions">
              <button
                type="button"
                className="marketplace-button"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="marketplace-button marketplace-button--primary"
                disabled={
                  submitting || (captchaSiteKey ? !captchaToken : false)
                }
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                    Enviando…
                  </>
                ) : (
                  "Enviar denúncia"
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
