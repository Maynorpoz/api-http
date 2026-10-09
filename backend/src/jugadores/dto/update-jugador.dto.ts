import { PartialType } from '@nestjs/swagger';
import { CreateJugadorDto } from './create-jugador.dto';
import { AtLeastOneField } from './at-least-one-field.validator';

/**
 * Cuerpo esperado en una modificacion parcial (PATCH /jugadores/:id).
 *
 * Todos los campos son opcionales, pero el cuerpo no puede estar vacio.
 */
@AtLeastOneField()
export class UpdateJugadorDto extends PartialType(CreateJugadorDto) {}
