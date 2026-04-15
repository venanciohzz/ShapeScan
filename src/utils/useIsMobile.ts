import { useState, useEffect } from 'react';

/**
 * Detecta se o dispositivo é mobile (tela <= 768px).
 * Usado para desabilitar efeitos pesados (WebGL, backdrop-blur, animações complexas).
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
};
