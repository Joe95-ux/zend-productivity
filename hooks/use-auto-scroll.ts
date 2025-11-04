'use client';

import { useRef} from 'react';

export function useAutoScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 0);
  };

  return { containerRef, scrollToBottom };
}
