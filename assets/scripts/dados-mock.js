// Dados 100% fictícios (CNPJs/chaves inválidos de propósito) para demonstração.
// Cada "set" = 1 nota fiscal + 1 romaneio de entrega (documento que acompanha a carga).
// O romaneio traz divergências plantadas pra exercitar a conferência.

const CATALOGO = {
  dipirona: { cod: 'MED-0012', nome: 'Dipirona Sódica 500mg Comprimido', un: 'CX', ean: '7891234560012', preco: 8.9, ms: '1.0235.0123' },
  paracetamol: { cod: 'MED-0034', nome: 'Paracetamol 750mg Comprimido', un: 'CX', ean: '7891234560034', preco: 6.5, ms: '1.0235.0456' },
  amoxicilina: { cod: 'MED-0101', nome: 'Amoxicilina 500mg Cápsula', un: 'CX', ean: '7891234560101', preco: 21.4, ms: '1.0573.0210' },
  losartana: { cod: 'MED-0150', nome: 'Losartana Potássica 50mg Comprimido', un: 'CX', ean: '7891234560150', preco: 12.75, ms: '1.0033.0098' },
  metformina: { cod: 'MED-0177', nome: 'Cloridrato de Metformina 850mg Comprimido', un: 'CX', ean: '7891234560177', preco: 14.2, ms: '1.0235.0777' },
  omeprazol: { cod: 'MED-0203', nome: 'Omeprazol 20mg Cápsula', un: 'CX', ean: '7891234560203', preco: 9.8, ms: '1.0573.0333' },
  insulina: { cod: 'MED-0310', nome: 'Insulina Humana NPH 100UI/mL Frasco 10mL', un: 'FR', ean: '7891234560310', preco: 38.0, ms: '1.1260.0044' },
  soro: { cod: 'MED-0402', nome: 'Cloreto de Sódio 0,9% Solução Injetável 500mL', un: 'BOL', ean: '7891234560402', preco: 4.3, ms: '1.0390.0150' },
  ibuprofeno: { cod: 'MED-0055', nome: 'Ibuprofeno 600mg Comprimido', un: 'CX', ean: '7891234560055', preco: 11.1, ms: '1.0235.0555' },
  captopril: { cod: 'MED-0120', nome: 'Captopril 25mg Comprimido', un: 'CX', ean: '7891234560120', preco: 5.9, ms: '1.0033.0120' },
  seringa: { cod: 'INS-0001', nome: 'Seringa Descartável 5mL sem Agulha', un: 'CX', ean: '7891234560901', preco: 45.0, ms: '8.0123.0001' },
  luva: { cod: 'INS-0007', nome: 'Luva de Procedimento Nitrílica M', un: 'CX', ean: '7891234560907', preco: 32.0, ms: '8.0123.0007' },
};

const it = (key, lote, validade, qtd, extra = {}) => ({ ...CATALOGO[key], lote, validade, qtd, ...extra });

const SETS = [
  {
    id: 'set-01-sem-divergencia',
    titulo: 'Entrega completa, sem divergência',
    descricao: 'Nota e romaneio batem em todos os itens.',
    fornecedor: { nome: 'FarmaDist Distribuidora de Medicamentos LTDA', cnpj: '12.345.678/0001-90', cidade: 'Fortaleza/CE', cor: '#1f3a5f' },
    nota: { numero: '000123', serie: '1', emissao: '2026-09-28', chave: '23260912345678000190550010000001231000012349' },
    itens: [
      it('dipirona', 'DP240915', '2028-09-30', 200),
      it('paracetamol', 'PT250102', '2028-12-31', 150),
      it('amoxicilina', 'AM250310', '2028-03-31', 120),
      it('losartana', 'LS250411', '2028-04-30', 300),
    ],
    romaneio: {},
  },
  {
    id: 'set-02-quantidade-divergente',
    titulo: 'Quantidade divergente',
    descricao: 'Romaneio registra menos caixas de Metformina e Omeprazol que a nota.',
    fornecedor: { nome: 'MedLog Comércio Hospitalar S.A.', cnpj: '98.765.432/0001-10', cidade: 'Recife/PE', cor: '#14532d' },
    nota: { numero: '004587', serie: '2', emissao: '2026-09-29', chave: '26260998765432000110550020000045871000045873' },
    itens: [
      it('metformina', 'MF250520', '2028-05-31', 400),
      it('omeprazol', 'OM250601', '2028-06-30', 250),
      it('captopril', 'CP250115', '2028-01-31', 180),
    ],
    romaneio: { qtd: { MF250520: 380, OM250601: 200 } },
  },
  {
    id: 'set-03-lote-e-validade',
    titulo: 'Lote e validade divergentes',
    descricao: 'Lote da Insulina difere entre os documentos; validade do Soro é menor que a da nota.',
    fornecedor: { nome: 'BioSaúde Produtos Farmacêuticos LTDA', cnpj: '45.678.901/0001-23', cidade: 'Salvador/BA', cor: '#7c2d12' },
    nota: { numero: '009912', serie: '1', emissao: '2026-09-30', chave: '29260945678901000123550010000099121000099127' },
    itens: [
      it('insulina', 'IN250701', '2027-07-31', 60),
      it('soro', 'SF250805', '2028-08-31', 500),
      it('ibuprofeno', 'IB250910', '2028-09-30', 220),
    ],
    romaneio: { lote: { IN250701: 'IN250710' }, validade: { SF250805: '2027-08-31' } },
  },
  {
    id: 'set-04-item-faltando-e-extra',
    titulo: 'Item faltando e item extra',
    descricao: 'Seringas constam só na nota; Luvas constam só no romaneio.',
    fornecedor: { nome: 'Hospitalar Norte Distribuição LTDA', cnpj: '33.222.111/0001-55', cidade: 'Belém/PA', cor: '#4c1d95' },
    nota: { numero: '015340', serie: '1', emissao: '2026-10-01', chave: '15261033222111000155550010000153401000153402' },
    itens: [
      it('dipirona', 'DP260101', '2028-12-31', 100),
      it('seringa', 'SR260210', '2029-02-28', 80),
      it('losartana', 'LS260305', '2028-03-31', 150),
    ],
    romaneio: { remover: ['SR260210'], extras: [it('luva', 'LV260401', '2029-04-30', 50)] },
  },
  {
    id: 'set-05-validade-curta',
    titulo: 'Medicamento vencido / validade curta',
    descricao: 'Nota e romaneio batem, mas um lote vence em menos de 6 meses e outro já venceu.',
    fornecedor: { nome: 'FarmaDist Distribuidora de Medicamentos LTDA', cnpj: '12.345.678/0001-90', cidade: 'Fortaleza/CE', cor: '#1f3a5f' },
    nota: { numero: '000131', serie: '1', emissao: '2026-10-01', chave: '23261012345678000190550010000001311000013119' },
    itens: [
      it('amoxicilina', 'AM240801', '2026-12-15', 90),
      it('paracetamol', 'PT240315', '2026-09-30', 60),
      it('metformina', 'MF260210', '2029-02-28', 200),
    ],
    romaneio: {},
  },
  {
    id: 'set-06-carga-grande',
    titulo: 'Carga grande com várias divergências',
    descricao: '8 itens; mistura de quantidade, lote e item faltando.',
    fornecedor: { nome: 'Rede Nacional de Medicamentos S.A.', cnpj: '55.444.333/0001-22', cidade: 'São Paulo/SP', cor: '#0f172a' },
    nota: { numero: '078001', serie: '3', emissao: '2026-10-02', chave: '35261055444333000122550030000780011000780010' },
    itens: [
      it('dipirona', 'DP260501', '2028-05-31', 500),
      it('paracetamol', 'PT260502', '2028-05-31', 400),
      it('amoxicilina', 'AM260503', '2028-05-31', 300),
      it('losartana', 'LS260504', '2028-05-31', 350),
      it('metformina', 'MF260505', '2028-05-31', 450),
      it('omeprazol', 'OM260506', '2028-05-31', 280),
      it('insulina', 'IN260507', '2027-11-30', 80),
      it('soro', 'SF260508', '2028-05-31', 600),
    ],
    romaneio: { qtd: { AM260503: 250 }, lote: { OM260506: 'OM260560' }, remover: ['SF260508'] },
  },
];

function montarRomaneio(set) {
  const r = set.romaneio || {};
  let itens = set.itens
    .filter((i) => !(r.remover || []).includes(i.lote))
    .map((i) => ({
      ...i,
      qtd: r.qtd?.[i.lote] ?? i.qtd,
      validade: r.validade?.[i.lote] ?? i.validade,
      lote: r.lote?.[i.lote] ?? i.lote,
    }));
  itens = itens.concat(r.extras || []);
  return itens;
}

module.exports = { SETS, CATALOGO, montarRomaneio };
