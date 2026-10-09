import type { CambiosJugador, Filtros, Jugador, NuevoJugador } from '../types'
import { pedir } from './client'

/** Una funcion por endpoint del contrato. */

/** GET /jugadores con los filtros opcionales como query string. */
export function listarJugadores(filtros?: Filtros): Promise<Jugador[]> {
  const parametros = new URLSearchParams()

  if (filtros?.nombre.trim()) parametros.set('nombre', filtros.nombre.trim())
  if (filtros?.posicion) parametros.set('posicion', filtros.posicion)

  const query = parametros.toString()

  return pedir<Jugador[]>(`/jugadores${query ? `?${query}` : ''}`)
}

export function obtenerJugador(id: string): Promise<Jugador> {
  return pedir<Jugador>(`/jugadores/${id}`)
}

/** POST -> 201 con el jugador creado en el cuerpo. */
export function ficharJugador(datos: NuevoJugador): Promise<Jugador> {
  return pedir<Jugador>('/jugadores', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

/** PATCH -> 200 con el jugador actualizado. */
export function actualizarJugador(id: string, cambios: CambiosJugador): Promise<Jugador> {
  return pedir<Jugador>(`/jugadores/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  })
}

/** PUT -> reemplazo completo: exige los cinco campos. */
export function reemplazarJugador(id: string, datos: Required<NuevoJugador>): Promise<Jugador> {
  return pedir<Jugador>(`/jugadores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

/** DELETE -> 204 sin cuerpo. */
export function eliminarJugador(id: string): Promise<void> {
  return pedir<void>(`/jugadores/${id}`, { method: 'DELETE' })
}
