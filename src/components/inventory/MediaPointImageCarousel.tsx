import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { MediaPoint, UnitType } from '../../types';

type Slide = {
  src: string;
  label: string;
  alt: string;
};

function CarouselImage({
  src,
  alt,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  fallbackSrc: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Quando o src muda (troca de slide / refetch), reseta o estado.
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const finalSrc = errored ? fallbackSrc : src;

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
      )}

      {/*
        Usamos <img> direto para conseguir controlar o loading (onLoad/onError)
        e exibir o skeleton animado enquanto carrega.
      */}
      <img
        src={finalSrc}
        alt={alt}
        draggable={false}
        loading="lazy"
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          // Primeiro erro: troca para fallback.
          if (!errored) {
            setErrored(true);
            setLoaded(false);
            return;
          }
          // Se até o fallback falhar, remove o skeleton para não ficar preso.
          setLoaded(true);
        }}
      />
    </div>
  );
}

export function MediaPointImageCarousel({
  point,
  normalizeUploadsUrl,
  fallbackSrc,
}: {
  point: MediaPoint;
  normalizeUploadsUrl: (value?: string | null) => string;
  fallbackSrc: string;
}) {
  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = [];

    const pointSrc = normalizeUploadsUrl(point.mainImageUrl) || fallbackSrc;
    list.push({
      src: pointSrc,
      label: 'Imagem do ponto',
      alt: point.name,
    });

    const units = Array.isArray(point.units) ? point.units : [];
    for (const u of units) {
      if (!u?.imageUrl) continue;
      const unitSrc = normalizeUploadsUrl(u.imageUrl);
      if (!unitSrc) continue;

      const kind = u.unitType === UnitType.SCREEN ? 'tela' : 'face';
      const unitLabel = u.label?.trim();

      list.push({
        src: unitSrc,
        label: unitLabel ? `Imagem da ${kind}: ${unitLabel}` : `Imagem da ${kind}`,
        alt: unitLabel ? `${point.name} - ${unitLabel}` : `${point.name} - ${kind}`,
      });
    }

    return list;
  }, [point.mainImageUrl, point.name, point.units, normalizeUploadsUrl, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    // Se a lista muda (refetch/paginação), garante índice válido.
    if (index >= slides.length) setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  const canNavigate = slides.length > 1;
  const goPrev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <div
      className="w-full h-full relative"
      onTouchStart={(e) => {
        touchStartX.current = e.touches?.[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (!canNavigate || startX === null) return;
        const endX = e.changedTouches?.[0]?.clientX;
        if (endX === undefined) return;
        const delta = startX - endX;
        if (Math.abs(delta) < 50) return;
        if (delta > 0) goNext();
        else goPrev();
      }}
    >
      {/* Slides */}
      <div className="w-full h-full overflow-hidden">
        <div
          className="h-full flex transition-transform duration-300 ease-out"
          // IMPORTANT: em alguns setups o Tailwind pode não aplicar corretamente classes como
          // `flex-none`, fazendo os slides encolherem e aparecerem "divididos".
          // Para garantir 1 slide por vez, mantemos o track em flex e impedimos shrink no item.
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((s, i) => (
            <div
              key={`${s.src}-${i}`}
              className="w-full h-full"
              // Força cada slide a ocupar 100% do viewport do carrossel e NÃO encolher.
              style={{ flex: '0 0 100%', width: '100%' }}
            >
              <CarouselImage src={s.src} alt={s.alt} fallbackSrc={fallbackSrc} />
            </div>
          ))}
        </div>
      </div>

      {/* Label */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="text-[11px] leading-none text-white bg-black/45 px-2 py-1 rounded-md max-w-[60%] sm:max-w-[55%] truncate inline-block">
          {slides[index]?.label}
        </span>
      </div>

      {/* Arrows */}
      {canNavigate && (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {canNavigate && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              aria-label={`Ir para imagem ${i + 1}`}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                i === index ? 'bg-white' : 'bg-white/50 hover:bg-white/80'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
