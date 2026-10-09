import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { QueryJugadoresDto } from './dto/query-jugadores.dto';
import { ReplaceJugadorDto } from './dto/replace-jugador.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { Jugador, Posicion } from './entities/jugador.entity';

/**
 * Plantel conservado en memoria.
 *
 * El servicio concentra las reglas de negocio y lanza las excepciones estandar
 * de NestJS. No conoce nada de HTTP: no recibe ni manipula `request`/`response`.
 */
@Injectable()
export class JugadoresService {
  /** Tope reglamentario del plantel. Fichar por encima de este numero es un conflicto. */
  private static readonly LIMITE_PLANTEL = 25;

  private readonly plantel = new Map<string, Jugador>();

  constructor() {
    this.sembrarPlantel();
  }

  /**
   * Devuelve el plantel ordenado por dorsal, aplicando los filtros recibidos.
   *
   * La coleccion siempre existe: si ningun jugador coincide, el resultado es un
   * arreglo vacio con 200, nunca un 404.
   */
  listar(filtros: QueryJugadoresDto = {}): Jugador[] {
    const buscado = filtros.nombre
      ? JugadoresService.normalizar(filtros.nombre)
      : undefined;

    return [...this.plantel.values()]
      .filter(
        (jugador) => !filtros.posicion || jugador.posicion === filtros.posicion,
      )
      .filter(
        (jugador) =>
          !buscado ||
          JugadoresService.normalizar(jugador.nombre).includes(buscado),
      )
      .sort((a, b) => a.dorsal - b.dorsal);
  }

  /** Minusculas y sin acentos, para que "diaz" encuentre a "Diaz" y a "Díaz". */
  private static normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  obtener(id: string): Jugador {
    const jugador = this.plantel.get(id);

    if (!jugador) {
      throw new NotFoundException(
        `No existe un jugador con id ${id} en el plantel`,
      );
    }

    return jugador;
  }

  fichar(datos: CreateJugadorDto): Jugador {
    if (this.plantel.size >= JugadoresService.LIMITE_PLANTEL) {
      throw new ConflictException(
        `El plantel ya tiene ${JugadoresService.LIMITE_PLANTEL} jugadores: no admite mas fichajes`,
      );
    }

    this.asegurarDorsalLibre(datos.dorsal);

    const jugador: Jugador = {
      id: randomUUID(),
      nombre: datos.nombre,
      dorsal: datos.dorsal,
      posicion: datos.posicion,
      edad: datos.edad,
      goles: datos.goles ?? 0,
    };

    this.plantel.set(jugador.id, jugador);

    return jugador;
  }

  /** Modificacion parcial: solo toca los campos presentes en el cuerpo. */
  actualizar(id: string, cambios: UpdateJugadorDto): Jugador {
    const actual = this.obtener(id);
    const camposEnviados = JugadoresService.soloCamposDefinidos(cambios);

    if (Object.keys(camposEnviados).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    if (
      camposEnviados.dorsal !== undefined &&
      camposEnviados.dorsal !== actual.dorsal
    ) {
      this.asegurarDorsalLibre(camposEnviados.dorsal, id);
    }

    const actualizado: Jugador = { ...actual, ...camposEnviados };
    this.plantel.set(id, actualizado);

    return actualizado;
  }

  /** Reemplazo completo: sustituye todos los campos y conserva unicamente el id. */
  reemplazar(id: string, datos: ReplaceJugadorDto): Jugador {
    const actual = this.obtener(id);

    if (datos.dorsal !== actual.dorsal) {
      this.asegurarDorsalLibre(datos.dorsal, id);
    }

    const reemplazado: Jugador = {
      id: actual.id,
      nombre: datos.nombre,
      dorsal: datos.dorsal,
      posicion: datos.posicion,
      edad: datos.edad,
      goles: datos.goles,
    };

    this.plantel.set(id, reemplazado);

    return reemplazado;
  }

  eliminar(id: string): void {
    if (!this.plantel.delete(id)) {
      throw new NotFoundException(
        `No existe un jugador con id ${id} en el plantel`,
      );
    }
  }

  /**
   * El dorsal es unico en el plantel.
   *
   * `idExcluido` permite que un jugador conserve su propio dorsal al editarse.
   */
  private asegurarDorsalLibre(dorsal: number, idExcluido?: string): void {
    const ocupante = [...this.plantel.values()].find(
      (jugador) => jugador.dorsal === dorsal && jugador.id !== idExcluido,
    );

    if (ocupante) {
      throw new ConflictException(
        `El dorsal ${dorsal} ya esta asignado a ${ocupante.nombre}`,
      );
    }
  }

  /** class-transformer puede dejar propiedades ausentes en undefined: no deben sobreescribir nada. */
  private static soloCamposDefinidos(
    cambios: UpdateJugadorDto,
  ): Partial<Jugador> {
    return Object.fromEntries(
      Object.entries(cambios).filter(([, valor]) => valor !== undefined),
    );
  }

  /** Datos de demostracion: el plantel no arranca vacio y hay dorsales ocupados. */
  private sembrarPlantel(): void {
    const semilla: Omit<Jugador, 'id'>[] = [
      {
        nombre: 'Alisson Becker',
        dorsal: 1,
        posicion: Posicion.ARQUERO,
        edad: 33,
        goles: 0,
      },
      {
        nombre: 'Virgil van Dijk',
        dorsal: 4,
        posicion: Posicion.DEFENSA,
        edad: 34,
        goles: 29,
      },
      {
        nombre: 'Dominik Szoboszlai',
        dorsal: 8,
        posicion: Posicion.MEDIOCAMPISTA,
        edad: 25,
        goles: 16,
      },
      {
        nombre: 'Alexis Mac Allister',
        dorsal: 10,
        posicion: Posicion.MEDIOCAMPISTA,
        edad: 27,
        goles: 18,
      },
      {
        nombre: 'Mohamed Salah',
        dorsal: 11,
        posicion: Posicion.DELANTERO,
        edad: 33,
        goles: 180,
      },
      {
        nombre: 'Andrew Robertson',
        dorsal: 26,
        posicion: Posicion.DEFENSA,
        edad: 32,
        goles: 10,
      },
    ];

    for (const jugador of semilla) {
      const id = randomUUID();
      this.plantel.set(id, { id, ...jugador });
    }
  }
}
