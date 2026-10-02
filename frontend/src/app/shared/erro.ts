import { HttpErrorResponse } from '@angular/common/http';

/** Extrai a mensagem do erro padrão do Nest (`message` string ou array) ou cai num texto genérico. */
export function mensagemErro(err: unknown, padrao = 'Não foi possível concluir a operação.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Sem conexão com o servidor.';
    const m = err.error?.message;
    if (Array.isArray(m)) return m.join('; ');
    if (typeof m === 'string') return m;
  }
  if ((err as Error)?.name === 'TimeoutError') return 'O servidor demorou para responder.';
  return padrao;
}

export function dataBr(iso?: string | null): string {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}
