type SalidaGpio = {
  pin: number;
  configurado: boolean;
  estado: boolean;
};

type Props = {
  salidas: SalidaGpio[];
  onCambiarSalida: (indice: number, nuevo: Partial<SalidaGpio>) => void;
  onConfigurarSalida: (indice: number) => void;
  onAlternarSalida: (indice: number) => void;
};

function ControlSalidasGpio({ salidas, onCambiarSalida, onConfigurarSalida, onAlternarSalida }: Props) {
  return (
    <section className="panel panel-gpio">
      <h3>Salidas digitales</h3>
      <p className="panel-descripcion">
        Configura hasta 4 pines como salidas y enciende o apaga cada uno con su botón.
      </p>

      {salidas.map((salida, indice) => (
        <div className="gpio-fila" key={indice}>
          <div className="gpio-fila-cabecera">
            <span className="gpio-etiqueta">Salida {indice + 1}</span>
            <span className={`gpio-estado ${salida.configurado ? "activo" : ""}`}>
              {salida.configurado ? (salida.estado ? "ON" : "OFF") : "Sin configurar"}
            </span>
          </div>

          <div className="gpio-fila-controles">
            <div className="campo gpio-campo-pin">
              <label htmlFor={`salida-pin-${indice}`}>Pin GPIO</label>
              <input
                id={`salida-pin-${indice}`}
                type="number"
                min={0}
                max={48}
                value={salida.pin}
                onChange={(e) => onCambiarSalida(indice, { pin: Number(e.target.value) })}
              />
            </div>

            <button
              className="btn btn-configurar gpio-btn-configurar"
              onClick={() => onConfigurarSalida(indice)}
            >
              Aplicar
            </button>

            <button
              className={`btn ${salida.estado ? "btn-off" : "btn-on"} gpio-btn-toggle`}
              onClick={() => onAlternarSalida(indice)}
              disabled={!salida.configurado}
            >
              {salida.estado ? "Apagar" : "Encender"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

export default ControlSalidasGpio;