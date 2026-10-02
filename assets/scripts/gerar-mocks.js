#!/usr/bin/env node
// Gera os PDFs (e PNGs "foto") de notas fiscais e romaneios fictícios em assets/.
// Uso: node assets/scripts/gerar-mocks.js   (precisa de `npm i` no backend: usa pdfkit de lá)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const PDFDocument = require('module').createRequire(path.join(__dirname, '../../backend/package.json'))('pdfkit');
const { SETS, montarRomaneio } = require('./dados-mock');

const OUT_NF = path.join(__dirname, '../notas-fiscais');
const OUT_DOC = path.join(__dirname, '../documentos');
fs.mkdirSync(OUT_NF, { recursive: true });
fs.mkdirSync(OUT_DOC, { recursive: true });

const brl = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso) => iso.split('-').reverse().join('/');
const validadeBR = (iso) => iso.split('-').slice(0, 2).reverse().join('/'); // MM/AAAA
const chaveFmt = (c) => c.replace(/(\d{4})/g, '$1 ').trim();

function tabela(doc, colunas, linhas, y, cor) {
  const x0 = 30;
  doc.rect(x0, y, 535, 18).fill(cor);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(7.5);
  colunas.forEach((c) => doc.text(c.titulo, c.x, y + 5, { width: c.w, align: c.align || 'left', lineBreak: false }));
  y += 18;
  doc.fillColor('#000').font('Helvetica').fontSize(8);
  linhas.forEach((l, idx) => {
    if (idx % 2) doc.rect(x0, y, 535, 20).fill('#f1f5f9');
    doc.fillColor('#000');
    colunas.forEach((c) => doc.text(String(l[c.key]), c.x, y + 6, { width: c.w, align: c.align || 'left', lineBreak: false }));
    y += 20;
  });
  doc.rect(x0, y - linhas.length * 20 - 18, 535, linhas.length * 20 + 18).stroke('#94a3b8');
  return y;
}

function gerarNota(set, arquivo) {
  const doc = new PDFDocument({ size: 'A4', margin: 30, info: { Title: `NF-e ${set.nota.numero}` } });
  const stream = fs.createWriteStream(arquivo);
  doc.pipe(stream);
  const f = set.fornecedor;
  const total = set.itens.reduce((s, i) => s + i.qtd * i.preco, 0);

  doc.rect(30, 30, 535, 70).stroke('#94a3b8');
  doc.fillColor(f.cor).font('Helvetica-Bold').fontSize(13).text(f.nome, 38, 40, { width: 330 });
  doc.fillColor('#000').font('Helvetica').fontSize(8).text(`CNPJ: ${f.cnpj}`, 38, 70).text(f.cidade, 38, 82);
  doc.font('Helvetica-Bold').fontSize(14).text('DANFE', 400, 38, { width: 160, align: 'center' });
  doc.font('Helvetica').fontSize(7).text('Documento Auxiliar da Nota Fiscal Eletrônica', 400, 55, { width: 160, align: 'center' });
  doc.fontSize(9).font('Helvetica-Bold').text(`Nº ${set.nota.numero}   Série ${set.nota.serie}`, 400, 80, { width: 160, align: 'center' });

  doc.rect(30, 106, 535, 34).stroke('#94a3b8');
  doc.font('Helvetica').fontSize(6.5).fillColor('#475569').text('CHAVE DE ACESSO', 38, 110);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text(`Chave de acesso: ${chaveFmt(set.nota.chave)}`, 38, 122);

  doc.rect(30, 146, 535, 44).stroke('#94a3b8');
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569').text('DESTINATÁRIO', 38, 150);
  doc.font('Helvetica').fontSize(9).fillColor('#000')
    .text('Destinatário: Secretaria Municipal da Saúde - Almoxarifado Central', 38, 162)
    .text(`Data de emissão: ${dataBR(set.nota.emissao)}        CNPJ: 11.222.333/0001-44`, 38, 175);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('DADOS DOS PRODUTOS / SERVIÇOS', 30, 200);
  const colunas = [
    { key: 'cod', titulo: 'CÓD.', x: 34, w: 50 },
    { key: 'nome', titulo: 'DESCRIÇÃO', x: 86, w: 190 },
    { key: 'lote', titulo: 'LOTE', x: 278, w: 62 },
    { key: 'val', titulo: 'VALIDADE', x: 342, w: 48 },
    { key: 'qtd', titulo: 'QTD', x: 392, w: 30, align: 'right' },
    { key: 'un', titulo: 'UN', x: 428, w: 25 },
    { key: 'vu', titulo: 'V.UNIT', x: 455, w: 50, align: 'right' },
    { key: 'vt', titulo: 'V.TOTAL', x: 507, w: 54, align: 'right' },
  ];
  const linhas = set.itens.map((i) => ({
    ...i, val: validadeBR(i.validade), vu: brl(i.preco), vt: brl(i.preco * i.qtd),
  }));
  const y = tabela(doc, colunas, linhas, 212, f.cor);

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text(`Valor total da nota: R$ ${brl(total)}`, 30, y + 14, { width: 535, align: 'right' });
  doc.font('Helvetica').fontSize(7).fillColor('#64748b').text('Documento fictício gerado para demonstração. Sem valor fiscal.', 30, 790, { width: 535, align: 'center' });
  doc.end();
  return new Promise((res) => stream.on('finish', res));
}

function gerarRomaneio(set, arquivo) {
  const doc = new PDFDocument({ size: 'A4', margin: 30, info: { Title: `Romaneio ${set.nota.numero}` } });
  const stream = fs.createWriteStream(arquivo);
  doc.pipe(stream);
  const f = set.fornecedor;
  const itens = montarRomaneio(set);

  doc.fillColor(f.cor).font('Helvetica-Bold').fontSize(15).text('ROMANEIO DE ENTREGA', 30, 40);
  doc.fillColor('#000').font('Helvetica').fontSize(9)
    .text(`Fornecedor: ${f.nome}`, 30, 66)
    .text(`CNPJ: ${f.cnpj}`, 30, 79)
    .text(`Referência NF: ${set.nota.numero}`, 30, 92)
    .text(`Data de emissão: ${dataBR(set.nota.emissao)}`, 30, 105)
    .text('Destino: Secretaria Municipal da Saúde - Almoxarifado Central', 30, 118);

  const colunas = [
    { key: 'ean', titulo: 'EAN', x: 34, w: 80 },
    { key: 'nome', titulo: 'MEDICAMENTO / INSUMO', x: 116, w: 210 },
    { key: 'lote', titulo: 'LOTE', x: 330, w: 70 },
    { key: 'val', titulo: 'VALIDADE', x: 405, w: 55 },
    { key: 'qtd', titulo: 'QTD', x: 465, w: 40, align: 'right' },
    { key: 'un', titulo: 'UN', x: 515, w: 40 },
  ];
  const linhas = itens.map((i) => ({ ...i, val: validadeBR(i.validade) }));
  const y = tabela(doc, colunas, linhas, 150, f.cor);

  doc.font('Helvetica').fontSize(8).fillColor('#000').text('Conferido por: ______________________      Data: ___/___/______', 30, y + 40);
  doc.fontSize(7).fillColor('#64748b').text('Documento fictício gerado para demonstração.', 30, 790, { width: 535, align: 'center' });
  doc.end();
  return new Promise((res) => stream.on('finish', res));
}

(async () => {
  for (const set of SETS) {
    const nf = path.join(OUT_NF, `${set.id}.pdf`);
    const doc = path.join(OUT_DOC, `${set.id}.pdf`);
    await gerarNota(set, nf);
    await gerarRomaneio(set, doc);
    // PNG "foto" da nota (para o fluxo de OCR por imagem)
    try {
      execFileSync('pdftoppm', ['-png', '-r', '220', '-singlefile', nf, path.join(OUT_NF, set.id)]);
    } catch { console.warn('pdftoppm indisponível — PNG não gerado'); }
    console.log('ok', set.id);
  }
  fs.writeFileSync(
    path.join(__dirname, '../manifest.json'),
    JSON.stringify(SETS.map((s) => ({
      id: s.id, titulo: s.titulo, descricao: s.descricao, fornecedor: s.fornecedor.nome,
      nota: `notas-fiscais/${s.id}.pdf`, notaImagem: `notas-fiscais/${s.id}.png`, documento: `documentos/${s.id}.pdf`,
    })), null, 2),
  );
})();
