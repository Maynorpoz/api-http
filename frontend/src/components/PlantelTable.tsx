import type { CambiosJugador, Jugador } from '../types'
import type { EstadoCarga, Resultado } from '../hooks/useJugadores'
import { Aviso } from './Aviso'
import { JugadorRow } from './JugadorRow'

interface Props {
  jugadores: Jugador[]
  estado: EstadoCarga
  errorDeCarga: Resultado | null
  filtroActivo: boolean
  buscando: boolean
  idOcupado: string | null
  onRecargar: () => void
  onLimpiarFiltros: () => void
  onActualizar: (id: string, cambios: CambiosJugador) => Promise<boolean>
  onEliminar: (id: string, nombre: string) => Promise<void>
}

/** Esqueleto de carga: ocupa el mismo espacio que la tabla para evitar saltos. */
function Esqueleto() {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="Cargando el plantel">
      {Array.from({ length: 6 }).map((_, indice) => (
        <div key={indice} className="esqueleto__fila" />
      ))}
    </div>
  )
}

export function PlantelTable({
  jugadores,
  estado,
  errorDeCarga,
  filtroActivo,
  buscando,
  idOcupado,
  onRecargar,
  onLimpiarFiltros,
  onActualizar,
  onEliminar,
}: Props) {
  if (estado === 'cargando') {
    return <Esqueleto />
  }

  if (estado === 'error' && errorDeCarga) {
    return (
      <div className="vacio">
        <Aviso resultado={errorDeCarga} />
        <button type="button" className="boton boton--principal" onClick={onRecargar}>
          Reintentar
        </button>
      </div>
    )
  }

  // La coleccion existe aunque este vacia: la API devuelve 200 con [] y no 404.
  // El motivo del vacio cambia el mensaje: no es lo mismo un plantel sin
  // jugadores que una busqueda sin coincidencias.
  if (jugadores.length === 0) {
    return filtroActivo ? (
      <div className="vacio">
        <p className="vacio__titulo">Ningun jugador coincide con la busqueda</p>
        <p className="vacio__texto">
          La API respondio 200 con una coleccion vacia. El recurso existe, simplemente nada
          coincide con el filtro.
        </p>
        <button type="button" className="boton" onClick={onLimpiarFiltros}>
          Limpiar filtros
        </button>
      </div>
    ) : (
      <div className="vacio">
        <p className="vacio__titulo">El plantel esta vacio</p>
        <p className="vacio__texto">
          La API respondio 200 con una coleccion vacia. Ficha al primer jugador con el formulario.
        </p>
      </div>
    )
  }

  return (
    <div className={`tabla__contenedor${buscando ? ' tabla__contenedor--buscando' : ''}`}>
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col">Dorsal</th>
            <th scope="col">Nombre</th>
            <th scope="col">Posicion</th>
            <th scope="col">Edad</th>
            <th scope="col">Goles</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map((jugador) => (
            <JugadorRow
              key={jugador.id}
              jugador={jugador}
              ocupado={idOcupado === jugador.id}
              onActualizar={onActualizar}
              onEliminar={onEliminar}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
