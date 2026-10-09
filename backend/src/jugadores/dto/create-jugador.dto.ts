import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Posicion } from '../entities/jugador.entity';

/** Cuerpo esperado al fichar un jugador (POST /jugadores). */
export class CreateJugadorDto {
  @ApiProperty({
    description: 'Nombre completo del jugador',
    example: 'Cody Gakpo',
    minLength: 3,
    maxLength: 60,
  })
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @Length(3, 60, { message: 'nombre debe tener entre 3 y 60 caracteres' })
  nombre: string;

  @ApiProperty({
    description: 'Numero de camiseta. Debe estar libre en el plantel',
    example: 18,
    minimum: 1,
    maximum: 99,
  })
  @IsInt({ message: 'dorsal debe ser un numero entero' })
  @Min(1, { message: 'dorsal debe ser mayor o igual a 1' })
  @Max(99, { message: 'dorsal debe ser menor o igual a 99' })
  dorsal: number;

  @ApiProperty({ description: 'Posicion en la que juega', enum: Posicion })
  @IsEnum(Posicion, {
    message: `posicion debe ser uno de estos valores: ${Object.values(Posicion).join(', ')}`,
  })
  posicion: Posicion;

  @ApiProperty({
    description: 'Edad en anios',
    example: 26,
    minimum: 16,
    maximum: 45,
  })
  @IsInt({ message: 'edad debe ser un numero entero' })
  @Min(16, { message: 'edad debe ser mayor o igual a 16' })
  @Max(45, { message: 'edad debe ser menor o igual a 45' })
  edad: number;

  @ApiPropertyOptional({
    description: 'Goles convertidos con el club. Si se omite se asume 0',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'goles debe ser un numero entero' })
  @Min(0, { message: 'goles debe ser mayor o igual a 0' })
  goles?: number;
}
