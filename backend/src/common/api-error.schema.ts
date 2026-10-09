import { ApiProperty } from '@nestjs/swagger';

/**
 * Forma unica de las respuestas de error. Existe para documentarla en OpenAPI:
 * quien consume la API sabe que todos los errores se parsean igual.
 */
export class ApiError {
  @ApiProperty({ description: 'Codigo HTTP de la respuesta', example: 409 })
  statusCode: number;

  @ApiProperty({ description: 'Nombre del codigo HTTP', example: 'Conflict' })
  error: string;

  @ApiProperty({
    description:
      'Motivos del error. Siempre es un arreglo, incluso con un solo motivo',
    type: [String],
    example: ['El dorsal 11 ya esta asignado a Mohamed Salah'],
  })
  message: string[];

  @ApiProperty({
    description: 'Ruta que origino el error',
    example: '/jugadores',
  })
  path: string;

  @ApiProperty({
    description: 'Momento del error en ISO 8601',
    example: '2026-10-06T19:30:00.000Z',
  })
  timestamp: string;
}
