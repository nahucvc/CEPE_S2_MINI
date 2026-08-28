type EntradaGpio = {
  pin: number;
  modo: number; // 0=flotante, 1=pull-up, 2=pull-down
  configurado: boolean;
  valor: boolean;
};

type Props = {
  entradas: EntradaGpio[];
  onCambiarEntrada: (indice: number, nuevo: Partial<EntradaGpio>) => void;
  onConfigurarEntrada: (indice: number) => void;
};

const MODOS = [
  { valor: 0, etiqueta: "Flotante" },
  { valor: 1, etiqueta: "Pull-up" },
  { valor: 2, etiqueta: "Pull-down" },
];

function ControlEntradasGpio({ entradas, onCambiarEntrada, onConfigurarEntrada }: Props) {
  return (
    <section className="panel panel-gpio">
      <h3>Entradas digitales</h3>
      <p className="panel-descripcion">
        Configura hasta 4 pines como entradas y elige su modo (pull-up, pull-down o flotante).
      </p>

      {entradas.map((entrada, indice) => (
        <div className="gpio-fila" key={indice}>
          <div className="gpio-fila-cabecera">
            <span className="gpio-etiqueta">Entrada {indice + 1}</span>
            <span className="gpio-indicador-grupo">
              <span
                className={`gpio-led ${entrada.configurado ? (entrada.valor ? "led-on" : "led-off") : "led-sin-configurar"}`}
                title={entrada.configurado ? (entrada.valor ? "HIGH" : "LOW") : "Sin configurar"}
              />
              <span className={`gpio-estado ${entrada.configurado ? "activo" : ""}`}>
                {entrada.configurado ? (entrada.valor ? "HIGH" : "LOW") : "Sin configurar"}
              </span>
            </span>
          </div>

          <div className="gpio-fila-controles">
            <div className="campo gpio-campo-pin">
              <label htmlFor={`entrada-pin-${indice}`}>Pin GPIO</label>
              <input
                id={`entrada-pin-${indice}`}
                type="number"
                min={0}
                max={48}
                value={entrada.pin}
                onChange={(e) => onCambiarEntrada(indice, { pin: Number(e.target.value) })}
              />
            </div>

            <div className="campo gpio-campo-modo">
              <label htmlFor={`entrada-modo-${indice}`}>Modo</label>
              <select
                id={`entrada-modo-${indice}`}
                value={entrada.modo}
                onChange={(e) => onCambiarEntrada(indice, { modo: Number(e.target.value) })}
              >
                {MODOS.map((modo) => (
                  <option key={modo.valor} value={modo.valor}>
                    {modo.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-configurar gpio-btn-configurar"
              onClick={() => onConfigurarEntrada(indice)}
            >
              Aplicar
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

export default ControlEntradasGpio;