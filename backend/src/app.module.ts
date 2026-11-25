import { Module } from '@nestjs/common';
import { StatusController } from './status.controller';
import { NotasModule } from './modules/notas/notas.module';
import { EstoqueModule } from './modules/estoque/estoque.module';
import { ConferenciaModule } from './modules/conferencia/conferencia.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { PolosModule } from './modules/polos/polos.module';
import { ResetModule } from './modules/reset/reset.module';
import { MocksModule } from './modules/mocks/mocks.module';

/**
 * Repo standalone extraído de `web-who/webwhoapi` (era o microserviço
 * `src/apps/secretaria-saude` dentro do monorepo). Sem guard/interceptor
 * global de propósito — ainda não há autenticação real neste MVP (todas as
 * rotas são públicas). Ver README para o histórico da decisão de separar
 * este app num repositório próprio.
 */
@Module({
  imports: [NotasModule, EstoqueModule, ConferenciaModule, MocksModule, DocumentosModule, ResetModule, PolosModule],
  controllers: [StatusController],
})
export class AppModule {}
