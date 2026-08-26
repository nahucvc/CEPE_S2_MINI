import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

type EstadoAdc = {
  pin: number;
  resolucion: number;
  frecuenciaEnvio: number;  // Hz - cada cuánto se envía la muestra
  encendido: boolean;
  maximo: number;
};

type DatoAdc = {
  timestamp: number;
  valor: number;
  voltaje: number;
};

function ADC() {
  const [estado, setEstado] = useState<EstadoAdc>({
    pin: 4,           // GPIO4 = ADC1_CH0
    resolucion: 12,   // 9-12 bits
    frecuenciaEnvio: 100,  // Hz
    encendido: false,
    maximo: 4095,
  });
  const [conectado, setConectado] = useState(false);
  const [ultimoValor, setUltimoValor] = useState<number | null>(null);
  const [ultimoVoltaje, setUltimoVoltaje] = useState<number | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const uplotRef = useRef<uPlot | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<DatoAdc[]>([]);
  const maximoPuntos = 500;  // Puntos visibles en el gráfico

  // Actualizar máximos según resolución
  useEffect(() => {
    const maximos: Record<number, number> = { 9: 511, 10: 1023, 11: 2047, 12: 4095 };
    setEstado(prev => ({ ...prev, maximo: maximos[estado.resolucion] || 4095 }));
  }, [estado.resolucion]);

  // Inicializar uPlot
  useEffect(() => {
    if (!canvasRef.current) return;

    const opts: uPlot.Options = {
      width: 800,
      height: 300,
      title: "ADC en tiempo real",
      series: [
        {},  // x axis (timestamp)
        {
          label: "Valor ADC",
          stroke: "#e41a1c",
          width: 1,
          paths: uPlot.paths.linear?.({}) || (() => null),
        },
        {
          label: "Voltaje (V)",
          stroke: "#377eb8",
          width: 1,
          paths: uPlot.paths.linear?.({}) || (() => null),
          scale: "y2",
        },
      ],
      scales: {
        x: { time: false },
        y: { min: 0, max: estado.maximo },
        y2: { min: 0, max: 3.3 },
      },
      axes: [
        { scale: "x", label: "Muestras" },
        { scale: "y", side: 0, label: "Valor ADC", grid: { stroke: "#eee" } },
        { scale: "y2", side: 1, label: "Voltaje (V)", grid: { stroke: "transparent" } },
      ],
      cursor: { show: true, points: { show: true } },
      legend: { show: true, live: true },
    };

    const data: uPlot.AlignedData = [[], [], []];
    uplotRef.current = new uPlot(opts, data, canvasRef.current);

    return () => {
      uplotRef.current?.destroy();
      uplotRef.current = null;
    };
  }, []);

  // Actualizar escalas cuando cambia la resolución
  useEffect(() => {
    if (uplotRef.current) {
      uplotRef.current.setScale("y", { min: 0, max: estado.maximo });
    }
  }, [estado.maximo]);

  // Conexión WebSocket
  useEffect(() => {
    const protocolo = window.location.protocol === "https:" ? "wss" : "ws";
    let reconectar: number | undefined;

    const conectar = () => {
      const socket = new WebSocket(`${protocolo}://${window.location.host}/ws`);
      socketRef.current = socket;

      socket.addEventListener("open", () => setConectado(true));

      socket.addEventListener("message", (evento) => {
        try {
          const datos = JSON.parse(evento.data);
          if (datos.tipo === "adc") {
            // Mensaje de lectura: { tipo: "adc", valor: 1234, voltaje: 1.23, timestamp: 123456 }
            // Mensaje de estado: { tipo: "adc", encendido: false, pin: 4, resolucion: 12, ... }
            if (typeof datos.valor === "number" && typeof datos.voltaje === "number") {
              const nuevoDato: DatoAdc = {
                timestamp: datos.timestamp || Date.now(),
                valor: datos.valor,
                voltaje: datos.voltaje,
              };
              
              setUltimoValor(datos.valor);
              setUltimoVoltaje(datos.voltaje);
              
              // Agregar al buffer para el gráfico
              bufferRef.current.push(nuevoDato);
              if (bufferRef.current.length > maximoPuntos) {
                bufferRef.current.shift();
              }
              
              // Actualizar gráfico
              if (uplotRef.current) {
                const xData = bufferRef.current.map((_, i) => i);
                const yData = bufferRef.current.map(d => d.valor);
                const y2Data = bufferRef.current.map(d => d.voltaje);
                uplotRef.current.setData([xData, yData, y2Data]);
              }
            }
            // Si es mensaje de estado (sin valor/voltaje), actualizar configuración local si necesario
            if (typeof datos.encendido === "boolean") {
              setEstado(prev => ({ ...prev, encendido: datos.encendido }));
            }
            if (typeof datos.pin === "number") {
              setEstado(prev => ({ ...prev, pin: datos.pin }));
            }
            if (typeof datos.resolucion === "number") {
              setEstado(prev => ({ ...prev, resolucion: datos.resolucion }));
            }
            if (typeof datos.frecuenciaEnvio === "number") {
              setEstado(prev => ({ ...prev, frecuenciaEnvio: datos.frecuenciaEnvio }));
            }
            if (typeof datos.maximo === "number") {
              setEstado(prev => ({ ...prev, maximo: datos.maximo }));
            }
          }
        } catch {
          // Mensaje no JSON, ignorar
        }
      });

      socket.addEventListener("error", () => socket.close());

      socket.addEventListener("close", () => {
        setConectado(false);
        reconectar = window.setTimeout(conectar, 1000);
      });
    };

    conectar();

    return () => {
      if (reconectar) window.clearTimeout(reconectar);
      socketRef.current?.close();
    };
  }, []);

  // Enviar configuración al microcontrolador
  const aplicarConfiguracion = () => {
    enviar({
      accion: "configurar",
      pin: estado.pin,
      resolucion: estado.resolucion,
      frecuenciaEnvio: estado.frecuenciaEnvio,
    });
  };

  // Encender/apagar ADC
  const alternar = () => {
    const nuevo = !estado.encendido;
    setEstado(prev => ({ ...prev, encendido: nuevo }));
    enviar({ accion: nuevo ? "encender" : "apagar" });
    
    if (!nuevo) {
      // Limpiar gráfico al apagar
      bufferRef.current = [];
      if (uplotRef.current) {
        uplotRef.current.setData([[], [], []]);
      }
      setUltimoValor(null);
      setUltimoVoltaje(null);
    }
  };

  // Enviar comando por WebSocket
  const enviar = (comando: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ periferico: "adc", ...comando }));
      } catch {
        // Socket cerrado
      }
    }
  };

  // Manejar cambio de pin (actualizar canal ADC sugerido)
  const pinesAdc1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];  // GPIO1-10 = ADC1_CH0-9

  return (
    <div className="pagina">
      <h2>Control ADC</h2>
      <p className={`conexion ${conectado ? "conectado" : ""}`}>
        {conectado ? "Conectado" : "Reconectando..."}
      </p>

      <div className="panel">
        <div className="campo">
          <label htmlFor="pin">Pin GPIO (ADC)</label>
          <input
            id="pin"
            type="number"
            min={1}
            max={20}
            value={estado.pin}
            onChange={(e) => setEstado(prev => ({ ...prev, pin: Number(e.target.value) }))}
          />
          <small>
            {pinesAdc1.includes(estado.pin) ? "ADC1" : "ADC2"}_CH{pinesAdc1.includes(estado.pin) ? estado.pin - 1 : estado.pin - 11}
          </small>
        </div>

        <div className="campo">
          <label htmlFor="resolucion">Resolución (bits)</label>
          <select
            id="resolucion"
            value={estado.resolucion}
            onChange={(e) => setEstado(prev => ({ ...prev, resolucion: Number(e.target.value) }))}
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
            onChange={(e) => setEstado(prev => ({ ...prev, frecuenciaEnvio: Number(e.target.value) }))}
          />
          <small>Máx ~10000 Hz (limitado por WebSocket)</small>
        </div>

        <button className="btn btn-configurar" onClick={aplicarConfiguracion}>
          Aplicar configuración
        </button>

        <button
          className={`btn ${estado.encendido ? "btn-off" : "btn-on"}`}
          onClick={alternar}
        >
          {estado.encendido ? "Detener" : "Iniciar"}
        </button>
      </div>

      <div className="panel lecturas">
        <h3>Lectura actual</h3>
        <div className="valores">
          <div className="valor">
            <span className="etiqueta">Valor ADC:</span>
            <span className="numero">{ultimoValor !== null ? ultimoValor : "—"}</span>
            <span className="unidad">/ {estado.maximo}</span>
          </div>
          <div className="valor">
            <span className="etiqueta">Voltaje:</span>
            <span className="numero">{ultimoVoltaje !== null ? ultimoVoltaje.toFixed(3) : "—"}</span>
            <span className="unidad">V</span>
          </div>
          <div className="valor">
            <span className="etiqueta">Porcentaje:</span>
            <span className="numero">
              {ultimoValor !== null && estado.maximo > 0 ? ((ultimoValor / estado.maximo) * 100).toFixed(1) : "—"}
            </span>
            <span className="unidad">%</span>
          </div>
        </div>
      </div>

      <div className="panel grafico">
        <h3>Gráfico en tiempo real</h3>
        <canvas ref={canvasRef} />
        <p className="info-grafico">
          Mostrando últimos {bufferRef.current.length} de {maximoPuntos} puntos
        </p>
      </div>
    </div>
  );
}

export default ADC;