import type { CSSProperties } from 'react';
import type { NewsBlockStyle } from '../types/news';
import { resolveUploadsUrl } from './format';

const SAFE_FONT_FAMILY_PATTERN = /^[a-zA-Z0-9\s,'"_-]{1,120}$/;
const SAFE_RELATIVE_URL_PATTERN = /^\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/?#]*$/;
const SAFE_UPLOADS_URL_PATTERN = /^\/uploads\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/?#]+$/;

const CSS_COLOR_PATTERNS = [
  /^#[0-9a-fA-F]{3,8}$/,
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i,
  /^hsla?\(\s*\d{1,3}(?:\.\d+)?(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i,
  /^var\(--[A-Za-z0-9_-]+\)$/,
  /^[A-Za-z]{3,20}$/,
] as const;

interface SafeUrlOptions {
  allowRelative?: boolean;
  allowUploadsPath?: boolean;
  allowMailto?: boolean;
  allowTel?: boolean;
}

function normalizeInput(value?: string | null): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function sanitizeColor(value?: string | null): string | null {
  const normalized = normalizeInput(value);
  if (!normalized) return null;
  return CSS_COLOR_PATTERNS.some((pattern) => pattern.test(normalized)) ? normalized : null;
}

function sanitizeFontFamily(value?: string | null): string | null {
  const normalized = normalizeInput(value);
  if (!normalized) return null;
  return SAFE_FONT_FAMILY_PATTERN.test(normalized) ? normalized : null;
}

function sanitizeUrl(value?: string | null, options: SafeUrlOptions = {}): string | null {
  const normalized = normalizeInput(value);
  if (!normalized) return null;

  const compact = normalized.replace(/\s+/g, '').toLowerCase();
  if (/^(javascript|data|vbscript|file|blob):/.test(compact)) {
    return null;
  }

  if (normalized.startsWith('//')) {
    return null;
  }

  if (normalized.startsWith('/')) {
    if (normalized.includes('\\')) {
      return null;
    }

    if (options.allowUploadsPath && SAFE_UPLOADS_URL_PATTERN.test(normalized)) {
      return normalized;
    }

    if (options.allowRelative && SAFE_RELATIVE_URL_PATTERN.test(normalized)) {
      return normalized;
    }

    return null;
  }

  try {
    const parsed = new URL(normalized);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol === 'http:' || protocol === 'https:') {
      return normalized;
    }

    if (options.allowMailto && protocol === 'mailto:') {
      return normalized;
    }

    if (options.allowTel && protocol === 'tel:') {
      return normalized;
    }

    return null;
  } catch {
    return null;
  }
}

export function getSafeNewsMediaUrl(url?: string | null): string | null {
  const resolved = resolveUploadsUrl(url) ?? url ?? null;
  return sanitizeUrl(resolved, {
    allowRelative: true,
    allowUploadsPath: true,
  });
}

export function getSafeNewsHref(url?: string | null): string | null {
  return sanitizeUrl(url, {
    allowRelative: true,
    allowMailto: true,
    allowTel: true,
  });
}

export function toSafeNewsInlineStyle(style?: NewsBlockStyle | null): CSSProperties | undefined {
  if (!style) return undefined;

  const nextStyle: CSSProperties = {};
  const textColor = sanitizeColor(style.textColor ?? null);
  const backgroundColor = sanitizeColor(style.backgroundColor ?? null);
  const accentColor = sanitizeColor(style.accentColor ?? null);
  const fontFamily = sanitizeFontFamily(style.fontFamily ?? null);

  if (textColor) nextStyle.color = textColor;
  if (backgroundColor) nextStyle.backgroundColor = backgroundColor;
  if (fontFamily) nextStyle.fontFamily = fontFamily;
  if (style.textAlign === 'left' || style.textAlign === 'center' || style.textAlign === 'right') {
    nextStyle.textAlign = style.textAlign;
  }
  if (accentColor) nextStyle.borderColor = accentColor;

  return Object.keys(nextStyle).length > 0 ? nextStyle : undefined;
}
