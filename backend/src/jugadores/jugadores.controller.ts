import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiError } from '../common/api-error.schema';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { QueryJugadoresDto } from './dto/query-jugadores.dto';
import { ReplaceJugadorDto } from './dto/replace-jugador.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { Jugador } from './entities/jugador.entity';
import { JugadoresService } from './jugadores.service';

/**
 * Capa HTTP: rutas, codigos de estado y pipes.
 *
 * No construye respuestas manualmente con @Res(): devuelve valores y deja que
 * NestJS los serialice. Los errores viajan como excepciones estandar.
 */
@ApiTags('jugadores')
@ApiBadRequestResponse({
  description: 'Datos invalidos o id con formato incorrecto',
  type: ApiError,
})
@Controller('jugadores')
export class JugadoresController {
  constructor(private readonly jugadoresService: JugadoresService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar y buscar en el plantel',
    description:
      'Admite los filtros opcionales `nombre` (coincidencia parcial, sin distinguir ' +
      'mayusculas ni acentos) y `posicion` (valor exacto del enum). La coleccion ' +
      'siempre existe: si nada coincide devuelve un arreglo vacio con 200, no 404. ' +
      'Un parametro de query desconocido, o una posicion fuera del enum, responden 400.',
  })
  @ApiOkResponse({
    description: 'Plantel ordenado por dorsal, ya filtrado',
    type: [Jugador],
  })
  listar(@Query() filtros: QueryJugadoresDto): Jugador[] {
    return this.jugadoresService.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un jugador por id' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador del jugador',
  })
  @ApiOkResponse({ description: 'Jugador encontrado', type: Jugador })
  @ApiNotFoundResponse({
    description: 'No hay un jugador con ese id',
    type: ApiError,
  })
  obtener(@Param('id', ParseUUIDPipe) id: string): Jugador {
    return this.jugadoresService.obtener(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Fichar un jugador',
    description:
      'El dorsal debe estar libre y el plantel no puede superar los 25 jugadores.',
  })
  @ApiCreatedResponse({
    description: 'Jugador incorporado al plantel',
    type: Jugador,
  })
  @ApiConflictResponse({
    description: 'Dorsal ocupado o plantel completo',
    type: ApiError,
  })
  fichar(@Body() datos: CreateJugadorDto): Jugador {
    return this.jugadoresService.fichar(datos);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modificar parcialmente un jugador',
    description:
      'Acepta cualquier subconjunto de campos, pero el cuerpo no puede estar vacio.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador del jugador',
  })
  @ApiOkResponse({ description: 'Jugador actualizado', type: Jugador })
  @ApiNotFoundResponse({
    description: 'No hay un jugador con ese id',
    type: ApiError,
  })
  @ApiConflictResponse({
    description: 'El dorsal solicitado ya esta ocupado',
    type: ApiError,
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: UpdateJugadorDto,
  ): Jugador {
    return this.jugadoresService.actualizar(id, cambios);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Reemplazar un jugador por completo',
    description:
      'Reemplazo total: exige los cinco campos del modelo. Omitir uno devuelve 400, no conserva el valor anterior. Solo se preserva el id.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador del jugador',
  })
  @ApiOkResponse({ description: 'Jugador reemplazado', type: Jugador })
  @ApiNotFoundResponse({
    description: 'No hay un jugador con ese id',
    type: ApiError,
  })
  @ApiConflictResponse({
    description: 'El dorsal solicitado ya esta ocupado',
    type: ApiError,
  })
  reemplazar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ReplaceJugadorDto,
  ): Jugador {
    return this.jugadoresService.reemplazar(id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dar de baja a un jugador',
    description:
      'No hay contenido que devolver, por eso responde 204 sin cuerpo.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador del jugador',
  })
  @ApiNoContentResponse({ description: 'Jugador dado de baja' })
  @ApiNotFoundResponse({
    description: 'No hay un jugador con ese id',
    type: ApiError,
  })
  eliminar(@Param('id', ParseUUIDPipe) id: string): void {
    this.jugadoresService.eliminar(id);
  }
}
