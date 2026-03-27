import React, { useEffect, useMemo, useState } from 'react'

import { resolveUploadsUrl } from '../../lib/format'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, ...rest } = props

  const resolvedSrc = useMemo(() => {
    return resolveUploadsUrl((src as string | undefined) ?? null) ?? (src as string | undefined)
  }, [src])

  useEffect(() => {
    setDidError(false)
  }, [resolvedSrc])

  const shouldShowFallback = didError || !resolvedSrc

  if (shouldShowFallback) {
    return (
      <div
        className={`relative isolate inline-flex overflow-hidden rounded-[inherit] bg-[radial-gradient(circle_at_top,#eef4ff_0%,#ffffff_52%,#f8fafc_100%)] text-center align-middle ${className ?? ''}`}
        style={style}
        data-original-url={src}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(224,231,255,0.55)_100%)]" />
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <img src={ERROR_IMG_SRC} alt={alt ?? 'Imagem indisponível'} className="h-7 w-7 opacity-55" />
          </div>
          <div className="max-w-[12rem] text-[11px] font-medium leading-5 text-slate-500">
            Imagem indisponível no momento
          </div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
      data-original-url={src}
    />
  )
}
