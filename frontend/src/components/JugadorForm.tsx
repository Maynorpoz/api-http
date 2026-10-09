import { useState } from 'react'
import { POSICIONES, type NuevoJugador, type Posicion } from '../types'

interface Props {
  enviando: boolean
  /** Devuelve true solo si la API confirmo el fichaje con 201. */
  onFichar: (datos: NuevoJugador) => Promise<boolean>
}

const CAMPOS_VACIOS = {
  nombre: '',
  dorsal: '',
  posicion: 'DELANTERO' as Posicion,
  edad: '',
  goles: '',
}

/**
 * Formulario de fichaje.
 *
 * Deliberadamente no replica las reglas de validacion del backend: los campos
 * numericos son de texto libre, de modo que se puede enviar "veinte" y ver el
 * 400 que responde la API. La autoridad sobre que es valido es el servidor.
 */
export function JugadorForm({ enviando, onFichar }: Props) {
  const [campos, setCampos] = useState(CAMPOS_VACIOS)

  const cambiar = (campo: keyof typeof CAMPOS_VACIOS) => (valor: string) =>
    setCampos((previos) => ({ ...previos, [campo]: valor }))

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()

    // Se envia tal cual: si un numero no es numero, el 400 lo da la API.
    const datos = {
      nombre: campos.nombre,
      dorsal: campos.dorsal === '' ? undefined : Number(campos.dorsal),
      posicion: campos.posicion,
      edad: campos.edad === '' ? undefined : Number(campos.edad),
      ...(campos.goles === '' ? {} : { goles: Number(campos.goles) }),
    } as unknown as NuevoJugador

    // El formulario se limpia unicamente si la API confirmo la creacion. Si
    // respondio 400 o 409, los datos quedan en pantalla para poder corregirlos.
    if (await onFichar(datos)) {
      setCampos(CAMPOS_VACIOS)
    }
  }

  return (
    <form className="ficha" onSubmit={enviar}>
      <h2 className="ficha__titulo">Fichar jugador</h2>
      <p className="ficha__nota">
        Los campos no se validan en el navegador: la validacion la hace la API y aqui se muestra su
        respuesta.
      </p>

      <div className="ficha__campos">
        <label className="campo campo--ancho">
          <span className="campo__etiqueta">Nombre</span>
          <input
            className="campo__control"
            value={campos.nombre}
            onChange={(e) => cambiar('nombre')(e.target.value)}
            placeholder="Cody Gakpo"
            disabled={enviando}
          />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Dorsal</span>
          <input
            className="campo__control"
            value={campos.dorsal}
            onChange={(e) => cambiar('dorsal')(e.target.value)}
            placeholder="18"
            inputMode="numeric"
            disabled={enviando}
          />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Posicion</span>
          <select
            className="campo__control"
            value={campos.posicion}
            onChange={(e) => cambiar('posicion')(e.target.value)}
            disabled={enviando}
          >
            {POSICIONES.map((posicion) => (
              <option key={posicion} value={posicion}>
                {posicion}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Edad</span>
          <input
            className="campo__control"
            value={campos.edad}
            onChange={(e) => cambiar('edad')(e.target.value)}
            placeholder="27"
            inputMode="numeric"
            disabled={enviando}
          />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">
            Goles <em className="campo__opcional">opcional</em>
          </span>
          <input
            className="campo__control"
            value={campos.goles}
            onChange={(e) => cambiar('goles')(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            disabled={enviando}
          />
        </label>
      </div>

      <button type="submit" className="boton boton--principal" disabled={enviando}>
        {enviando ? 'Fichando...' : 'Fichar'}
      </button>
    </form>
  )
}
