import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ImagePreviewProps {
  file: File | null;
  alt?: string;
  className?: string;
  onRemove?: () => void;
}

export function ImagePreview({ file, alt = 'preview', className, onRemove }: ImagePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      
      // Cleanup: revoke URL when unmounted or file changes
      return () => URL.revokeObjectURL(objectUrl);
    }
    setUrl(null);
  }, [file]);

  if (!url) return null;

  return (
    <div className="relative inline-block group">
      <img src={url} alt={alt} className={className} />
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-90 hover:opacity-100 hover:scale-110 shadow-sm transition-all"
          title="Remover imagem"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
