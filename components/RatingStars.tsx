"use client";

import { useState } from "react";

const LABELS = ["שגויה", "גרועה", "בינונית", "טובה", "מצוינת"];

interface RatingStarsProps {
  value: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md";
}

export default function RatingStars({
  value,
  onChange,
  size = "md",
}: RatingStarsProps) {
  const [hover, setHover] = useState(0);

  const starSize = size === "sm" ? "w-8 h-8 text-lg" : "w-10 h-10 text-2xl";
  const labelSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="space-y-2">
      <p className="text-xs text-brutal-grey text-center leading-relaxed">
        דרגו את השאלה, לא לפי רמת קושי אלא על כמה איכותית,
        <br />
        שאלות מדורגות נמוך יופיעו לאחרים פחות
      </p>

      <div className="flex items-start justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hover || value);
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(star)}
              className="flex flex-col items-center gap-1 group"
            >
              <span
                className={`${starSize} flex items-center justify-center border-2 border-brutal-black
                  transition-all duration-75
                  ${
                    filled
                      ? "bg-brutal-red text-white border-brutal-red"
                      : "bg-white text-brutal-black group-hover:bg-brutal-red/10"
                  }`}
              >
                ★
              </span>
              <span
                className={`${labelSize} font-bold text-brutal-grey whitespace-nowrap`}
              >
                {LABELS[star - 1]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
