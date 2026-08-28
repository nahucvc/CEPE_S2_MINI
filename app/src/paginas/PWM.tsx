import { useEffect, useRef, useState } from "react";

type EstadoPwm = {
  encendido: boolean;
  pin: number;
  frecuencia: number;
  resolucion: number;
  duty: number;
  maximo: number;
};

type TipoOnda = "senoidal" | "cuadrada" | "triangular" | "sierra";

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
    frecuenciaSenal: 100,      // Frecuencia de la señal a generar (Hz)
    frecuenciaPortadora: 100000, // Frecuencia PWM portadora (Hz)
    tipoOnda: "senoidal" as TipoOnda,
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
        console.log("[PWM Frontend] RECIBIDO:", evento.data);
        try {
          const datos = JSON.parse(evento.data);
          if (datos.tipo === "pwm") {
            console.log("[PWM Frontend] Estado PWM recibido:", datos);
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
        const mensaje = { periferico: "pwm", ...comando };
        console.log("[PWM Frontend] ENVIADO:", JSON.stringify(mensaje));
        socket.send(JSON.stringify(mensaje));
      } catch {
        // El socket se cerró entre la comprobación y el envío; se ignora.
      }
    } else {
      console.warn("[PWM Frontend] No se pudo enviar - socket no disponible:", comando);
    }
  };

  const aplicarConfiguracion = () => {
    console.log("[PWM Frontend] Aplicar configuración:", {
      pin: estado.pin,
      frecuencia: estado.frecuencia,
      resolucion: estado.resolucion,
    });
    enviar({
      accion: "configurar",
      pin: estado.pin,
      frecuencia: estado.frecuencia,
      resolucion: estado.resolucion,
    });
  };

  const cambiarDuty = (duty: number) => {
    // Solo actualiza el estado local; el envío lo hace la función periódica.
    console.log("[PWM Frontend] Duty cambiado:", duty);
    setEstado((prev) => ({ ...prev, duty }));
  };

  const alternar = () => {
    // Si la modulación está activa, se detiene antes de usar el control PWM.
    if (modulacion.activa) {
      console.log("[PWM Frontend] Deteniendo modulación antes de alternar");
      enviar({ accion: "detener_modulacion" });
      setModulacion((prev) => ({ ...prev, activa: false }));
    }
    const nuevo = !estado.encendido;
    console.log("[PWM Frontend] Alternar PWM:", nuevo ? "ENCENDER" : "APAGAR");
    setEstado((prev) => ({ ...prev, encendido: nuevo }));
    enviar({ accion: nuevo ? "encender" : "apagar" });
  };

  // Genera los 100 valores de duty cycle para UN período de la señal modulada.
  // El frontend calcula:
  // - frecuenciaCambioPWM = frecuenciaSenal * 100 (veces que cambia el PWM por segundo)
  // - ts = 1_000_000 / frecuenciaCambioPWM (microsegundos entre cada cambio de duty)
  const generarDuties = (): number[] => {
    const maximo = estado.maximo;
    const duties: number[] = [];
    const { tipoOnda } = modulacion;

    for (let i = 0; i < 100; i++) {
      const fase = (2 * Math.PI * i) / 100; // 0 a 2π en 100 pasos
      let valor: number;

      switch (tipoOnda) {
        case "senoidal":
          // Senoidal: (1 + sin(fase)) / 2 * maximo → va de 0 a maximo
          valor = Math.round(((1 + Math.sin(fase)) / 2) * maximo);
          break;
        case "cuadrada":
          // Cuadrada: 50% alto, 50% bajo
          valor = i < 50 ? maximo : 0;
          break;
        case "triangular":
          // Triangular: sube linealmente 0→maximo, luego baja maximo→0
          if (i < 50) {
            valor = Math.round((i / 50) * maximo);
          } else {
            valor = Math.round(((100 - i) / 50) * maximo);
          }
          break;
        case "sierra":
          // Sierra: sube linealmente 0→maximo y vuelve a 0 bruscamente
          valor = Math.round((i / 100) * maximo);
          break;
        default:
          valor = 0;
      }
      duties.push(valor);
    }
    console.log("[PWM Frontend] Duties generados:", {
      tipoOnda,
      maximo,
      cantidad: duties.length,
      primeros5: duties.slice(0, 5),
      ultimos5: duties.slice(-5),
      min: Math.min(...duties),
      max: Math.max(...duties),
    });
    return duties;
  };

  // Calcula ts (microsegundos entre cada muestra) basado en la frecuencia de la señal.
  // frecuenciaCambioPWM = frecuenciaSenal * 100 (cambios por segundo)
  // ts = 1_000_000 / frecuenciaCambioPWM (microsegundos)
  const calcularTs = (): number => {
    const { frecuenciaSenal } = modulacion;
    const frecuenciaCambioPWM = frecuenciaSenal * 100; // Hz
    const ts = Math.round(1_000_000 / frecuenciaCambioPWM); // µs
    console.log("[PWM Frontend] Calcular TS:", {
      frecuenciaSenal,
      frecuenciaCambioPWM,
      ts,
    });
    return ts;
  };

  // Genera una señal modulada: configura PWM a alta frecuencia (portadora)
  // y varía el duty cycle siguiendo la forma de onda deseada.
  const iniciarModulacion = () => {
    console.log("[PWM Frontend] Iniciar modulación:", modulacion);
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

    // 2. Genera 100 muestras de duty cycle para un período de la señal modulada
    const duties = generarDuties();

    // 3. Calcula ts: período de muestreo = 1 / (frecuenciaSenal * 100)
    const ts = calcularTs();

    // 4. Inicia la modulación
    console.log("[PWM Frontend] Enviando comando modular:", { ts, cantidadDuties: duties.length });
    enviar({
      accion: "modular",
      ts,
      duties,
    });
    setModulacion((prev) => ({ ...prev, activa: true }));
  };

  const detenerModulacion = () => {
    console.log("[PWM Frontend] Detener modulación");
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
              setModulacion((prev) => ({
                ...prev,
                frecuenciaSenal: Number(e.target.value),
              }))
            }
          />
          <small>
            El PWM cambiará a {modulacion.frecuenciaSenal * 100} Hz
            (ts = {calcularTs()} µs)
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
              setModulacion((prev) => ({
                ...prev,
                frecuenciaPortadora: Number(e.target.value),
              }))
            }
          />
        </div>

        <div className="campo">
          <label htmlFor="tipoOnda">Tipo de onda</label>
          <select
            id="tipoOnda"
            value={modulacion.tipoOnda}
            onChange={(e) =>
              setModulacion((prev) => ({
                ...prev,
                tipoOnda: e.target.value as TipoOnda,
              }))
            }
          >
            <option value="senoidal">Senoidal</option>
            <option value="cuadrada">Cuadrada</option>
            <option value="triangular">Triangular</option>
            <option value="sierra">Sierra</option>
          </select>
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