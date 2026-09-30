import { Module } from '@nestjs/common';
import { StatusController } from './status.controller';
import { NotasModule } from './modules/notas/notas.module';

/**
 * Repo standalone extraído de `web-who/webwhoapi` (era o microserviço
 * `src/apps/secretaria-saude` dentro do monorepo). Sem guard/interceptor
 * global de propósito — ainda não há autenticação real neste MVP (todas as
 * rotas são públicas). Ver README para o histórico da decisão de separar
 * este app num repositório próprio.
 */
@Module({
  imports: [NotasModule],
  controllers: [StatusController],
})
export class AppModule {}
