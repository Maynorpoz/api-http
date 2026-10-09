import { Module } from '@nestjs/common';
import { JugadoresController } from './jugadores.controller';
import { JugadoresService } from './jugadores.service';

/** Modulo de caracteristica: todo lo relativo al plantel vive aqui. */
@Module({
  controllers: [JugadoresController],
  providers: [JugadoresService],
})
export class JugadoresModule {}
