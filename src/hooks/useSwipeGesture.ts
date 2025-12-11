import { useState, useRef, useCallback, TouchEvent } from "react";

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
}

export function useSwipeGesture({ onSwipeLeft, onSwipeRight, minSwipeDistance = 50 }: SwipeConfig) {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    const swipeDistance = touchStartX.current - touchEndX.current;

    if (Math.abs(swipeDistance) >= minSwipeDistance) {
      if (swipeDistance > 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (swipeDistance < 0 && onSwipeRight) {
        onSwipeRight();
      }
    }
  }, [minSwipeDistance, onSwipeLeft, onSwipeRight]);

  return {
    isSwiping,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
