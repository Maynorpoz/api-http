import { POSICIONES, type Filtros, type Posicion } from '../types'

interface Props {
  filtros: Filtros
  filtroActivo: boolean
  buscando: boolean
  resultados: number
  onCambiar: (filtros: Filtros) => void
  onLimpiar: () => void
}

/**
 * Buscador del plantel.
 *
 * La busqueda la resuelve la API: cada cambio dispara GET /jugadores con los
 * filtros en la query string. No se filtra el arreglo en el navegador, para que
 * la pantalla siga mostrando exactamente lo que el servidor devolvio.
 */
export function BuscadorPlantel({
  filtros,
  filtroActivo,
  buscando,
  resultados,
  onCambiar,
  onLimpiar,
}: Props) {
  return (
    <div className="buscador">
      <div className="buscador__campos">
        <label className="campo campo--ancho">
          <span className="campo__etiqueta">Buscar por nombre</span>
          <input
            className="campo__control"
            type="search"
            value={filtros.nombre}
            onChange={(e) => onCambiar({ ...filtros, nombre: e.target.value })}
            placeholder="salah"
            aria-label="Buscar por nombre"
          />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Posicion</span>
          <select
            className="campo__control"
            value={filtros.posicion}
            onChange={(e) =>
              onCambiar({ ...filtros, posicion: e.target.value as Posicion | '' })
            }
            aria-label="Filtrar por posicion"
          >
            <option value="">Todas</option>
            {POSICIONES.map((posicion) => (
              <option key={posicion} value={posicion}>
                {posicion}
              </option>
            ))}
          </select>
        </label>

        {filtroActivo && (
          <button type="button" className="boton buscador__limpiar" onClick={onLimpiar}>
            Limpiar
          </button>
        )}
      </div>

      <p className="buscador__estado" role="status">
        {buscando
          ? 'Consultando la API...'
          : filtroActivo
            ? `${resultados} ${resultados === 1 ? 'resultado' : 'resultados'} para el filtro`
            : 'Mostrando el plantel completo'}
      </p>
    </div>
  )
}
