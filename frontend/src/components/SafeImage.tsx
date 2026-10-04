import { useState } from 'react';

interface Props { src?: string | null; alt: string; className?: string }

/** <img> that falls back to a neutral brand tile when there is no photo or it fails to load. */
export default function SafeImage({ src, alt, className = 'w-full h-full object-cover' }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className.replace('object-cover', '')} flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200`} role="img" aria-label={alt}>
        <span className="font-display font-bold text-brand-600 text-2xl">{alt.trim().charAt(0).toUpperCase() || '•'}</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />;
}
