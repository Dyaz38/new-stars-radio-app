import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

type EventPosterImageProps = {
  src: string;
  title: string;
  onOpenLightbox: () => void;
};

export function EventPosterImage({ src, title, onOpenLightbox }: EventPosterImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="mb-3 flex aspect-[2/3] max-w-sm mx-auto w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30 px-4 text-center">
        <ImageIcon className="mb-2 h-8 w-8 text-gray-500" aria-hidden />
        <p className="text-xs text-gray-400">Poster image could not be loaded.</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenLightbox}
      className="group mb-3 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-left cursor-zoom-in transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      aria-label={`View ${title} poster full screen`}
      title="Tap to view full screen"
    >
      <img
        src={src}
        alt={`${title} event poster`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="w-full max-w-sm mx-auto aspect-[2/3] object-contain rounded-md pointer-events-none"
        onError={() => setFailed(true)}
      />
    </button>
  );
}
