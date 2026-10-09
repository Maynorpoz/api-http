import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Posicion } from '../entities/jugador.entity';

/**
 * Filtros de GET /jugadores.
 *
 * Los parametros de query siempre llegan como texto, por eso aqui no hace falta
 * convertir tipos. Lo que si hace falta es normalizar: un `?nombre=` vacio debe
 * equivaler a no filtrar, no a buscar la cadena vacia.
 */
export class QueryJugadoresDto {
  @ApiPropertyOptional({
    description:
      'Coincidencia parcial del nombre. No distingue mayusculas ni acentos',
    example: 'sal',
    maxLength: 60,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const limpio = value.trim();
    return limpio === '' ? undefined : limpio;
  })
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @MaxLength(60, { message: 'nombre no puede superar los 60 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Filtra por posicion exacta',
    enum: Posicion,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsEnum(Posicion, {
    message: `posicion debe ser uno de estos valores: ${Object.values(Posicion).join(', ')}`,
  })
  posicion?: Posicion;
}
