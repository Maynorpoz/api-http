import { useCallback, useEffect, useState } from 'react'
import {
  actualizarJugador,
  eliminarJugador,
  ficharJugador,
  listarJugadores,
} from '../api/jugadores.api'
import { ApiError, RedError } from '../api/client'
import {
  hayFiltro,
  SIN_FILTROS,
  type CambiosJugador,
  type Filtros,
  type Jugador,
  type NuevoJugador,
} from '../types'

export type EstadoCarga = 'cargando' | 'listo' | 'error'

/** Milisegundos de espera tras la ultima tecla antes de consultar a la API. */
const ESPERA_BUSQUEDA = 250

/** Resultado de una operacion de escritura, para que la vista muestre el aviso. */
export type Resultado =
  | { tipo: 'exito'; texto: string }
  | { tipo: 'error'; titulo: string; motivos: string[]; status: number | null }

interface UseJugadores {
  jugadores: Jugador[]
  estado: EstadoCarga
  errorDeCarga: Resultado | null
  filtros: Filtros
  filtroActivo: boolean
  buscando: boolean
  cambiarFiltros: (filtros: Filtros) => void
  limpiarFiltros: () => void
  recargar: () => Promise<void>
  fichar: (datos: NuevoJugador) => Promise<Resultado>
  actualizar: (id: string, cambios: CambiosJugador) => Promise<Resultado>
  eliminar: (id: string, nombre: string) => Promise<Resultado>
}

/** Traduce cualquier excepcion de la capa de datos a un resultado mostrable. */
function comoResultado(error: unknown): Resultado {
  if (error instanceof ApiError) {
    return { tipo: 'error', titulo: error.titulo, motivos: error.motivos, status: error.status }
  }

  if (error instanceof RedError) {
    return {
      tipo: 'error',
      titulo: 'No se pudo contactar la API',
      motivos: ['Verifica que el backend este escuchando y que el origen este autorizado por CORS.'],
      status: null,
    }
  }

  return {
    tipo: 'error',
    titulo: 'Error inesperado',
    motivos: [error instanceof Error ? error.message : String(error)],
    status: null,
  }
}

/**
 * Unica fuente de verdad del plantel en la interfaz.
 *
 * Regla central: el estado local nunca se adivina. Se actualiza con el objeto
 * que devuelve la API (201 / 200), y en la baja la fila se quita solo despues de
 * que el servidor confirme con 204. Sin actualizaciones optimistas.
 *
 * La busqueda tambien es del servidor: se pide GET /jugadores con los filtros
 * como query string, en lugar de filtrar el arreglo en el navegador.
 */
export function useJugadores(): UseJugadores {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [estado, setEstado] = useState<EstadoCarga>('cargando')
  const [errorDeCarga, setErrorDeCarga] = useState<Resultado | null>(null)
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS)
  const [buscando, setBuscando] = useState(false)

  const filtroActivo = hayFiltro(filtros)

  /** Pide la coleccion con los filtros dados y resuelve el estado con la respuesta. */
  const cargar = useCallback(async (criterios: Filtros) => {
    setBuscando(true)

    try {
      setJugadores(await listarJugadores(criterios))
      setErrorDeCarga(null)
      setEstado('listo')
    } catch (error) {
      setErrorDeCarga(comoResultado(error))
      setEstado('error')
    } finally {
      setBuscando(false)
    }
  }, [])

  // Carga inicial y cada cambio de filtro. El temporizador evita una peticion
  // por cada tecla: solo se consulta tras una pausa al escribir.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      void cargar(filtros)
    }, ESPERA_BUSQUEDA)

    return () => clearTimeout(temporizador)
  }, [filtros, cargar])

  /** Recarga manual: aqui si corresponde volver a mostrar el esqueleto. */
  const recargar = useCallback(async () => {
    setEstado('cargando')
    setErrorDeCarga(null)
    await cargar(filtros)
  }, [cargar, filtros])

  const cambiarFiltros = useCallback((nuevos: Filtros) => setFiltros(nuevos), [])
  const limpiarFiltros = useCallback(() => setFiltros(SIN_FILTROS), [])

  /** Mantiene el orden por dorsal que ya aplica la API. */
  const porDorsal = (lista: Jugador[]): Jugador[] =>
    [...lista].sort((a, b) => a.dorsal - b.dorsal)

  const fichar = useCallback(
    async (datos: NuevoJugador): Promise<Resultado> => {
      try {
        const creado = await ficharJugador(datos)

        if (hayFiltro(filtros)) {
          // Con un filtro activo, que el nuevo jugador deba aparecer o no lo
          // decide el servidor: se vuelve a consultar en lugar de suponerlo.
          await cargar(filtros)
        } else {
          setJugadores((previos) => porDorsal([...previos, creado]))
        }

        return {
          tipo: 'exito',
          texto: `${creado.nombre} fichado con el dorsal ${creado.dorsal} (201)`,
        }
      } catch (error) {
        return comoResultado(error)
      }
    },
    [cargar, filtros],
  )

  const actualizar = useCallback(
    async (id: string, cambios: CambiosJugador): Promise<Resultado> => {
      try {
        const actualizado = await actualizarJugador(id, cambios)

        if (hayFiltro(filtros)) {
          // Un cambio puede sacar al jugador del filtro vigente: decide el servidor.
          await cargar(filtros)
        } else {
          setJugadores((previos) =>
            porDorsal(previos.map((jugador) => (jugador.id === id ? actualizado : jugador))),
          )
        }

        return { tipo: 'exito', texto: `${actualizado.nombre} actualizado (200)` }
      } catch (error) {
        return comoResultado(error)
      }
    },
    [cargar, filtros],
  )

  const eliminar = useCallback(async (id: string, nombre: string): Promise<Resultado> => {
    try {
      await eliminarJugador(id)
      // Recien ahora, con el 204 confirmado, se quita la fila. Una baja no
      // depende del filtro: el jugador ya no existe en ninguna vista.
      setJugadores((previos) => previos.filter((jugador) => jugador.id !== id))

      return { tipo: 'exito', texto: `${nombre} dado de baja (204)` }
    } catch (error) {
      return comoResultado(error)
    }
  }, [])

  return {
    jugadores,
    estado,
    errorDeCarga,
    filtros,
    filtroActivo,
    buscando,
    cambiarFiltros,
    limpiarFiltros,
    recargar,
    fichar,
    actualizar,
    eliminar,
  }
}
