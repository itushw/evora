import { useEffect, useState } from 'react';

interface EventImageProps {
  src: string;
  alt: string;
  caption?: string;
  aspectClass?: string;
  className?: string;
}

export function EventImage({
  src,
  alt,
  caption,
  aspectClass = 'aspect-[4/3]',
  className = '',
}: EventImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <figure className={`m-0 w-full ${className}`}>
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-[#e2e2e2] bg-[#efefef] ${aspectClass}`}
      >
        {!failed && src ? (
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover block"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between p-6 bg-[#efefef] text-[#000000]">
            <span className="font-mono-tabular text-xs text-[#5e5e5e]">EVENT PHOTO</span>
            <span className="text-base font-semibold leading-snug">{alt}</span>
          </div>
        )}
      </div>
      {caption ? (
        <figcaption className="mt-2.5 text-xs text-[#5e5e5e] leading-relaxed">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
