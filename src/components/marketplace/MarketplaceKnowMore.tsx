import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarCheck2, Image, ShieldCheck, X } from "lucide-react";

type KnowMoreItem = {
  key: string;
  title: string;
  summary: string;
  details: ReactNode;
  icon: "reservation" | "art" | "cancellation";
};

const iconMap = {
  reservation: CalendarCheck2,
  art: Image,
  cancellation: ShieldCheck,
};

const items: KnowMoreItem[] = [
  {
    key: "reservation",
    title: "Reserva do ponto",
    summary:
      "A reserva depende da confirmação de disponibilidade pelo responsável do ponto e da validação das condições comerciais.",
    details: (
      <>
        <p>
          A solicitação enviada pelo marketplace representa uma intenção de
          contratação. Ela não bloqueia o inventário nem gera cobrança imediata.
        </p>
        <p>
          A equipe responsável confirma o período, a quantidade de faces ou
          telas, o valor final e eventuais exigências locais antes da
          formalização.
        </p>
      </>
    ),
    icon: "reservation",
  },
  {
    key: "art",
    title: "Produção da arte",
    summary:
      "A arte pode ser enviada pelo anunciante ou desenvolvida separadamente, respeitando medidas e orientações técnicas.",
    details: (
      <>
        <p>
          Depois da confirmação, o responsável informa especificações de
          arquivo, dimensões, resolução, sangria e prazo limite para envio.
        </p>
        <p>
          Materiais fora do padrão podem precisar de ajustes antes de impressão,
          instalação ou veiculação digital.
        </p>
      </>
    ),
    icon: "art",
  },
  {
    key: "cancellation",
    title: "Cancelamento",
    summary:
      "As condições podem variar conforme período contratado, produção iniciada e reserva do espaço.",
    details: (
      <>
        <p>
          As regras finais de cancelamento são apresentadas na proposta
          comercial e devem ser aceitas antes da confirmação.
        </p>
        <p>
          Solicitações canceladas antes da aprovação não geram reserva. Após
          aprovação, podem existir custos já incorridos com produção ou
          instalação.
        </p>
      </>
    ),
    icon: "cancellation",
  },
];

export function MarketplaceKnowMore() {
  const [active, setActive] = useState<KnowMoreItem | null>(null);

  return (
    <section className="marketplace-know-more">
      <h2>O que você deve saber</h2>
      <div className="marketplace-know-more__grid">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <article key={item.key}>
              <Icon aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <button type="button" onClick={() => setActive(item)}>
                Saiba mais
              </button>
            </article>
          );
        })}
      </div>

      <Dialog.Root
        open={Boolean(active)}
        onOpenChange={(open) => !open && setActive(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="marketplace-dialog-overlay" />
          <Dialog.Content className="marketplace-dialog-content">
            <Dialog.Close
              className="marketplace-dialog-close"
              aria-label="Fechar"
            >
              <X aria-hidden="true" />
            </Dialog.Close>
            <Dialog.Title>{active?.title}</Dialog.Title>
            <Dialog.Description asChild>
              <div className="marketplace-dialog-content__body">
                {active?.details}
              </div>
            </Dialog.Description>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
