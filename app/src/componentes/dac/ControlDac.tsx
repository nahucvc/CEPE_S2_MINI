type EstadoDac = {
  pin: number;
  valor: number;
  maximo: number;
  encendido: boolean;
};

type Props = {
  estado: EstadoDac;
  onCambiarEstado: (nuevo: Partial<EstadoDac>) => void;
  onAplicarConfiguracion: () => void;
  onAlternar: () => void;
};

function ControlDac({ estado, onCambiarEstado, onAplicarConfiguracion, onAlternar }: Props) {
  return (
    <section className="panel panel-dac">
      <h3>Control DAC</h3>

      <div className="campo">
        <label htmlFor="pin">Pin de salida DAC</label>
        <input
          id="pin"
          type="number"
          min={0}
          max={48}
          value={estado.pin}
          onChange={(e) => onCambiarEstado({ pin: Number(e.target.value) })}
        />
        <small>ESP32-S2: DAC1 = GPIO17, DAC2 = GPIO18</small>
      </div>

      <div className="campo">
        <label htmlFor="valor">
          Valor DAC: {estado.valor} / {estado.maximo}
        </label>
        <input
          id="valor"
          type="range"
          min={0}
          max={estado.maximo}
          value={estado.valor}
          onChange={(e) => onCambiarEstado({ valor: Number(e.target.value) })}
        />
      </div>

      <div className="campo">
        <label htmlFor="valorNum">Valor (0-{estado.maximo})</label>
        <input
          id="valorNum"
          type="number"
          min={0}
          max={estado.maximo}
          value={estado.valor}
          onChange={(e) => onCambiarEstado({ valor: Number(e.target.value) })}
        />
      </div>

      <div className="acciones">
        <button className="btn btn-configurar" onClick={onAplicarConfiguracion}>
          Aplicar configuración
        </button>

        <button
          className={`btn ${estado.encendido ? "btn-off" : "btn-on"}`}
          onClick={onAlternar}
        >
          {estado.encendido ? "Apagar" : "Encender"}
        </button>
      </div>
    </section>
  );
}

export default ControlDac;