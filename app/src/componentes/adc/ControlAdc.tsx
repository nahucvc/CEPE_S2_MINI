type EstadoAdc = {
  pin: number;
  resolucion: number;
  frecuenciaEnvio: number;
  encendido: boolean;
  maximo: number;
};

type Props = {
  estado: EstadoAdc;
  onCambiarEstado: (nuevo: Partial<EstadoAdc>) => void;
  onAplicarConfiguracion: () => void;
  onAlternar: () => void;
};

// Pines ADC1 disponibles en ESP32-S2 (GPIO1-10 = ADC1_CH0-9)
const PINES_ADC1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function ControlAdc({ estado, onCambiarEstado, onAplicarConfiguracion, onAlternar }: Props) {
  const esAdc1 = PINES_ADC1.includes(estado.pin);
  const canal = esAdc1 ? estado.pin - 1 : estado.pin - 11;

  return (
    <section className="panel panel-adc">
      <h3>Control ADC</h3>

      <div className="campo">
        <label htmlFor="pin">Pin GPIO (ADC)</label>
        <input
          id="pin"
          type="number"
          min={1}
          max={20}
          value={estado.pin}
          onChange={(e) => onCambiarEstado({ pin: Number(e.target.value) })}
        />
        <small>
          {esAdc1 ? "ADC1" : "ADC2"}_CH{canal}
        </small>
      </div>

      <div className="campo">
        <label htmlFor="resolucion">Resolución (bits)</label>
        <select
          id="resolucion"
          value={estado.resolucion}
          onChange={(e) => onCambiarEstado({ resolucion: Number(e.target.value) })}
        >
          <option value={9}>9 bits (0-511)</option>
          <option value={10}>10 bits (0-1023)</option>
          <option value={11}>11 bits (0-2047)</option>
          <option value={12}>12 bits (0-4095)</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="frecuenciaEnvio">Frecuencia de envío (Hz)</label>
        <input
          id="frecuenciaEnvio"
          type="number"
          min={1}
          max={10000}
          value={estado.frecuenciaEnvio}
          onChange={(e) => onCambiarEstado({ frecuenciaEnvio: Number(e.target.value) })}
        />
        <small>Máx ~10000 Hz (limitado por WebSocket)</small>
      </div>

      <div className="acciones">
        <button className="btn btn-configurar" onClick={onAplicarConfiguracion}>
          Aplicar configuración
        </button>

        <button
          className={`btn ${estado.encendido ? "btn-off" : "btn-on"}`}
          onClick={onAlternar}
        >
          {estado.encendido ? "Detener" : "Iniciar"}
        </button>
      </div>
    </section>
  );
}

export default ControlAdc;