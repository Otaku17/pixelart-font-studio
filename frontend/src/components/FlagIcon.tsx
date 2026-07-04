const FLAG_SVGS: Record<string, string> = {
  fr: `<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
    <rect width="3" height="2" fill="#fff"/>
    <rect width="1" height="2" fill="#0055A4"/>
    <rect x="2" width="1" height="2" fill="#EF4135"/>
  </svg>`,
  en: `<svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="30" fill="#00247d"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#cf142b" stroke-width="2"/>
    <path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/>
    <path d="M30,0 V30 M0,15 H60" stroke="#cf142b" stroke-width="6"/>
  </svg>`,
  es: `<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
    <rect width="3" height="2" fill="#AA151B"/>
    <rect y="0.5" width="3" height="1" fill="#F1BF00"/>
  </svg>`,
  de: `<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
    <rect width="3" height="0.667" fill="#000"/>
    <rect y="0.667" width="3" height="0.667" fill="#DD0000"/>
    <rect y="1.333" width="3" height="0.667" fill="#FFCE00"/>
  </svg>`,
};

/**
 * Renders a real vector flag for the given language code. Adding a language
 * that has no entry here just falls back to the emoji flag from its
 * locale's `_meta`, so nothing breaks — but for full quality, add a matching
 * SVG entry above when you add a new locale.
 */
export function FlagIcon({
  code,
  fallbackEmoji,
  className = '',
}: {
  code: string;
  fallbackEmoji?: string;
  className?: string;
}) {
  const svg = FLAG_SVGS[code];
  if (!svg) {
    return (
      <span className={`flag-icon flag-icon-emoji ${className}`}>
        {fallbackEmoji ?? '🌐'}
      </span>
    );
  }
  return (
    <span
      className={`flag-icon ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
