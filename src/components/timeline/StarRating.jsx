import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, max = 5, size = 'sm', readOnly = false }) {
  const currentValue = Number(value) || 0;
  const iconClassName = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, index) => {
        const ratingValue = index + 1;
        const filled = ratingValue <= currentValue;

        if (readOnly) {
          return (
            <Star
              key={ratingValue}
              className={`${iconClassName} ${filled ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40'}`}
            />
          );
        }

        return (
          <button
            key={ratingValue}
            type="button"
            onClick={() => onChange?.(ratingValue === currentValue ? 0 : ratingValue)}
            className="transition-transform hover:scale-105"
            aria-label={`Set rating to ${ratingValue}`}
          >
            <Star
              className={`${iconClassName} ${filled ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40 hover:text-amber-300'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
