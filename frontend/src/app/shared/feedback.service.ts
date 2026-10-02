import { Injectable, signal } from '@angular/core';

export interface DialogoOpcoes {
  titulo: string;
  mensagem: string;
  confirmar?: string;
  perigo?: boolean;
}

interface DialogoAberto extends DialogoOpcoes {
  resolver: (ok: boolean) => void;
}

/** Toast de resultado + diálogo de confirmação in-app (substitui `confirm()` do navegador). */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  readonly toast = signal<{ msg: string; tipo: 'ok' | 'erro' } | null>(null);
  readonly dialogo = signal<DialogoAberto | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  aviso(msg: string, tipo: 'ok' | 'erro' = 'ok'): void {
    clearTimeout(this.timer);
    this.toast.set({ msg, tipo });
    this.timer = setTimeout(() => this.toast.set(null), tipo === 'erro' ? 5000 : 2800);
  }

  confirmar(opcoes: DialogoOpcoes): Promise<boolean> {
    return new Promise((resolver) => this.dialogo.set({ ...opcoes, resolver }));
  }

  responder(ok: boolean): void {
    this.dialogo()?.resolver(ok);
    this.dialogo.set(null);
  }
}
