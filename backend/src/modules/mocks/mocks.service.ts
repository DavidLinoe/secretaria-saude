import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ArquivoUpload } from '../conferencia/conferencia.service';

interface MockSet {
  id: string;
  titulo: string;
  descricao: string;
  fornecedor: string;
  nota: string;
  notaImagem: string;
  documento: string;
}

/** Lê os mocks de `assets/` (gerados por `assets/scripts/gerar-mocks.js`). */
@Injectable()
export class MocksService {
  readonly dir = process.env.ASSETS_DIR ?? path.resolve(process.cwd(), '..', 'assets');

  listar(): MockSet[] {
    const manifest = path.join(this.dir, 'manifest.json');
    return fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : [];
  }

  arquivos(setId: string): { nota: ArquivoUpload; documento: ArquivoUpload; urls: { nota: string; documento: string } } {
    const set = this.listar().find((s) => s.id === setId);
    if (!set) throw new NotFoundException('Mock não encontrado');
    return {
      nota: this.ler(set.nota),
      documento: this.ler(set.documento),
      urls: { nota: `mocks/arquivo/${set.nota}`, documento: `mocks/arquivo/${set.documento}` },
    };
  }

  /** Caminho absoluto seguro (impede `..` fugir de assets/). */
  resolver(relativo: string): string {
    const abs = path.resolve(this.dir, relativo);
    if (!abs.startsWith(this.dir + path.sep) || !fs.existsSync(abs)) throw new NotFoundException('Arquivo não encontrado');
    return abs;
  }

  private ler(rel: string): ArquivoUpload {
    const abs = this.resolver(rel);
    return { buffer: fs.readFileSync(abs), mimetype: 'application/pdf', originalname: path.basename(abs) };
  }
}
