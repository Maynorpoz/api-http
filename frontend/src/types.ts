/**
 * Espejo del contrato de la API. Si cambia el backend, este archivo es el unico
 * lugar del frontend que hay que ajustar.
 */

export const POSICIONES = ['ARQUERO', 'DEFENSA', 'MEDIOCAMPISTA', 'DELANTERO'] as const

export type Posicion = (typeof POSICIONES)[number]

export interface Jugador {
  id: string
  nombre: string
  dorsal: number
  posicion: Posicion
  edad: number
  goles: number
}

/** Cuerpo de POST /jugadores. `goles` es opcional: el servidor asume 0. */
export interface NuevoJugador {
  nombre: string
  dorsal: number
  posicion: Posicion
  edad: number
  goles?: number
}

/** Cuerpo de PATCH /jugadores/:id. Cualquier subconjunto, pero no vacio. */
export type CambiosJugador = Partial<NuevoJugador>

/**
 * Filtros de busqueda que viajan como query string a GET /jugadores.
 *
 * La cadena vacia significa "sin filtro" y no se envia: el servidor la trataria
 * igual, pero asi la URL refleja lo que realmente se esta pidiendo.
 */
export interface Filtros {
  nombre: string
  posicion: Posicion | ''
}

export const SIN_FILTROS: Filtros = { nombre: '', posicion: '' }

export const hayFiltro = (filtros: Filtros): boolean =>
  filtros.nombre.trim() !== '' || filtros.posicion !== ''

/** Forma unica de error que devuelve la API. */
export interface ApiErrorBody {
  statusCode: number
  error: string
  message: string[]
  path: string
  timestamp: string
}
