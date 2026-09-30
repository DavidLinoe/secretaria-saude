import { Module } from '@nestjs/common';
import { PythonBridgeModule } from '../python-bridge/python-bridge.module';
import { NotasController } from './notas.controller';
import { NotasService } from './notas.service';
import { NotasRepository } from './notas.repository';

@Module({
  imports: [PythonBridgeModule],
  controllers: [NotasController],
  providers: [NotasService, NotasRepository],
})
export class NotasModule {}
