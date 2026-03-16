import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { MediaPoint } from '../../types';

type Slide = {
  src: string;
  label: string;
  alt: string;
  kind: 'image' | 'video';
};

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 w-full h-full rounded-none overflow-hidden pointer-events-none">
      <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
      <div
        className="absolute top-0 bottom-0 left-0 motion-reduce:animate-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
          width: '60%',
          height: '100%',
          transform: 'translateX(-120%)',
          animation: 'ooh_sweep 1.1s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-7 w-7 rounded-full border-2 border-black/20 border-t-black/60 animate-spin motion-reduce:animate-none" />
      </div>
      <style>
        {`@keyframes ooh_sweep{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}`}
      </style>
    </div>
  );
}

function CarouselImage({
  src,
  alt,
  fallbackSrc,
  loading,
  fetchPriority,
}: {
  src: string;
  alt: string;
  fallbackSrc: string;
  loading: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const finalSrc = errored ? fallbackSrc : src;

  return (
    <div className="relative w-full h-full">
      {!loaded && <LoadingOverlay />}
      <img
        src={finalSrc}
        alt={alt}
        draggable={false}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!errored) {
            setErrored(true);
            setLoaded(false);
            return;
          }
          setLoaded(true);
        }}
      />
    </div>
  );
}

function CarouselVideo({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className="relative w-full h-full bg-black">
      {!loaded && <LoadingOverlay />}
      <video
        src={src}
        title={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        controls
        muted
        playsInline
        preload="none"
        onLoadedData={() => setLoaded(true)}
        onError={() => setLoaded(true)}
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
  normalizeUploadsUrl: (value?: string | null) => string | null;
  fallbackSrc: string;
}) {
  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = [];

    const pushSlide = (slide: Slide | null) => {
      if (!slide?.src) return;
      if (list.some((item) => item.kind === slide.kind && item.src === slide.src)) return;
      list.push(slide);
    };

    const pointGalleryImages = Array.isArray((point as any).galleryImages) && (point as any).galleryImages.length
      ? (point as any).galleryImages
      : [point.mainImageUrl].filter(Boolean);
    for (const [idx, srcValue] of pointGalleryImages.entries()) {
      const pointImageSrc = normalizeUploadsUrl(srcValue);
      if (!pointImageSrc) continue;
      pushSlide({
        src: pointImageSrc,
        label: idx === 0 ? 'Imagem do ponto' : `Imagem do ponto ${idx + 1}`,
        alt: point.name,
        kind: 'image',
      });
    }

    const pointGalleryVideos = Array.isArray((point as any).galleryVideos) && (point as any).galleryVideos.length
      ? (point as any).galleryVideos
      : [point.mainVideoUrl].filter(Boolean);
    for (const [idx, srcValue] of pointGalleryVideos.entries()) {
      const pointVideoSrc = normalizeUploadsUrl(srcValue);
      if (!pointVideoSrc) continue;
      pushSlide({
        src: pointVideoSrc,
        label: idx === 0 ? 'Vídeo do ponto' : `Vídeo do ponto ${idx + 1}`,
        alt: `${point.name} - vídeo`,
        kind: 'video',
      });
    }


    if (list.length === 0) {
      list.push({
        src: fallbackSrc,
        label: 'Sem mídia cadastrada',
        alt: point.name,
        kind: 'image',
      });
    }

    return list;
  }, [point.mainImageUrl, point.mainVideoUrl, point.name, point.units, normalizeUploadsUrl, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

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
      <div className="w-full h-full overflow-hidden">
        <div
          className="h-full flex transition-transform duration-300 ease-out"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((s, i) => (
            <div
              key={`${s.kind}-${s.src}-${i}`}
              className="w-full h-full"
              style={{ flex: '0 0 100%', width: '100%' }}
            >
              {s.kind === 'video' ? (
                <CarouselVideo src={s.src} alt={s.alt} />
              ) : (
                <CarouselImage
                  src={s.src}
                  alt={s.alt}
                  fallbackSrc={fallbackSrc}
                  loading={'lazy'}
                  fetchPriority={'auto'}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        {(() => {
          const label = slides[index]?.label ?? '';
          const fontSizePx = label.length > 70 ? 9 : label.length > 50 ? 10 : 11;

          return (
            <div
              className={
                'inline-flex items-center justify-center border border-white/10 shadow-sm ' +
                'px-3 py-1.5 rounded-md ' +
                'min-w-[140px] max-w-[calc(100%-180px)] ' +
                'whitespace-normal break-words hyphens-auto text-center leading-tight'
              }
              style={{
                fontSize: `${fontSizePx}px`,
                backgroundColor: '#000',
                color: '#fff',
              }}
              title={label}
            >
              {label}
            </div>
          );
        })()}
      </div>

      {canNavigate && (
        <>
          <button
            type="button"
            aria-label="Mídia anterior"
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
            aria-label="Próxima mídia"
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

      {canNavigate && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              aria-label={`Ir para mídia ${i + 1}`}
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
