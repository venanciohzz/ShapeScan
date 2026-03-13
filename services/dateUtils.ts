/**
 * Retorna a data de acompanhamento (YYYY-MM-DD) considerando que o dia só "vira" à 1h da manhã.
 * Se forem 00:30 do dia 18, retorna "2026-02-17".
 * Se forem 01:00 do dia 18, retorna "2026-02-18".
 */
export function getTrackingDateString(date: Date = new Date()): string {
    // Subtrai 1 hora para considerar 00:00-01:00 como o dia anterior
    const adjusted = new Date(date.getTime() - (60 * 60 * 1000));
    const year = adjusted.getFullYear();
    const month = String(adjusted.getMonth() + 1).padStart(2, '0');
    const day = String(adjusted.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Verifica se dois timestamps pertencem ao mesmo "dia de acompanhamento" (reset às 1h).
 */
export function isSameTrackingDay(timestamp1: number, timestamp2: number = Date.now()): boolean {
    const d1 = new Date(timestamp1 - (60 * 60 * 1000)).setHours(0, 0, 0, 0);
    const d2 = new Date(timestamp2 - (60 * 60 * 1000)).setHours(0, 0, 0, 0);
    return d1 === d2;
}
