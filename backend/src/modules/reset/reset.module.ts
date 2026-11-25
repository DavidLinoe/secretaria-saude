import { Controller, Module, Post } from '@nestjs/common';
import { ConferenciaModule } from '../conferencia/conferencia.module';
import { ConferenciaService } from '../conferencia/conferencia.service';
import { DocumentosModule } from '../documentos/documentos.module';
import { DocumentosService } from '../documentos/documentos.service';
import { EstoqueModule } from '../estoque/estoque.module';
import { EstoqueService } from '../estoque/estoque.service';
import { PolosModule } from '../polos/polos.module';
import { PolosService } from '../polos/polos.service';
import { NotasModule } from '../notas/notas.module';
import { NotasService } from '../notas/notas.service';

/**
 * Zera todo o estado de teste (estoque, movimentações, conferências, documentos
 * salvos, histórico de notas). Só POST de propósito: GET poderia ser disparado
 * por prefetch/crawler. Os exemplos de `assets/` nunca são apagados.
 */
@Controller('reset')
export class ResetController {
  constructor(
    private readonly estoque: EstoqueService,
    private readonly conferencias: ConferenciaService,
    private readonly documentos: DocumentosService,
    private readonly notas: NotasService,
    private readonly polos: PolosService,
  ) {}

  @Post()
  resetar() {
    this.estoque.resetar();
    this.conferencias.resetar();
    this.documentos.resetar();
    this.notas.resetar();
    this.polos.resetar();
    return { resetado: true, em: new Date().toISOString() };
  }
}

@Module({ imports: [EstoqueModule, ConferenciaModule, DocumentosModule, NotasModule, PolosModule], controllers: [ResetController] })
export class ResetModule {}
