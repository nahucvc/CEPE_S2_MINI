type TipoOnda = "senoidal" | "cuadrada" | "triangular" | "sierra";

type EstadoModulacion = {
  frecuenciaSenal: number;
  frecuenciaPortadora: number;
  tipoOnda: TipoOnda;
  activa: boolean;
};

type Props = {
  modulacion: EstadoModulacion;
  ts: number;
  onCambiarModulacion: (nuevo: Partial<EstadoModulacion>) => void;
  onIniciar: () => void;
  onDetener: () => void;
};

function ModulacionPwm({ modulacion, ts, onCambiarModulacion, onIniciar, onDetener }: Props) {
  return (
    <section className="panel panel-modulacion">
      <h3>Modulación de señal</h3>

      <div className="campo">
        <label htmlFor="frecuenciaSenal">
          Frecuencia de la señal a generar (Hz)
        </label>
        <input
          id="frecuenciaSenal"
          type="number"
          min={1}
          max={10000}
          value={modulacion.frecuenciaSenal}
          onChange={(e) =>
            onCambiarModulacion({ frecuenciaSenal: Number(e.target.value) })
          }
        />
        <small>
          El PWM cambiará a {modulacion.frecuenciaSenal * 100} Hz
          (ts = {ts} µs)
        </small>
      </div>

      <div className="campo">
        <label htmlFor="frecuenciaPortadora">Frecuencia portadora PWM (Hz)</label>
        <input
          id="frecuenciaPortadora"
          type="number"
          min={1000}
          value={modulacion.frecuenciaPortadora}
          onChange={(e) =>
            onCambiarModulacion({ frecuenciaPortadora: Number(e.target.value) })
          }
        />
      </div>

      <div className="campo">
        <label htmlFor="tipoOnda">Tipo de onda</label>
        <select
          id="tipoOnda"
          value={modulacion.tipoOnda}
          onChange={(e) =>
            onCambiarModulacion({ tipoOnda: e.target.value as TipoOnda })
          }
        >
          <option value="senoidal">Senoidal</option>
          <option value="cuadrada">Cuadrada</option>
          <option value="triangular">Triangular</option>
          <option value="sierra">Sierra</option>
        </select>
      </div>

      <div className="acciones">
        <button
          className={`btn ${modulacion.activa ? "btn-off" : "btn-configurar"}`}
          onClick={modulacion.activa ? onDetener : onIniciar}
        >
          {modulacion.activa ? "Detener modulación" : "Iniciar modulación"}
        </button>
      </div>
    </section>
  );
}

export default ModulacionPwm;