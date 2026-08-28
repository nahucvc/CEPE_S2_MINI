import { useEffect, useRef, useState } from "react";
import ControlAdc from "../componentes/adc/ControlAdc";
import LecturaActual from "../componentes/adc/LecturaActual";
import GraficoAdc from "../componentes/adc/GraficoAdc";

type EstadoAdc = {
  pin: number;
  resolucion: number;
  frecuenciaEnvio: number; // Hz - cada cuánto se envía la muestra
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
    pin: 4, // GPIO4 = ADC1_CH0
    resolucion: 12, // 9-12 bits
    frecuenciaEnvio: 100, // Hz
    encendido: false,
    maximo: 4095,
  });
  const [conectado, setConectado] = useState(false);
  const [ultimoValor, setUltimoValor] = useState<number | null>(null);
  const [ultimoVoltaje, setUltimoVoltaje] = useState<number | null>(null);
  // Contador de datos recibidos para forzar re-render del gráfico
  const [contadorDatos, setContadorDatos] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<DatoAdc[]>([]);
  const maximoPuntos = 500; // Puntos visibles en el gráfico

  // Actualizar máximos según resolución
  useEffect(() => {
    const maximos: Record<number, number> = { 9: 511, 10: 1023, 11: 2047, 12: 4095 };
    setEstado((prev) => ({ ...prev, maximo: maximos[estado.resolucion] || 4095 }));
  }, [estado.resolucion]);

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
              setContadorDatos((c) => c + 1);
            }
            // Si es mensaje de estado (sin valor/voltaje), actualizar configuración
            if (typeof datos.encendido === "boolean") {
              setEstado((prev) => ({ ...prev, encendido: datos.encendido }));
            }
            if (typeof datos.pin === "number") {
              setEstado((prev) => ({ ...prev, pin: datos.pin }));
            }
            if (typeof datos.resolucion === "number") {
              setEstado((prev) => ({ ...prev, resolucion: datos.resolucion }));
            }
            if (typeof datos.frecuenciaEnvio === "number") {
              setEstado((prev) => ({ ...prev, frecuenciaEnvio: datos.frecuenciaEnvio }));
            }
            if (typeof datos.maximo === "number") {
              setEstado((prev) => ({ ...prev, maximo: datos.maximo }));
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
    setEstado((prev) => ({ ...prev, encendido: nuevo }));
    enviar({ accion: nuevo ? "encender" : "apagar" });

    if (!nuevo) {
      // Limpiar gráfico al apagar
      bufferRef.current = [];
      setContadorDatos(0);
      setUltimoValor(null);
      setUltimoVoltaje(null);
    }
  };

  const cambiarEstado = (nuevo: Partial<EstadoAdc>) => {
    setEstado((prev) => ({ ...prev, ...nuevo }));
  };

  return (
    <div className="pagina">
      <h2>Control ADC</h2>
      <p className={`conexion ${conectado ? "conectado" : ""}`}>
        {conectado ? "Conectado" : "Reconectando..."}
      </p>

      <div className="grid-adc">
        <ControlAdc
          estado={estado}
          onCambiarEstado={cambiarEstado}
          onAplicarConfiguracion={aplicarConfiguracion}
          onAlternar={alternar}
        />

        <LecturaActual
          ultimoValor={ultimoValor}
          ultimoVoltaje={ultimoVoltaje}
          maximo={estado.maximo}
        />

        <GraficoAdc
          maximo={estado.maximo}
          bufferRef={bufferRef}
          maximoPuntos={maximoPuntos}
          contadorDatos={contadorDatos}
        />
      </div>
    </div>
  );
}

export default ADC;