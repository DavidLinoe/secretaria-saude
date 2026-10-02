export function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Normaliza nome de medicamento pra comparar entre documentos (caixa/acento/pontuação). */
export function normalizarNome(s: string): string {
  return semAcento(s).toLowerCase().replace(/[^a-z0-9,.% ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizarLote(s: string): string {
  return (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Similaridade por tokens (Jaccard) — tolera pequenas diferenças de OCR/escrita. */
export function similaridade(a: string, b: string): number {
  const ta = new Set(normalizarNome(a).split(' '));
  const tb = new Set(normalizarNome(b).split(' '));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const uniao = new Set([...ta, ...tb]).size;
  return uniao ? inter / uniao : 0;
}

/** "3.600,00" → 3600 ; "1.200" (quantidade) → 1200 */
export function numeroBR(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

/** "MM/AAAA" ou "DD/MM/AAAA" → "AAAA-MM-DD" (MM/AAAA vira o último dia do mês). */
export function validadeParaIso(s: string): string | null {
  const m = s.match(/^(?:(\d{2})\/)?(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  if (mes < 1 || mes > 12) return null;
  const dia = m[1] ? Number(m[1]) : new Date(ano, mes, 0).getDate();
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function dataBrParaIso(s: string): string | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function diasAte(iso: string): number {
  return Math.floor((new Date(iso + 'T00:00:00Z').getTime() - new Date(hojeIso() + 'T00:00:00Z').getTime()) / 86400000);
}

/** 1 - distância de Levenshtein normalizada (0..1) — tolera 1-2 caracteres errados do OCR. */
export function similaridadeChars(a: string, b: string): number {
  const x = normalizarNome(a);
  const y = normalizarNome(b);
  if (!x.length && !y.length) return 1;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length);
}
