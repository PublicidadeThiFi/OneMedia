import {
  BadgeCheck,
  Building2,
  Clock3,
  MapPinned,
  MessageSquare,
} from "lucide-react";
import { resolveUploadsUrl } from "../../lib/format";
import type { MarketplacePointPartner } from "../../types/marketplace";

type MarketplacePartnerCardProps = {
  partner: MarketplacePointPartner;
  onMessage: () => void;
};

export function MarketplacePartnerCard({
  partner,
  onMessage,
}: MarketplacePartnerCardProps) {
  const logoUrl = resolveUploadsUrl(partner.logoUrl) || partner.logoUrl;
  return (
    <div className="marketplace-partner-card">
      <h2>Responsável pelo ponto</h2>
      <div className="marketplace-partner-card__identity">
        <div className="marketplace-partner-card__logo">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logo de ${partner.name}`} />
          ) : (
            <Building2 aria-hidden="true" />
          )}
        </div>
        <div>
          <strong>{partner.name}</strong>
          <span>Operador ou proprietário cadastrado na plataforma</span>
          {partner.verified && (
            <small>
              <BadgeCheck aria-hidden="true" /> Parceiro verificado
            </small>
          )}
        </div>
      </div>

      <dl className="marketplace-partner-card__facts">
        <div>
          <dt>
            <Clock3 aria-hidden="true" /> Tempo médio de resposta
          </dt>
          <dd>até 24 horas</dd>
        </div>
        <div>
          <dt>
            <MapPinned aria-hidden="true" /> Pontos cadastrados
          </dt>
          <dd>{partner.pointsCount.toLocaleString("pt-BR")}</dd>
        </div>
        <div>
          <dt>
            <BadgeCheck aria-hidden="true" /> Status
          </dt>
          <dd className={partner.verified ? "is-verified" : ""}>
            {partner.verified ? "parceiro verificado" : "parceiro cadastrado"}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className="marketplace-partner-card__message"
        onClick={onMessage}
      >
        <MessageSquare aria-hidden="true" /> Enviar mensagem
      </button>
      <p>
        Para sua segurança, negocie e acompanhe a solicitação pela plataforma
        OneMedia.
      </p>
    </div>
  );
}
