import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { JsonCollection, dataDir } from '../../common/json-store';
import { MocksService } from '../mocks/mocks.service';
import { DocumentoRegistro, DocumentoTipo, DocumentoView } from './documentos.model';

const TIPOS: DocumentoTipo[] = ['nota_fiscal', 'romaneio', 'outro'];
const EXT: Record<string, string> = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MIME_POR_EXT: Record<string, string> = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

/**
 * Arquivos importados ficam em disco (`<DATA_DIR>/uploads`) e os metadados em JSON —
 * mesmo mecanismo do resto do MVP; trocar por S3/banco só exige mexer aqui.
 */
@Injectable()
export class DocumentosService {
  private readonly registros = new JsonCollection<DocumentoRegistro>('documentos');
  private readonly pasta = path.join(dataDir(), 'uploads');

  constructor(private readonly mocks: MocksService) {
    fs.mkdirSync(this.pasta, { recursive: true });
  }

  listar(): DocumentoView[] {
    const exemplos: DocumentoView[] = [];
    for (const s of this.mocks.listar()) {
      exemplos.push(this.viewExemplo(s.nota, 'nota_fiscal'), this.viewExemplo(s.documento, 'romaneio'));
      if (s.notaImagem && fs.existsSync(path.join(this.mocks.dir, s.notaImagem))) exemplos.push(this.viewExemplo(s.notaImagem, 'nota_fiscal'));
    }
    const salvos = this.registros.all().map((r) => this.view(r));
    return [...salvos.sort((a, b) => (b.criadoEm ?? '').localeCompare(a.criadoEm ?? '')), ...exemplos];
  }

  salvar(
    file: { buffer: Buffer; mimetype: string; originalname: string },
    tipo: string,
    origem: DocumentoRegistro['origem'] = 'importado',
    conferenciaId?: string,
  ): DocumentoView {
    const ext = EXT[file.mimetype];
    if (!ext) throw new BadRequestException(`Formato não suportado: ${file.mimetype}. Use PDF, JPEG, PNG ou WEBP.`);
    const t = TIPOS.includes(tipo as DocumentoTipo) ? (tipo as DocumentoTipo) : 'outro';
    const id = randomUUID();
    const arquivo = `${id}${ext}`;
    fs.writeFileSync(path.join(this.pasta, arquivo), file.buffer);
    const reg = this.registros.insert({
      id,
      nome: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      tipo: t,
      origem,
      mimetype: file.mimetype,
      tamanho: file.buffer.length,
      arquivo,
      conferenciaId,
      criadoEm: new Date().toISOString(),
    });
    return this.view(reg);
  }

  caminho(id: string): { abs: string; mimetype: string; nome: string } {
    const r = this.registros.find(id);
    if (!r) throw new NotFoundException('Documento não encontrado');
    const abs = path.join(this.pasta, r.arquivo);
    if (!fs.existsSync(abs)) throw new NotFoundException('Arquivo ausente no disco');
    return { abs, mimetype: r.mimetype, nome: r.nome };
  }

  /** Apaga todos os arquivos salvos (importados e de conferências). Exemplos de assets/ não são tocados. */
  resetar(): void {
    for (const r of this.registros.all()) fs.rmSync(path.join(this.pasta, r.arquivo), { force: true });
    this.registros.removeWhere(() => true);
  }

  remover(id: string): void {
    const r = this.registros.find(id);
    if (!r) throw new NotFoundException('Documento não encontrado (exemplos não podem ser removidos)');
    fs.rmSync(path.join(this.pasta, r.arquivo), { force: true });
    this.registros.remove(id);
  }

  private view(r: DocumentoRegistro): DocumentoView {
    return {
      id: r.id, nome: r.nome, tipo: r.tipo, origem: r.origem, mimetype: r.mimetype, tamanho: r.tamanho,
      criadoEm: r.criadoEm, url: `documentos/${r.id}/arquivo`, removivel: true,
    };
  }

  private viewExemplo(rel: string, tipo: DocumentoTipo): DocumentoView {
    const abs = path.join(this.mocks.dir, rel);
    const ext = path.extname(rel);
    return {
      id: `exemplo:${rel}`, nome: path.basename(rel), tipo, origem: 'exemplo', mimetype: MIME_POR_EXT[ext] ?? 'application/octet-stream',
      tamanho: fs.existsSync(abs) ? fs.statSync(abs).size : 0, url: `mocks/arquivo/${rel}`, removivel: false,
    };
  }
}
