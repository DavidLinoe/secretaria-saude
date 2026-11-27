import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EscanearApiService } from '../apis/escanear.api';
import { NotaMetadados, NotaRegistro } from '../models/escanear.model';

@Injectable({ providedIn: 'root' })
export class EscanearFacade {
  private readonly _notas$ = new BehaviorSubject<NotaRegistro[]>([]);
  private readonly _loadingLista$ = new BehaviorSubject<boolean>(false);
  private readonly _enviando$ = new BehaviorSubject<boolean>(false);
  private readonly _erro$ = new BehaviorSubject<string | null>(null);

  readonly notas$ = this._notas$.asObservable();
  readonly loadingLista$ = this._loadingLista$.asObservable();
  readonly enviando$ = this._enviando$.asObservable();
  readonly erro$ = this._erro$.asObservable();

  constructor(private api: EscanearApiService) {}

  async carregarHistorico(): Promise<void> {
    this._loadingLista$.next(true);
    try {
      const notas = await this.api.listar();
      this._notas$.next(notas);
    } catch (err) {
      console.error('[EscanearFacade] falha ao listar notas:', err);
    } finally {
      this._loadingLista$.next(false);
    }
  }

  async enviarImagemUnica(file: File, meta: NotaMetadados): Promise<void> {
    await this.enviar(() => this.api.processarImagem(file, meta));
  }

  async enviarLote(files: File[], meta: NotaMetadados): Promise<void> {
    await this.enviar(() => this.api.processarImagens(files, meta));
  }

  /** Corrige nome/camadas de um envio já feito (otimista; desfaz se falhar). */
  async atualizar(id: string, meta: Partial<NotaMetadados>): Promise<void> {
    const anterior = this._notas$.value;
    this._notas$.next(anterior.map((n) => (n.id === id ? { ...n, ...meta } : n)));
    try {
      const nota = await this.api.atualizar(id, meta);
      this._notas$.next(this._notas$.value.map((n) => (n.id === id ? nota : n)));
    } catch (err) {
      console.error('[EscanearFacade] falha ao atualizar nota:', err);
      this._notas$.next(anterior);
      this._erro$.next('Não foi possível salvar a alteração. Tente novamente.');
    }
  }

  private async enviar(chamada: () => Promise<NotaRegistro>): Promise<void> {
    this._enviando$.next(true);
    this._erro$.next(null);
    try {
      const nota = await chamada();
      this._notas$.next([nota, ...this._notas$.value]);
      if (nota.status === 'erro') {
        this._erro$.next(nota.erro ?? 'A nota foi enviada, mas o processamento falhou.');
      }
    } catch (err) {
      console.error('[EscanearFacade] falha ao enviar nota:', err);
      this._erro$.next('Não foi possível enviar a nota. Tente novamente.');
    } finally {
      this._enviando$.next(false);
    }
  }

  async remover(id: string): Promise<void> {
    const anterior = this._notas$.value;
    this._notas$.next(anterior.filter((n) => n.id !== id));
    try {
      await this.api.remover(id);
    } catch (err) {
      console.error('[EscanearFacade] falha ao remover nota:', err);
      this._notas$.next(anterior);
    }
  }
}
