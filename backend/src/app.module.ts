import { Module } from '@nestjs/common';
import { JugadoresModule } from './jugadores/jugadores.module';

@Module({
  imports: [JugadoresModule],
})
export class AppModule {}
