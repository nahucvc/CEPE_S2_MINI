import { useEffect, useRef, useState } from "react";
import ControlDac from "../componentes/dac/ControlDac";
import LecturaDac from "../componentes/dac/LecturaDac";

type EstadoDac = {
  pin: number;
  valor: number;
  maximo: number;
  encendido: boolean;
};

function DAC() {
  const [estado, setEstado] = useState<EstadoDac>({
    pin: 17, // GPIO17 = DAC1
    valor: 0,
    maximo: 255, // DAC de 8 bits
    encendido: false,
  });
  const [conectado, setConectado] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const ultimoValorEnviadoRef = useRef<number>(0);

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
          if (datos.tipo === "dac") {
            setEstado((prev) => ({
              ...prev,
              pin: datos.pin ?? prev.pin,
              valor: datos.valor ?? prev.valor,
              maximo: datos.maximo ?? prev.maximo,
              encendido: datos.encendido ?? prev.encendido,
            }));
            ultimoValorEnviadoRef.current = datos.valor ?? 0;
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

  // Enviar valor periódicamente si cambió
  useEffect(() => {
    const intervalo = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      if (estado.valor !== ultimoValorEnviadoRef.current) {
        ultimoValorEnviadoRef.current = estado.valor;
        enviar({ accion: "valor", valor: estado.valor });
      }
    }, 80);

    return () => window.clearInterval(intervalo);
  }, [estado.valor]);

  const enviar = (comando: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ periferico: "dac", ...comando }));
      } catch {
        // Socket cerrado
      }
    }
  };

  const aplicarConfiguracion = () => {
    enviar({
      accion: "configurar",
      pin: estado.pin,
    });
  };

  const alternar = () => {
    const nuevo = !estado.encendido;
    setEstado((prev) => ({ ...prev, encendido: nuevo }));
    enviar({ accion: nuevo ? "encender" : "apagar" });
  };

  const cambiarEstado = (nuevo: Partial<EstadoDac>) => {
    setEstado((prev) => ({ ...prev, ...nuevo }));
  };

  return (
    <div className="pagina">
      <h2>Control DAC</h2>
      <p className={`conexion ${conectado ? "conectado" : ""}`}>
        {conectado ? "Conectado" : "Reconectando..."}
      </p>

      <div className="grid-dac">
        <ControlDac
          estado={estado}
          onCambiarEstado={cambiarEstado}
          onAplicarConfiguracion={aplicarConfiguracion}
          onAlternar={alternar}
        />

        <LecturaDac
          valor={estado.valor}
          maximo={estado.maximo}
          encendido={estado.encendido}
        />
      </div>
    </div>
  );
}

export default DAC;