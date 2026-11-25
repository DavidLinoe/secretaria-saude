import { Module } from '@nestjs/common';
import { EstoqueController } from './estoque.controller';
import { PolosModule } from '../polos/polos.module';
import { EstoqueService } from './estoque.service';

@Module({
  imports: [PolosModule],
  controllers: [EstoqueController],
  providers: [EstoqueService],
  exports: [EstoqueService],
})
export class EstoqueModule {}
