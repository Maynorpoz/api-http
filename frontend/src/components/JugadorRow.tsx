import { useState } from 'react'
import { POSICIONES, type CambiosJugador, type Jugador, type Posicion } from '../types'

interface Props {
  jugador: Jugador
  ocupado: boolean
  onActualizar: (id: string, cambios: CambiosJugador) => Promise<boolean>
  onEliminar: (id: string, nombre: string) => Promise<void>
}

type Modo = 'lectura' | 'edicion' | 'confirmar-baja'

/** Campos editables como texto, para poder enviar valores invalidos a proposito. */
const comoBorrador = (jugador: Jugador) => ({
  nombre: jugador.nombre,
  dorsal: String(jugador.dorsal),
  posicion: jugador.posicion,
  edad: String(jugador.edad),
  goles: String(jugador.goles),
})

export function JugadorRow({ jugador, ocupado, onActualizar, onEliminar }: Props) {
  const [modo, setModo] = useState<Modo>('lectura')
  const [borrador, setBorrador] = useState(comoBorrador(jugador))

  const abrirEdicion = () => {
    setBorrador(comoBorrador(jugador))
    setModo('edicion')
  }

  const cambiar = (campo: keyof ReturnType<typeof comoBorrador>, valor: string) =>
    setBorrador((previos) => ({ ...previos, [campo]: valor }))

  /**
   * Arma el cuerpo del PATCH con los campos que realmente cambiaron.
   *
   * Es la semantica del metodo: una modificacion parcial envia solo lo que se
   * modifica, no el recurso entero.
   */
  const soloLoModificado = (): CambiosJugador => {
    const cambios: Record<string, unknown> = {}

    if (borrador.nombre !== jugador.nombre) cambios.nombre = borrador.nombre
    if (borrador.posicion !== jugador.posicion) cambios.posicion = borrador.posicion
    if (borrador.dorsal !== String(jugador.dorsal)) cambios.dorsal = Number(borrador.dorsal)
    if (borrador.edad !== String(jugador.edad)) cambios.edad = Number(borrador.edad)
    if (borrador.goles !== String(jugador.goles)) cambios.goles = Number(borrador.goles)

    return cambios as CambiosJugador
  }

  const guardar = async () => {
    // Si no se toco nada, se envia igual: la API responde 400 por cuerpo vacio y
    // ese tambien es un caso del contrato que vale mostrar.
    if (await onActualizar(jugador.id, soloLoModificado())) {
      setModo('lectura')
    }
  }

  if (modo === 'edicion') {
    return (
      <tr className="fila fila--editando">
        <td>
          <input
            className="campo__control campo__control--mini"
            value={borrador.dorsal}
            onChange={(e) => cambiar('dorsal', e.target.value)}
            inputMode="numeric"
            aria-label="Dorsal"
            disabled={ocupado}
          />
        </td>
        <td>
          <input
            className="campo__control"
            value={borrador.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            aria-label="Nombre"
            disabled={ocupado}
          />
        </td>
        <td>
          <select
            className="campo__control"
            value={borrador.posicion}
            onChange={(e) => cambiar('posicion', e.target.value as Posicion)}
            aria-label="Posicion"
            disabled={ocupado}
          >
            {POSICIONES.map((posicion) => (
              <option key={posicion} value={posicion}>
                {posicion}
              </option>
            ))}
          </select>
        </td>
        <td>
          <input
            className="campo__control campo__control--mini"
            value={borrador.edad}
            onChange={(e) => cambiar('edad', e.target.value)}
            inputMode="numeric"
            aria-label="Edad"
            disabled={ocupado}
          />
        </td>
        <td>
          <input
            className="campo__control campo__control--mini"
            value={borrador.goles}
            onChange={(e) => cambiar('goles', e.target.value)}
            inputMode="numeric"
            aria-label="Goles"
            disabled={ocupado}
          />
        </td>
        <td className="fila__acciones">
          <div className="acciones">
            <button
              type="button"
              className="boton boton--principal"
              onClick={guardar}
              disabled={ocupado}
            >
              {ocupado ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              className="boton"
              onClick={() => setModo('lectura')}
              disabled={ocupado}
            >
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    )
  }

  if (modo === 'confirmar-baja') {
    return (
      <tr className="fila fila--confirmando">
        <td colSpan={5}>
          <strong>{jugador.nombre}</strong> quedara fuera del plantel. Esta accion no se puede
          deshacer.
        </td>
        <td className="fila__acciones">
          <div className="acciones">
            <button
              type="button"
              className="boton boton--peligro"
              onClick={() => onEliminar(jugador.id, jugador.nombre)}
              disabled={ocupado}
            >
              {ocupado ? 'Dando de baja...' : 'Confirmar baja'}
            </button>
            <button
              type="button"
              className="boton"
              onClick={() => setModo('lectura')}
              disabled={ocupado}
            >
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="fila">
      <td>
        <span className="dorsal">{jugador.dorsal}</span>
      </td>
      <td className="fila__nombre">{jugador.nombre}</td>
      <td>
        <span className={`posicion posicion--${jugador.posicion.toLowerCase()}`}>
          {jugador.posicion}
        </span>
      </td>
      <td className="fila__numero">{jugador.edad}</td>
      <td className="fila__numero">{jugador.goles}</td>
      <td className="fila__acciones">
        <div className="acciones">
          <button type="button" className="boton" onClick={abrirEdicion} disabled={ocupado}>
            Editar
          </button>
          <button
            type="button"
            className="boton boton--peligro-suave"
            onClick={() => setModo('confirmar-baja')}
            disabled={ocupado}
          >
            Baja
          </button>
        </div>
      </td>
    </tr>
  )
}
