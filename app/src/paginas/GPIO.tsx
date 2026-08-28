import { useEffect, useRef, useState } from "react";
import ControlEntradasGpio from "../componentes/gpio/ControlEntradasGpio";
import ControlSalidasGpio from "../componentes/gpio/ControlSalidasGpio";

type EntradaGpio = {
  pin: number;
  modo: number;
  configurado: boolean;
  valor: boolean;
};

type SalidaGpio = {
  pin: number;
  configurado: boolean;
  estado: boolean;
};

const entradasIniciales: EntradaGpio[] = Array.from({ length: 4 }, (_, i) => ({
  pin: i + 1,
  modo: 0,
  configurado: false,
  valor: false,
}));

const salidasIniciales: SalidaGpio[] = Array.from({ length: 4 }, (_, i) => ({
  pin: i + 10,
  configurado: false,
  estado: false,
}));

function GPIO() {
  const [entradas, setEntradas] = useState<EntradaGpio[]>(entradasIniciales);
  const [salidas, setSalidas] = useState<SalidaGpio[]>(salidasIniciales);
  const [conectado, setConectado] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

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
          if (datos.tipo === "gpio") {
            if (Array.isArray(datos.entradas)) {
              setEntradas((prev) =>
                prev.map((entrada, i) => {
                  const recibida = datos.entradas[i];
                  if (!recibida) return entrada;
                  return {
                    ...entrada,
                    pin: recibida.pin ?? entrada.pin,
                    modo: recibida.modo ?? entrada.modo,
                    configurado: recibida.configurado ?? entrada.configurado,
                    valor: recibida.valor ?? entrada.valor,
                  };
                })
              );
            }
            if (Array.isArray(datos.salidas)) {
              setSalidas((prev) =>
                prev.map((salida, i) => {
                  const recibida = datos.salidas[i];
                  if (!recibida) return salida;
                  return {
                    ...salida,
                    pin: recibida.pin ?? salida.pin,
                    configurado: recibida.configurado ?? salida.configurado,
                    estado: recibida.estado ?? salida.estado,
                  };
                })
              );
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

  const enviar = (comando: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ periferico: "gpio", ...comando }));
      } catch {
        // Socket cerrado
      }
    }
  };

  const cambiarEntrada = (indice: number, nuevo: Partial<EntradaGpio>) => {
    setEntradas((prev) => prev.map((e, i) => (i === indice ? { ...e, ...nuevo } : e)));
  };

  const configurarEntrada = (indice: number) => {
    const entrada = entradas[indice];
    enviar({
      accion: "configurar_entrada",
      indice,
      pin: entrada.pin,
      modo: entrada.modo,
    });
  };

  const cambiarSalida = (indice: number, nuevo: Partial<SalidaGpio>) => {
    setSalidas((prev) => prev.map((s, i) => (i === indice ? { ...s, ...nuevo } : s)));
  };

  const configurarSalida = (indice: number) => {
    const salida = salidas[indice];
    enviar({
      accion: "configurar_salida",
      indice,
      pin: salida.pin,
    });
  };

  const alternarSalida = (indice: number) => {
    const salida = salidas[indice];
    const nuevoEstado = !salida.estado;
    setSalidas((prev) => prev.map((s, i) => (i === indice ? { ...s, estado: nuevoEstado } : s)));
    enviar({
      accion: "escribir_salida",
      indice,
      estado: nuevoEstado,
    });
  };

  return (
    <div className="pagina">
      <h2>Control GPIO</h2>
      <p className={`conexion ${conectado ? "conectado" : ""}`}>
        {conectado ? "Conectado" : "Reconectando..."}
      </p>

      <div className="grid-gpio">
        <ControlEntradasGpio
          entradas={entradas}
          onCambiarEntrada={cambiarEntrada}
          onConfigurarEntrada={configurarEntrada}
        />

        <ControlSalidasGpio
          salidas={salidas}
          onCambiarSalida={cambiarSalida}
          onConfigurarSalida={configurarSalida}
          onAlternarSalida={alternarSalida}
        />
      </div>
    </div>
  );
}

export default GPIO;