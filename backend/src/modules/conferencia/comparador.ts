import { diasAte, normalizarLote, normalizarNome, similaridade, similaridadeChars } from '../../common/texto';
import { ItemExtraido } from '../extracao/extracao.model';
import { DIAS_VALIDADE_CURTA } from '../estoque/estoque.service';
import { LinhaComparacao } from './conferencia.model';

const mesmoProduto = (a: ItemExtraido, b: ItemExtraido) =>
  (a.ean && b.ean && a.ean === b.ean) || normalizarNome(a.nome) === normalizarNome(b.nome) || similaridade(a.nome, b.nome) >= 0.8 || similaridadeChars(a.nome, b.nome) >= 0.85;

function alertasValidade(item: ItemExtraido): { alertas: string[]; vencido: boolean } {
  const dias = diasAte(item.validade);
  if (dias < 0) return { alertas: [`Vencido há ${-dias} dia(s)`], vencido: true };
  if (dias <= DIAS_VALIDADE_CURTA) return { alertas: [`Validade curta: vence em ${dias} dia(s)`], vencido: false };
  return { alertas: [], vencido: false };
}

const fmtData = (iso: string) => iso.split('-').reverse().join('/');

/**
 * Cruza itens da nota com os do documento (romaneio).
 * 1) mesmo produto + mesmo lote → compara quantidade/validade;
 * 2) sobrou item da nota com produto igual a algum do documento (lote diferente) → divergência de lote;
 * 3) o que sobrar → só na nota / só no documento.
 * Sem documento: todas as linhas viram `sem_documento` (conferência só pela nota).
 */
export function comparar(nota: ItemExtraido[], documento?: ItemExtraido[]): LinhaComparacao[] {
  const linhas: LinhaComparacao[] = [];
  let seq = 0;
  const nova = (p: Omit<LinhaComparacao, 'chave' | 'alertas' | 'bloqueada'>): LinhaComparacao => {
    const { alertas, vencido } = alertasValidade(p.nota ?? p.documento!);
    return { chave: `l${++seq}`, alertas, bloqueada: vencido, ...p };
  };

  if (!documento) {
    return nota.map((n) => nova({ status: 'sem_documento', nota: n, divergencias: [] }));
  }

  const sobraDoc = [...documento];
  const sobraNota: ItemExtraido[] = [];

  for (const n of nota) {
    const idx = sobraDoc.findIndex((d) => mesmoProduto(n, d) && normalizarLote(n.lote) === normalizarLote(d.lote));
    if (idx < 0) {
      sobraNota.push(n);
      continue;
    }
    const [d] = sobraDoc.splice(idx, 1);
    const divergencias: string[] = [];
    let status: LinhaComparacao['status'] = 'ok';
    if (n.quantidade !== d.quantidade) {
      status = 'quantidade';
      divergencias.push(`Quantidade: nota ${n.quantidade} × documento ${d.quantidade}`);
    }
    if (n.validade !== d.validade) {
      if (status === 'ok') status = 'validade';
      divergencias.push(`Validade: nota ${fmtData(n.validade)} × documento ${fmtData(d.validade)}`);
    }
    // validade do documento pode ser a mais restritiva — alerta usa a menor
    linhas.push(nova({ status, nota: n, documento: d, divergencias }));
  }

  for (const n of sobraNota) {
    const idx = sobraDoc.findIndex((d) => mesmoProduto(n, d));
    if (idx >= 0) {
      const [d] = sobraDoc.splice(idx, 1);
      const divergencias = [`Lote: nota ${n.lote} × documento ${d.lote}`];
      if (n.quantidade !== d.quantidade) divergencias.push(`Quantidade: nota ${n.quantidade} × documento ${d.quantidade}`);
      if (n.validade !== d.validade) divergencias.push(`Validade: nota ${fmtData(n.validade)} × documento ${fmtData(d.validade)}`);
      linhas.push(nova({ status: 'lote', nota: n, documento: d, divergencias }));
    } else {
      linhas.push(nova({ status: 'so_nota', nota: n, divergencias: ['Item consta na nota mas não no documento'] }));
    }
  }

  for (const d of sobraDoc) {
    linhas.push(nova({ status: 'so_documento', documento: d, divergencias: ['Item consta no documento mas não na nota'] }));
  }
  // mantém a ordem da nota; itens só do documento vão ao final
  const pos = (l: LinhaComparacao) => (l.nota ? nota.indexOf(l.nota) : Number.MAX_SAFE_INTEGER);
  return linhas.sort((a, b) => pos(a) - pos(b)).map((l, i) => ({ ...l, chave: `l${i + 1}` }));
}
