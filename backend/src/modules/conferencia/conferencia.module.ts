import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { ExtracaoModule } from '../extracao/extracao.module';
import { MocksModule } from '../mocks/mocks.module';
import { ConferenciaController } from './conferencia.controller';
import { ConferenciaService } from './conferencia.service';

@Module({
  imports: [DocumentosModule, EstoqueModule, ExtracaoModule, MocksModule],
  controllers: [ConferenciaController],
  providers: [ConferenciaService],
  exports: [ConferenciaService],
})
export class ConferenciaModule {}
