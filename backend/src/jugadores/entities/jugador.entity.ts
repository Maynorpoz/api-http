import { ApiProperty } from '@nestjs/swagger';

/** Posiciones admitidas dentro del plantel. */
export enum Posicion {
  ARQUERO = 'ARQUERO',
  DEFENSA = 'DEFENSA',
  MEDIOCAMPISTA = 'MEDIOCAMPISTA',
  DELANTERO = 'DELANTERO',
}

/**
 * Jugador del plantel del Liverpool FC.
 *
 * El club no se modela como entidad: es el contexto implicito de toda la API.
 */
export class Jugador {
  @ApiProperty({
    description: 'Identificador generado por el servidor',
    format: 'uuid',
    example: '3f1b9c6e-5a7d-4c2b-9f8e-1d0a2b3c4d5e',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre completo del jugador',
    example: 'Mohamed Salah',
  })
  nombre: string;

  @ApiProperty({
    description: 'Numero de camiseta, unico en el plantel',
    example: 11,
  })
  dorsal: number;

  @ApiProperty({
    description: 'Posicion en la que juega',
    enum: Posicion,
    example: Posicion.DELANTERO,
  })
  posicion: Posicion;

  @ApiProperty({ description: 'Edad en anios', example: 33 })
  edad: number;

  @ApiProperty({ description: 'Goles convertidos con el club', example: 180 })
  goles: number;
}
