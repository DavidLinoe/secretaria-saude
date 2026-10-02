import { BadRequestException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { DocumentoExtraido, NotaExtraida } from './extracao.model';
import { parseDocumento, parseNota } from './parsers';

const run = promisify(execFile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

/**
 * Extrai texto do arquivo e delega pros parsers.
 * - PDF com camada de texto: pdf.js, reconstruindo linhas/colunas por posição (separador \t).
 * - Imagem (foto): OCR com o binário `tesseract` (idioma por), se instalado no servidor.
 * Para foto ruim/PDF escaneado o OCR é best-effort: o que não for reconhecido
 * vira `avisos` e a tela de conferência mostra "item só no documento".
 */
@Injectable()
export class ExtracaoService {
  private readonly logger = new Logger(ExtracaoService.name);

  async extrairNota(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<NotaExtraida> {
    return parseNota(await this.texto(file));
  }

  async extrairDocumento(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<DocumentoExtraido> {
    return parseDocumento(await this.texto(file));
  }

  private async texto(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string> {
    if (file.mimetype === 'application/pdf') {
      const texto = await this.textoPdf(file.buffer);
      if (texto.trim().length > 20) return texto;
      throw new UnprocessableEntityException('PDF sem texto selecionável (escaneado). Envie uma foto da nota para usar OCR.');
    }
    if (file.mimetype.startsWith('image/')) return this.textoImagem(file);
    throw new BadRequestException(`Formato não suportado: ${file.mimetype}. Use PDF, JPEG ou PNG.`);
  }

  private async textoPdf(buffer: Buffer): Promise<string> {
    let doc;
    try {
      doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;
    } catch (err) {
      throw new UnprocessableEntityException(`PDF inválido ou corrompido: ${(err as Error).message}`);
    }
    const paginas: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      const itens = (content.items as { str: string; transform: number[] }[])
        .filter((i) => i.str.trim())
        .map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5] }))
        .sort((a, b) => b.y - a.y || a.x - b.x);
      // agrupa em linhas com tolerância vertical de 3pt
      const rows: { y: number; cells: { s: string; x: number }[] }[] = [];
      for (const it of itens) {
        const row = rows.find((r) => Math.abs(r.y - it.y) <= 3);
        if (row) row.cells.push(it);
        else rows.push({ y: it.y, cells: [it] });
      }
      paginas.push(rows.map((r) => r.cells.sort((a, b) => a.x - b.x).map((c) => c.s).join('\t')).join('\n'));
    }
    return paginas.join('\n');
  }

  private async textoImagem(file: { buffer: Buffer; originalname: string }): Promise<string> {
    const tmp = path.join(os.tmpdir(), `ocr-${randomUUID()}${path.extname(file.originalname) || '.png'}`);
    await fs.writeFile(tmp, file.buffer);
    try {
      // psm 6 = bloco uniforme de texto; preserva melhor linhas de tabela
      const { stdout } = await run('tesseract', [tmp, 'stdout', '-l', process.env.OCR_LANG ?? 'eng', '--psm', '6'], { timeout: 60000, maxBuffer: 10 * 1024 * 1024 });
      return stdout;
    } catch (err) {
      this.logger.error(`OCR falhou: ${(err as Error).message}`);
      throw new UnprocessableEntityException('OCR indisponível no servidor (instale o `tesseract`; defina OCR_LANG=por se tiver o idioma) ou imagem ilegível. Use o PDF da nota.');
    } finally {
      await fs.rm(tmp, { force: true });
    }
  }
}
