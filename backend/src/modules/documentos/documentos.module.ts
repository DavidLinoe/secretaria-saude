import { Module } from '@nestjs/common';
import { MocksModule } from '../mocks/mocks.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';

@Module({ imports: [MocksModule], controllers: [DocumentosController], providers: [DocumentosService], exports: [DocumentosService] })
export class DocumentosModule {}
