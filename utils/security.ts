
/**
 * Utilitários de Segurança e Helpers Gerais
 */

export function sanitizeInput(input: string): string {
  // Remove tags HTML básicas para evitar XSS simples se o dado for renderizado
  return input.replace(/<[^>]*>?/gm, '').trim();
}

export function safeJSONParse<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Erro ao carregar ${key} do armazenamento. Resetando para padrão.`);
    localStorage.removeItem(key);
    return fallback;
  }
}

// Compressão OTIMIZADA para LocalStorage (Max 600px, 0.6 quality)
export const compressImage = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1024; 
      const scaleSize = MAX_WIDTH / img.width;
      const width = Math.min(MAX_WIDTH, img.width);
      const height = img.height * (width === MAX_WIDTH ? scaleSize : 1);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Qualidade 0.75 — equilibra precisão de IA e tamanho do payload
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      } else {
        resolve(base64); // Fallback
      }
    };
    img.onerror = () => resolve(base64);
  });
};
