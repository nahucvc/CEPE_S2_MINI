import { useEffect, useRef, useState } from "react";

type EstadoPwm = {
  encendido: boolean;
  pin: number;
  frecuencia: number;
  resolucion: number;
  duty: number;
  maximo: number;
};

function PWM() {
  const [estado, setEstado] = useState<EstadoPwm>({
    encendido: false,
    pin: 15,
    frecuencia: 1000,
    resolucion: 8,
    duty: 0,
    maximo: 255,
  });
  const [conectado, setConectado] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

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
          if (datos.tipo === "pwm") {
            setEstado(datos);
          }
        } catch {
          // Mensaje no JSON (p.ej. estado del LED), se ignora aquí.
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

  const enviar = (comando: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ periferico: "pwm", ...comando }));
    }
  };

  const aplicarConfiguracion = () => {
    enviar({
      accion: "configurar",
      pin: estado.pin,
      frecuencia: estado.frecuencia,
      resolucion: estado.resolucion,
    });
  };

  const cambiarDuty = (duty: number) => {
    setEstado((prev) => ({ ...prev, duty }));
    enviar({ accion: "duty", duty });
  };

  const alternar = () => {
    const nuevo = !estado.encendido;
    setEstado((prev) => ({ ...prev, encendido: nuevo }));
    enviar({ accion: nuevo ? "encender" : "apagar" });
  };

  return (
    <div className="pagina">
      <h2>Control PWM</h2>
      <p className={`conexion ${conectado ? "conectado" : ""}`}>
        {conectado ? "Conectado" : "Reconectando..."}
      </p>

      <div className="panel">
        <div className="campo">
          <label htmlFor="pin">Pin de salida</label>
          <input
            id="pin"
            type="number"
            min={0}
            max={48}
            value={estado.pin}
            onChange={(e) =>
              setEstado((prev) => ({ ...prev, pin: Number(e.target.value) }))
            }
          />
        </div>

        <div className="campo">
          <label htmlFor="frecuencia">Frecuencia (Hz)</label>
          <input
            id="frecuencia"
            type="number"
            min={1}
            value={estado.frecuencia}
            onChange={(e) =>
              setEstado((prev) => ({
                ...prev,
                frecuencia: Number(e.target.value),
              }))
            }
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
            onChange={(e) =>
              setEstado((prev) => ({
                ...prev,
                resolucion: Number(e.target.value),
              }))
            }
          />
        </div>

        <button className="btn btn-configurar" onClick={aplicarConfiguracion}>
          Aplicar configuración
        </button>

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
            onChange={(e) => cambiarDuty(Number(e.target.value))}
          />
        </div>

        <button
          className={`btn ${estado.encendido ? "btn-off" : "btn-on"}`}
          onClick={alternar}
        >
          {estado.encendido ? "Apagar" : "Encender"}
        </button>
      </div>
    </div>
  );
}

export default PWM;