import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JsonCollection } from '../../common/json-store';
import { normalizarLote, normalizarNome } from '../../common/texto';
import { Distribuicao, Polo, PoloEstoque, PoloView } from './polos.model';

export interface PoloInput {
  nome?: string;
  tipo?: string;
  endereco?: string;
  ativo?: boolean;
}

export interface RemessaItem {
  id: string;
  nome: string;
  codigo?: string;
  ean?: string;
  lote: string;
  validade: string;
  unidade: string;
}

const POLOS_INICIAIS: Omit<Polo, 'id'>[] = [
  { nome: 'UBS Centro', tipo: 'UBS', endereco: 'Rua Principal, 100 - Centro', ativo: true },
  { nome: 'UBS Vila Nova', tipo: 'UBS', endereco: 'Av. das Flores, 450 - Vila Nova', ativo: true },
  { nome: 'UPA 24h', tipo: 'UPA', endereco: 'Rod. Municipal, km 3', ativo: true },
  { nome: 'Hospital Municipal', tipo: 'Hospital', endereco: 'Praça da Saúde, 1', ativo: true },
  { nome: 'Farmácia Central de Distribuição', tipo: 'Farmácia', endereco: 'Rua do Comércio, 85', ativo: true },
  { nome: 'Posto de Saúde Rural', tipo: 'Posto', endereco: 'Estrada Velha, s/n - Zona Rural', ativo: true },
];

@Injectable()
export class PolosService {
  private readonly polos = new JsonCollection<Polo>('polos');
  private readonly estoque = new JsonCollection<PoloEstoque>('polos-estoque');
  private readonly distribuicoes = new JsonCollection<Distribuicao>('polos-distribuicoes');

  constructor() {
    this.semear();
  }

  listar(): PoloView[] {
    return this.polos
      .all()
      .map((p) => this.view(p))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  buscar(id: string): PoloView {
    return this.view(this.obter(id));
  }

  criar(input: PoloInput): PoloView {
    const dados = this.validar(input);
    this.garantirNomeUnico(dados.nome);
    const polo: Polo = { id: randomUUID(), ativo: true, ...dados };
    this.polos.insert(polo);
    return this.view(polo);
  }

  atualizar(id: string, input: PoloInput): PoloView {
    const atual = this.obter(id);
    const dados = this.validar({ ...atual, ...input });
    this.garantirNomeUnico(dados.nome, id);
    const novo = { ...atual, ...dados, ativo: input.ativo ?? atual.ativo };
    this.polos.replace(novo);
    return this.view(novo);
  }

  remover(id: string): void {
    this.obter(id);
    if (this.distribuicoes.all().some((d) => d.poloId === id)) {
      throw new ConflictException('Este polo já recebeu remessas. Desative-o em vez de excluir.');
    }
    this.polos.remove(id);
  }

  estoqueDoPolo(id: string): PoloEstoque[] {
    this.obter(id);
    return this.estoque
      .all()
      .filter((e) => e.poloId === id)
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.validade.localeCompare(b.validade));
  }

  historico(id: string): Distribuicao[] {
    this.obter(id);
    return this.distribuicoes
      .all()
      .filter((d) => d.poloId === id)
      .sort((a, b) => b.em.localeCompare(a.em));
  }

  /** Valida o destino antes de a saída mexer no estoque central. */
  validarDestino(poloId: string | undefined): Polo {
    if (!poloId) throw new BadRequestException('Informe o polo de destino da saída.');
    const polo = this.obter(poloId);
    if (!polo.ativo) throw new BadRequestException(`O polo "${polo.nome}" está inativo.`);
    return polo;
  }

  /** Chamado pela saída do estoque: soma a remessa no saldo do polo. */
  receber(poloId: string, item: RemessaItem, quantidade: number, motivo?: string): void {
    const polo = this.validarDestino(poloId);
    const agora = new Date().toISOString();
    const lt = normalizarLote(item.lote);
    const existente = this.estoque
      .all()
      .find(
        (e) =>
          e.poloId === polo.id &&
          normalizarLote(e.lote) === lt &&
          ((item.ean && e.ean === item.ean) || normalizarNome(e.nome) === normalizarNome(item.nome)),
      );
    if (existente) {
      this.estoque.replace({ ...existente, quantidade: existente.quantidade + quantidade, atualizadoEm: agora });
    } else {
      this.estoque.insert({
        id: randomUUID(),
        poloId: polo.id,
        nome: item.nome,
        codigo: item.codigo,
        ean: item.ean,
        lote: item.lote,
        validade: item.validade,
        unidade: item.unidade,
        quantidade,
        atualizadoEm: agora,
      });
    }
    this.distribuicoes.insert({ id: randomUUID(), poloId: polo.id, itemId: item.id, nome: item.nome, lote: item.lote, quantidade, motivo, em: agora });
  }

  resetar(): void {
    this.estoque.removeWhere(() => true);
    this.distribuicoes.removeWhere(() => true);
  }

  // --- internos ---

  private semear(): void {
    if (this.polos.all().length) return;
    for (const p of POLOS_INICIAIS) this.polos.insert({ id: randomUUID(), ...p });
  }

  private obter(id: string): Polo {
    const p = this.polos.find(id);
    if (!p) throw new NotFoundException('Polo não encontrado');
    return p;
  }

  private garantirNomeUnico(nome: string, ignorarId?: string): void {
    if (this.polos.all().some((p) => p.id !== ignorarId && normalizarNome(p.nome) === normalizarNome(nome))) {
      throw new ConflictException('Já existe um polo com este nome.');
    }
  }

  private validar(i: PoloInput) {
    const nome = String(i.nome ?? '').trim();
    if (!nome) throw new BadRequestException(['nome é obrigatório']);
    return { nome, tipo: String(i.tipo ?? '').trim() || 'UBS', endereco: i.endereco?.trim() || undefined };
  }

  private view(p: Polo): PoloView {
    const itens = this.estoque.all().filter((e) => e.poloId === p.id);
    return { ...p, totalLotes: itens.length, totalUnidades: itens.reduce((s, e) => s + e.quantidade, 0) };
  }
}
