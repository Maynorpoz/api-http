import type { ApiErrorBody } from '../types'

/** El puerto por defecto se puede sobreescribir con VITE_API_URL. */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * Error de la API con el codigo HTTP y los motivos ya normalizados.
 *
 * Como la API garantiza que `message` siempre es un arreglo, la interfaz
 * renderiza los errores de una sola forma, venga uno o vengan varios.
 */
export class ApiError extends Error {
  readonly status: number
  readonly motivos: string[]

  constructor(status: number, motivos: string[]) {
    super(motivos.join(' · '))
    this.name = 'ApiError'
    this.status = status
    this.motivos = motivos
  }

  /** Texto orientado a la persona que usa la interfaz, segun el codigo recibido. */
  get titulo(): string {
    switch (this.status) {
      case 400:
        return 'Los datos enviados no son validos'
      case 404:
        return 'Ese jugador ya no esta en el plantel'
      case 409:
        return 'Conflicto con el estado actual del plantel'
      default:
        return `Error ${this.status}`
    }
  }
}

/** Se lanza cuando el servidor no responde (apagado, puerto distinto, CORS). */
export class RedError extends Error {
  constructor() {
    super('No se pudo contactar la API')
    this.name = 'RedError'
  }
}

/**
 * Envoltorio unico de fetch.
 *
 * Resuelve tres cosas en un solo lugar: el 204 sin cuerpo, el parseo del error
 * del contrato y la caida de red.
 */
export async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta: Response

  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, {
      ...opciones,
      headers:
        opciones.body === undefined
          ? opciones.headers
          : { 'Content-Type': 'application/json', ...opciones.headers },
    })
  } catch {
    throw new RedError()
  }

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, await motivosDelError(respuesta))
  }

  // 204 No Content: no hay cuerpo que parsear.
  if (respuesta.status === 204) {
    return undefined as T
  }

  return (await respuesta.json()) as T
}

/** Lee la forma de error de la API y degrada con elegancia si no la encuentra. */
async function motivosDelError(respuesta: Response): Promise<string[]> {
  try {
    const cuerpo = (await respuesta.json()) as Partial<ApiErrorBody>

    if (Array.isArray(cuerpo.message) && cuerpo.message.length > 0) {
      return cuerpo.message
    }

    if (typeof cuerpo.message === 'string') {
      return [cuerpo.message]
    }
  } catch {
    // Respuesta sin JSON: se usa el texto generico de abajo.
  }

  return [`El servidor respondio ${respuesta.status}`]
}
