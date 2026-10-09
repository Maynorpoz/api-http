import type { Resultado } from '../hooks/useJugadores'

interface Props {
  resultado: Resultado
  onCerrar?: () => void
}

/**
 * Muestra el resultado confirmado por el servidor.
 *
 * En el caso de error expone el codigo HTTP y los motivos tal como llegaron en
 * el campo `message` del contrato, sin reinterpretarlos.
 */
export function Aviso({ resultado, onCerrar }: Props) {
  if (resultado.tipo === 'exito') {
    return (
      <div className="aviso aviso--exito" role="status">
        <span className="aviso__icono" aria-hidden="true">
          OK
        </span>
        <p className="aviso__texto">{resultado.texto}</p>
        {onCerrar && (
          <button type="button" className="aviso__cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
            &times;
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="aviso aviso--error" role="alert">
      <span className="aviso__icono" aria-hidden="true">
        {resultado.status ?? '!'}
      </span>
      <div className="aviso__cuerpo">
        <p className="aviso__texto">{resultado.titulo}</p>
        <ul className="aviso__motivos">
          {resultado.motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      </div>
      {onCerrar && (
        <button type="button" className="aviso__cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
          &times;
        </button>
      )}
    </div>
  )
}
