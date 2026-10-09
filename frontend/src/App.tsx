import { useState } from 'react'
import { Aviso } from './components/Aviso'
import { BuscadorPlantel } from './components/BuscadorPlantel'
import { JugadorForm } from './components/JugadorForm'
import { PlantelTable } from './components/PlantelTable'
import { useJugadores, type Resultado } from './hooks/useJugadores'
import type { CambiosJugador, NuevoJugador } from './types'

export default function App() {
  const {
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
  } = useJugadores()

  const [aviso, setAviso] = useState<Resultado | null>(null)
  const [fichando, setFichando] = useState(false)
  const [idOcupado, setIdOcupado] = useState<string | null>(null)

  const manejarFichaje = async (datos: NuevoJugador): Promise<boolean> => {
    setFichando(true)
    const resultado = await fichar(datos)
    setFichando(false)
    setAviso(resultado)

    return resultado.tipo === 'exito'
  }

  const manejarActualizacion = async (id: string, cambios: CambiosJugador): Promise<boolean> => {
    setIdOcupado(id)
    const resultado = await actualizar(id, cambios)
    setIdOcupado(null)
    setAviso(resultado)

    return resultado.tipo === 'exito'
  }

  const manejarBaja = async (id: string, nombre: string): Promise<void> => {
    setIdOcupado(id)
    const resultado = await eliminar(id, nombre)
    setIdOcupado(null)
    setAviso(resultado)
  }

  const contador =
    estado === 'cargando'
      ? '--'
      : filtroActivo
        ? `${jugadores.length} en pantalla`
        : `${jugadores.length} / 25 jugadores`

  return (
    <div className="pagina">
      <header className="cabecera">
        <div className="cabecera__marca">
          <span className="cabecera__escudo" aria-hidden="true">
            LFC
          </span>
          <div>
            <h1 className="cabecera__titulo">Plantel del Liverpool FC</h1>
            <p className="cabecera__subtitulo">Premier League &middot; datos en memoria</p>
          </div>
        </div>
        <div className="cabecera__datos">
          <span className="chip">{contador}</span>
          <button type="button" className="boton" onClick={recargar} disabled={estado === 'cargando'}>
            Recargar
          </button>
        </div>
      </header>

      {aviso && (
        <div className="pagina__aviso">
          <Aviso resultado={aviso} onCerrar={() => setAviso(null)} />
        </div>
      )}

      <main className="pagina__contenido">
        <section className="panel">
          <JugadorForm enviando={fichando} onFichar={manejarFichaje} />
        </section>

        <section className="panel">
          <h2 className="panel__titulo">Plantel</h2>

          <BuscadorPlantel
            filtros={filtros}
            filtroActivo={filtroActivo}
            buscando={buscando}
            resultados={jugadores.length}
            onCambiar={cambiarFiltros}
            onLimpiar={limpiarFiltros}
          />

          <PlantelTable
            jugadores={jugadores}
            estado={estado}
            errorDeCarga={errorDeCarga}
            filtroActivo={filtroActivo}
            buscando={buscando}
            idOcupado={idOcupado}
            onRecargar={recargar}
            onLimpiarFiltros={limpiarFiltros}
            onActualizar={manejarActualizacion}
            onEliminar={manejarBaja}
          />
        </section>
      </main>

      <footer className="pie">
        El estado de esta pantalla se actualiza unicamente con lo que confirma la API. La busqueda
        tambien la resuelve el servidor: cada filtro viaja como query string, no se filtra en el
        navegador.
      </footer>
    </div>
  )
}
