import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateJugadorDto } from './create-jugador.dto';

/**
 * Cuerpo esperado en un reemplazo completo (PUT /jugadores/:id).
 *
 * A diferencia del POST, aqui `goles` tambien es obligatorio: PUT sustituye el
 * recurso entero, por lo que omitir un campo es un error y no un "dejarlo igual".
 */
export class ReplaceJugadorDto extends OmitType(CreateJugadorDto, [
  'goles',
] as const) {
  @ApiProperty({
    description: 'Goles convertidos con el club',
    example: 12,
    minimum: 0,
  })
  @IsInt({ message: 'goles debe ser un numero entero' })
  @Min(0, { message: 'goles debe ser mayor o igual a 0' })
  goles: number;
}
