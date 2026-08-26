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
  // Estado del bloque de modulación de señales.
  const [modulacion, setModulacion] = useState({
    frecuenciaSenal: 1000,
    frecuenciaPortadora: 100000,
    activa: false,
  });
  const socketRef = useRef<WebSocket | null>(null);
  // Último duty enviado a la ESP32, para evitar paquetes repetidos.
  const ultimoDutyEnviadoRef = useRef<number>(0);

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
            ultimoDutyEnviadoRef.current = datos.duty;
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

  // Función periódica: cada 80 ms revisa si la barra de duty cambió
  // y, de ser así, envía el nuevo valor a la ESP32.
  useEffect(() => {
    const intervalo = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      const dutyActual = estado.duty;
      if (dutyActual !== ultimoDutyEnviadoRef.current) {
        ultimoDutyEnviadoRef.current = dutyActual;
        try {
          socket.send(
            JSON.stringify({ periferico: "pwm", accion: "duty", duty: dutyActual })
          );
        } catch {
          // El socket se cerró entre la comprobación y el envío; se ignora.
        }
      }
    }, 80);

    return () => window.clearInterval(intervalo);
  }, [estado.duty]);

  const enviar = (comando: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ periferico: "pwm", ...comando }));
      } catch {
        // El socket se cerró entre la comprobación y el envío; se ignora.
      }
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
    // Solo actualiza el estado local; el envío lo hace la función periódica.
    setEstado((prev) => ({ ...prev, duty }));
  };

  const alternar = () => {
    // Si la modulación está activa, se detiene antes de usar el control PWM.
    if (modulacion.activa) {
      enviar({ accion: "detener_modulacion" });
      setModulacion((prev) => ({ ...prev, activa: false }));
    }
    const nuevo = !estado.encendido;
    setEstado((prev) => ({ ...prev, encendido: nuevo }));
    enviar({ accion: nuevo ? "encender" : "apagar" });
  };

  // Genera una señal modulada: configura PWM a alta frecuencia (portadora)
  // y varía el duty cycle siguiendo la forma de onda deseada.
  const iniciarModulacion = () => {
    // Detiene el control PWM antes de iniciar la modulación.
    enviar({ accion: "apagar" });
    setEstado((prev) => ({ ...prev, encendido: false }));

    // 1. Configura PWM con frecuencia de portadora ALTA (ej. 100 kHz)
    enviar({
      accion: "configurar",
      pin: estado.pin,
      frecuencia: modulacion.frecuenciaPortadora,
      resolucion: estado.resolucion,
    });

    // 2. Genera 120 muestras de duty cycle para un período de la señal modulada
    // Para señal cuadrada: duty alterna entre 0 y máximo
    // Para senoidal: duty = (1 + sin(2π * i / 120)) / 2 * maximo
    const maximo = estado.maximo;
    const duties: number[] = [];
    for (let i = 0; i < 120; i++) {
      // Señal cuadrada: 60 muestras alto, 60 bajo
      // Para senoidal, descomenta la línea de abajo y comenta la de arriba:
      // const valor = Math.round((1 + Math.sin(2 * Math.PI * i / 120)) / 2 * maximo);
      const valor = i < 60 ? maximo : 0;
      duties.push(valor);
    }

    // ts = período de la señal modulada / 120
    const ts = Math.round(1_000_000 / (modulacion.frecuenciaSenal * 120));

    // 3. Inicia la modulación
    enviar({
      accion: "modular",
      ts,
      duties,
    });
    setModulacion((prev) => ({ ...prev, activa: true }));
  };

  const detenerModulacion = () => {
    enviar({ accion: "detener_modulacion" });
    setModulacion((prev) => ({ ...prev, activa: false }));
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
          disabled={modulacion.activa}
        >
          {estado.encendido ? "Apagar" : "Encender"}
        </button>
      </div>

      <h3>Modulación de señal</h3>
      <div className="panel">
        <div className="campo">
          <label htmlFor="frecuenciaSenal">Frecuencia de la señal (Hz)</label>
          <input
            id="frecuenciaSenal"
            type="number"
            min={1}
            value={modulacion.frecuenciaSenal}
            onChange={(e) =>
              setModulacion((prev) => ({
                ...prev,
                frecuenciaSenal: Number(e.target.value),
              }))
            }
          />
        </div>

        <div className="campo">
          <label htmlFor="frecuenciaPortadora">Frecuencia portadora PWM (Hz)</label>
          <input
            id="frecuenciaPortadora"
            type="number"
            min={1000}
            value={modulacion.frecuenciaPortadora}
            onChange={(e) =>
              setModulacion((prev) => ({
                ...prev,
                frecuenciaPortadora: Number(e.target.value),
              }))
            }
          />
        </div>

        <button
          className={`btn ${modulacion.activa ? "btn-off" : "btn-configurar"}`}
          onClick={modulacion.activa ? detenerModulacion : iniciarModulacion}
        >
          {modulacion.activa ? "Detener modulación" : "Iniciar modulación"}
        </button>
      </div>
    </div>
  );
}

export default PWM;