import { Injectable, signal } from '@angular/core';
import { mensagemErro } from '../../shared/erro';
import { PolosApiService } from './polos.api';
import { Distribuicao, Polo, PoloEstoque, PoloForm } from './polos.model';

@Injectable({ providedIn: 'root' })
export class PolosFacade {
  readonly polos = signal<Polo[]>([]);
  readonly estoque = signal<PoloEstoque[]>([]);
  readonly distribuicoes = signal<Distribuicao[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  constructor(private api: PolosApiService) {}

  async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.polos.set(await this.api.listar());
      this.erro.set(null);
    } catch (err) {
      this.erro.set(mensagemErro(err, 'Não foi possível carregar os polos.'));
    } finally {
      this.carregando.set(false);
    }
  }

  async carregarDetalhe(id: string): Promise<void> {
    try {
      const [e, d] = await Promise.all([this.api.estoque(id), this.api.distribuicoes(id)]);
      this.estoque.set(e);
      this.distribuicoes.set(d);
    } catch {
      this.estoque.set([]);
      this.distribuicoes.set([]);
    }
  }

  async salvar(id: string | null, form: PoloForm): Promise<string | null> {
    return this.executar(() => (id ? this.api.atualizar(id, form) : this.api.criar(form)));
  }

  async alternarAtivo(p: Polo): Promise<string | null> {
    return this.executar(() => this.api.atualizar(p.id, { ativo: !p.ativo }));
  }

  async remover(id: string): Promise<string | null> {
    return this.executar(() => this.api.remover(id));
  }

  private async executar(fn: () => Promise<unknown>): Promise<string | null> {
    try {
      await fn();
      await this.carregar();
      return null;
    } catch (err) {
      return mensagemErro(err);
    }
  }
}
