type EstadoPwm = {
  encendido: boolean;
  pin: number;
  frecuencia: number;
  resolucion: number;
  duty: number;
  maximo: number;
};

type Props = {
  estado: EstadoPwm;
  modulacionActiva: boolean;
  onCambiarEstado: (nuevo: Partial<EstadoPwm>) => void;
  onAplicarConfiguracion: () => void;
  onCambiarDuty: (duty: number) => void;
  onAlternar: () => void;
};

function ControlPwm({
  estado,
  modulacionActiva,
  onCambiarEstado,
  onAplicarConfiguracion,
  onCambiarDuty,
  onAlternar,
}: Props) {
  return (
    <section className="panel panel-pwm">
      <h3>Control PWM</h3>

      <div className="campo">
        <label htmlFor="pin">Pin de salida</label>
        <input
          id="pin"
          type="number"
          min={0}
          max={48}
          value={estado.pin}
          onChange={(e) => onCambiarEstado({ pin: Number(e.target.value) })}
        />
      </div>

      <div className="campo">
        <label htmlFor="frecuencia">Frecuencia (Hz)</label>
        <input
          id="frecuencia"
          type="number"
          min={1}
          value={estado.frecuencia}
          onChange={(e) => onCambiarEstado({ frecuencia: Number(e.target.value) })}
        />
      </div>

      <div className="campo">
        <label htmlFor="resolucion">Resolución (bits)</label>
        <input
          id="resolucion"
          type="number"
          min={1}
          max={16}
          value={estado.resolucion}
          onChange={(e) => onCambiarEstado({ resolucion: Number(e.target.value) })}
        />
      </div>

      <div className="acciones">
        <button className="btn btn-configurar" onClick={onAplicarConfiguracion}>
          Aplicar configuración
        </button>
      </div>

      <div className="campo">
        <label htmlFor="duty">
          Duty: {estado.duty} / {estado.maximo}
        </label>
        <input
          id="duty"
          type="range"
          min={0}
          max={estado.maximo}
          value={estado.duty}
          onChange={(e) => onCambiarDuty(Number(e.target.value))}
        />
      </div>

      <div className="acciones">
        <button
          className={`btn ${estado.encendido ? "btn-off" : "btn-on"}`}
          onClick={onAlternar}
          disabled={modulacionActiva}
        >
          {estado.encendido ? "Apagar" : "Encender"}
        </button>
      </div>
    </section>
  );
}

export default ControlPwm;