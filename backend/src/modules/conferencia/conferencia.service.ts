import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JsonCollection } from '../../common/json-store';
import { DocumentosService } from '../documentos/documentos.service';
import { EstoqueService } from '../estoque/estoque.service';
import { ExtracaoService } from '../extracao/extracao.service';
import { comparar } from './comparador';
import { Conferencia, LinhaComparacao } from './conferencia.model';

export interface ArquivoUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export interface Aceite {
  chave: string;
  quantidade?: number;
}

@Injectable()
export class ConferenciaService {
  private readonly conferencias = new JsonCollection<Conferencia>('conferencias');

  constructor(
    private readonly extracao: ExtracaoService,
    private readonly estoque: EstoqueService,
    private readonly documentos: DocumentosService,
  ) {}

  async criar(nota: ArquivoUpload, documento?: ArquivoUpload, urlsExistentes?: { nota?: string; documento?: string }): Promise<Conferencia> {
    const notaExtraida = await this.extracao.extrairNota(nota);
    const docExtraido = documento ? await this.extracao.extrairDocumento(documento) : undefined;
    if (!notaExtraida.itens.length) {
      throw new BadRequestException({ message: 'Não foi possível extrair itens da nota.', avisos: notaExtraida.avisos });
    }

    const linhas = comparar(notaExtraida.itens, docExtraido?.itens);
    const avisos = [...notaExtraida.avisos, ...(docExtraido?.avisos ?? [])];
    if (docExtraido?.referenciaNota && notaExtraida.numero && docExtraido.referenciaNota !== notaExtraida.numero) {
      avisos.push(`O documento referencia a NF ${docExtraido.referenciaNota}, mas a nota enviada é a ${notaExtraida.numero}.`);
    }
    if (notaExtraida.chave && this.conferencias.all().some((c) => c.nota.chave === notaExtraida.chave && c.status === 'confirmada')) {
      avisos.push('Esta nota (mesma chave de acesso) já foi confirmada em outra conferência — risco de entrada duplicada.');
    }

    const id = randomUUID();
    // guarda os originais pra poder reabri-los depois (exemplos já têm URL própria em assets/)
    const urls = urlsExistentes ?? {
      nota: this.documentos.salvar(nota, 'nota_fiscal', 'conferencia', id).url,
      documento: documento ? this.documentos.salvar(documento, 'romaneio', 'conferencia', id).url : undefined,
    };

    const conferencia: Conferencia = {
      id,
      status: 'pendente',
      criadaEm: new Date().toISOString(),
      arquivos: { nota: nota.originalname, documento: documento?.originalname },
      urls,
      nota: notaExtraida,
      documento: docExtraido,
      linhas,
      resumo: this.resumir(linhas),
      avisos,
    };
    return this.conferencias.insert(conferencia);
  }

  listar(): Conferencia[] {
    return [...this.conferencias.all()].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  }

  buscar(id: string): Conferencia {
    const c = this.conferencias.find(id);
    if (!c) throw new NotFoundException('Conferência não encontrada');
    return c;
  }

  /**
   * Linhas `ok`/`sem_documento` entram sozinhas. Divergentes só entram se aceitas explicitamente
   * (com a quantidade que de fato chegou; default = quantidade do documento, senão da nota).
   * Linhas vencidas nunca entram.
   */
  confirmar(id: string, aceites: Aceite[] = []): Conferencia {
    const conf = this.buscar(id);
    if (conf.status !== 'pendente') throw new BadRequestException(`Conferência já ${conf.status}.`);

    const porChave = new Map(aceites.map((a) => [a.chave, a]));
    for (const a of aceites) {
      if (!conf.linhas.some((l) => l.chave === a.chave)) throw new BadRequestException(`Linha inexistente: ${a.chave}`);
    }

    const afetados: string[] = [];
    for (const linha of conf.linhas) {
      if (linha.bloqueada) continue;
      const auto = linha.status === 'ok' || linha.status === 'sem_documento';
      const aceite = porChave.get(linha.chave);
      if (!auto && !aceite) continue;

      const base = linha.documento ?? linha.nota!;
      const origem = linha.nota ?? linha.documento!;
      const quantidade = aceite?.quantidade ?? base.quantidade;
      if (!Number.isInteger(quantidade) || quantidade < 1) throw new BadRequestException(`Quantidade inválida para a linha ${linha.chave}.`);

      const item = this.estoque.entradaPorConferencia(
        {
          nome: origem.nome,
          codigo: linha.nota?.codigo,
          ean: linha.documento?.ean,
          lote: base.lote,
          // validade mais restritiva entre os documentos
          validade: [linha.nota?.validade, linha.documento?.validade].filter(Boolean).sort()[0],
          quantidade,
          unidade: origem.unidade,
          fornecedor: conf.nota.fornecedor,
        },
        conf.id,
      );
      afetados.push(item.id);
    }

    if (!afetados.length) throw new BadRequestException('Nenhuma linha elegível para entrada (todas divergentes não aceitas ou vencidas).');
    return this.conferencias.replace({ ...conf, status: 'confirmada', confirmadaEm: new Date().toISOString(), itensEstoque: afetados });
  }

  resetar(): void {
    this.conferencias.removeWhere(() => true);
  }

  rejeitar(id: string): Conferencia {
    const conf = this.buscar(id);
    if (conf.status !== 'pendente') throw new BadRequestException(`Conferência já ${conf.status}.`);
    return this.conferencias.replace({ ...conf, status: 'rejeitada' });
  }

  remover(id: string): void {
    if (!this.conferencias.remove(id)) throw new NotFoundException('Conferência não encontrada');
  }

  private resumir(linhas: LinhaComparacao[]) {
    return {
      total: linhas.length,
      ok: linhas.filter((l) => l.status === 'ok' || l.status === 'sem_documento').length,
      divergentes: linhas.filter((l) => !['ok', 'sem_documento'].includes(l.status)).length,
      bloqueadas: linhas.filter((l) => l.bloqueada).length,
    };
  }
}
