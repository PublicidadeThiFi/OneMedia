import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { resolveUploadsUrl } from "../../lib/format";
import type { MarketplaceMediaItem } from "../../types/marketplace";

type MarketplaceGalleryProps = {
  items: MarketplaceMediaItem[];
  pointName: string;
};

function mediaUrl(item: MarketplaceMediaItem) {
  return resolveUploadsUrl(item.url) || item.url;
}

function GalleryMedia({
  item,
  alt,
  eager = false,
}: {
  item: MarketplaceMediaItem;
  alt: string;
  eager?: boolean;
}) {
  const url = mediaUrl(item);
  if (item.kind === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

export function MarketplaceGallery({
  items,
  pointName,
}: MarketplaceGalleryProps) {
  const gallery = useMemo(
    () => items.filter((item) => Boolean(mediaUrl(item))),
    [items],
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const visible = gallery.slice(0, 5);

  const showAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const move = (direction: number) => {
    if (!gallery.length) return;
    setActiveIndex(
      (current) => (current + direction + gallery.length) % gallery.length,
    );
  };

  if (!gallery.length) {
    return (
      <div
        className="marketplace-detail-gallery marketplace-detail-gallery--empty"
        role="status"
      >
        <Images aria-hidden="true" />
        <span>As imagens deste ponto ainda não estão disponíveis.</span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`marketplace-detail-gallery marketplace-detail-gallery--count-${Math.min(visible.length, 5)}`}
      >
        {visible.map((item, index) => (
          <button
            type="button"
            key={item.id || `${item.url}-${index}`}
            className={`marketplace-detail-gallery__item marketplace-detail-gallery__item--${index + 1}`}
            onClick={() => showAt(index)}
            aria-label={`Abrir mídia ${index + 1} de ${pointName}`}
          >
            <GalleryMedia
              item={item}
              alt={`${pointName} — mídia ${index + 1}`}
              eager={index === 0}
            />
          </button>
        ))}

        <button
          type="button"
          className="marketplace-detail-gallery__all"
          onClick={() => showAt(0)}
        >
          <Images aria-hidden="true" />
          Mostrar todas as mídias
        </button>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="marketplace-gallery-modal__backdrop" />
          <Dialog.Content className="marketplace-gallery-modal__content">
            <Dialog.Title className="marketplace-visually-hidden">
              Galeria de {pointName}
            </Dialog.Title>
            <div className="marketplace-gallery-modal__topbar">
              <span>
                {activeIndex + 1} / {gallery.length}
              </span>
              <Dialog.Close aria-label="Fechar galeria">
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="marketplace-gallery-modal__stage">
              {gallery.length > 1 && (
                <button
                  type="button"
                  className="marketplace-gallery-modal__nav marketplace-gallery-modal__nav--previous"
                  onClick={() => move(-1)}
                  aria-label="Mídia anterior"
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
              )}
              <GalleryMedia
                item={gallery[activeIndex]}
                alt={`${pointName} — mídia ${activeIndex + 1}`}
                eager
              />
              {gallery.length > 1 && (
                <button
                  type="button"
                  className="marketplace-gallery-modal__nav marketplace-gallery-modal__nav--next"
                  onClick={() => move(1)}
                  aria-label="Próxima mídia"
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </div>

            {gallery.length > 1 && (
              <div
                className="marketplace-gallery-modal__thumbs"
                aria-label="Miniaturas da galeria"
              >
                {gallery.map((item, index) => (
                  <button
                    type="button"
                    key={item.id || `${item.url}-${index}`}
                    className={index === activeIndex ? "is-active" : ""}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Ver mídia ${index + 1}`}
                  >
                    {item.kind === "video" ? (
                      <video src={mediaUrl(item)} muted />
                    ) : (
                      <img src={mediaUrl(item)} alt="" loading="lazy" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
