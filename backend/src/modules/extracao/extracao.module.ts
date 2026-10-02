import { Module } from '@nestjs/common';
import { ExtracaoService } from './extracao.service';

@Module({ providers: [ExtracaoService], exports: [ExtracaoService] })
export class ExtracaoModule {}
