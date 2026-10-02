export type DocumentoTipo = 'nota_fiscal' | 'romaneio' | 'outro';
export type DocumentoOrigem = 'exemplo' | 'importado' | 'conferencia';

export interface DocumentoRegistro {
  id: string;
  nome: string;
  tipo: DocumentoTipo;
  origem: Exclude<DocumentoOrigem, 'exemplo'>;
  mimetype: string;
  tamanho: number;
  /** nome do arquivo em disco (uploads/) */
  arquivo: string;
  conferenciaId?: string;
  criadoEm: string;
}

export interface DocumentoView {
  id: string;
  nome: string;
  tipo: DocumentoTipo;
  origem: DocumentoOrigem;
  mimetype: string;
  tamanho: number;
  criadoEm?: string;
  /** caminho relativo da API que serve o arquivo (inline) */
  url: string;
  removivel: boolean;
}
