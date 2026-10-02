import { dataBrParaIso, numeroBR, validadeParaIso } from '../../common/texto';
import { DocumentoExtraido, ItemExtraido, NotaExtraida } from './extracao.model';

const SEP = '[\\t ]+';
const NOME = '(.+?)';
const LOTE = '([A-Z0-9][A-Z0-9-]{3,})';
const VALIDADE = '(\\d{2}\\/\\d{4}|\\d{2}\\/\\d{2}\\/\\d{4})';
const QTD = '(\\d{1,3}(?:\\.\\d{3})*|\\d+)';
const UN = '([A-Z]{2,4})';
const VALOR = '(\\d{1,3}(?:\\.\\d{3})*,\\d{2})';

// COD | DESCRIÇÃO | LOTE | VALIDADE | QTD | UN | V.UNIT | V.TOTAL
const RE_ITEM_NOTA = new RegExp(`^([A-Z]{2,4}-\\d{3,6})${SEP}${NOME}${SEP}${LOTE}${SEP}${VALIDADE}${SEP}${QTD}${SEP}${UN}${SEP}${VALOR}${SEP}${VALOR}$`);
// EAN | MEDICAMENTO | LOTE | VALIDADE | QTD | UN
const RE_ITEM_DOC = new RegExp(`^(\\d{8,14})${SEP}${NOME}${SEP}${LOTE}${SEP}${VALIDADE}${SEP}${QTD}${SEP}${UN}$`);

// remove ruído típico de OCR (bordas de tabela viram | _ = —) antes de casar as linhas
const linhas = (texto: string) =>
  texto
    .split('\n')
    .map((l) => l.replace(/\u00a0/g, ' ').replace(/[|_=—–]+/g, ' ').replace(/ {2,}/g, ' ').trim())
    .filter(Boolean);

export function parseNota(texto: string): NotaExtraida {
  const ls = linhas(texto);
  const avisos: string[] = [];
  const itens: ItemExtraido[] = [];
  for (const l of ls) {
    const m = l.match(RE_ITEM_NOTA);
    if (!m) continue;
    const validade = validadeParaIso(m[4]);
    if (!validade) {
      avisos.push(`Validade ilegível na linha: ${l}`);
      continue;
    }
    itens.push({ codigo: m[1], nome: m[2].trim(), lote: m[3], validade, quantidade: numeroBR(m[5]), unidade: m[6], valorUnitario: numeroBR(m[7]) });
  }
  if (!itens.length) avisos.push('Nenhum item reconhecido na nota. Verifique se o arquivo é uma DANFE legível.');

  const alvo = texto.replace(/\s+/g, ' ');
  const chave = (alvo.match(/Chave de acesso:?\s*((?:\d{4}\s?){11})/i)?.[1] ?? '').replace(/\s/g, '');
  const numero = alvo.match(/N[ºo°2]?\s*(\d{6,9})\s+S[ée]rie/i)?.[1] ?? alvo.match(/N[ºo°]\s*(\d{3,9})/)?.[1];
  const serie = alvo.match(/S[ée]rie\s*(\d+)/i)?.[1];
  const emissao = dataBrParaIso(alvo.match(/Data de emiss[ãa]o:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? '') ?? undefined;
  const cnpj = alvo.match(/CNPJ:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/)?.[1];
  const fornecedor = ls.find((l) => /\b(LTDA|S\.?\/?A\.?|EIRELI|ME)\b/.test(l) && !/Destinat/i.test(l))?.split('\t')[0].replace(/\s+DANFE$/, '').trim();
  const total = alvo.match(/Valor total da nota:?\s*R\$\s*([\d.]+,\d{2})/i)?.[1];
  const valorTotal = total ? numeroBR(total) : undefined;

  if (!numero) avisos.push('Número da nota não encontrado.');
  if (itens.length && valorTotal !== undefined && itens.every((i) => i.valorUnitario !== undefined)) {
    const soma = itens.reduce((s, i) => s + i.quantidade * (i.valorUnitario ?? 0), 0);
    if (Math.abs(soma - valorTotal) > 0.05) avisos.push(`Soma dos itens (${soma.toFixed(2)}) difere do total da nota (${valorTotal.toFixed(2)}) — possível item não lido.`);
  }
  return { tipo: 'nota_fiscal', numero, serie, chave: chave || undefined, emissao, fornecedor, cnpj, valorTotal, itens, avisos };
}

export function parseDocumento(texto: string): DocumentoExtraido {
  const ls = linhas(texto);
  const avisos: string[] = [];
  const itens: ItemExtraido[] = [];
  for (const l of ls) {
    const m = l.match(RE_ITEM_DOC);
    if (!m) continue;
    const validade = validadeParaIso(m[4]);
    if (!validade) {
      avisos.push(`Validade ilegível na linha: ${l}`);
      continue;
    }
    itens.push({ ean: m[1], nome: m[2].trim(), lote: m[3], validade, quantidade: numeroBR(m[5]), unidade: m[6] });
  }
  if (!itens.length) avisos.push('Nenhum item reconhecido no documento.');
  const alvo = texto.replace(/\s+/g, ' ');
  return {
    tipo: 'romaneio',
    referenciaNota: alvo.match(/Refer[êe]ncia NF:?\s*(\d+)/i)?.[1],
    fornecedor: alvo.match(/Fornecedor:?\s*(.+?)(?:\s+CNPJ|$)/i)?.[1]?.trim(),
    emissao: dataBrParaIso(alvo.match(/Data de emiss[ãa]o:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? '') ?? undefined,
    itens,
    avisos,
  };
}
