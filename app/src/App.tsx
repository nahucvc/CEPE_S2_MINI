import { useEffect, useRef, useState } from "react";
import "./App.css";

type EstadoLed = "desconocido" | "encendido" | "apagado";

function App() {
  const [estado, setEstado] = useState<EstadoLed>("desconocido");
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
        setEstado(evento.data.trim() === "1" ? "encendido" : "apagado");
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

  const enviarComando = (comando: string) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(comando);
    }
  };

  return (
    <div className="contenedor">
      <h1>Control de LED</h1>
      <div className={`led ${estado === "encendido" ? "encendido" : ""}`}></div>
      <p className="estado">
        Estado:{" "}
        <span id="estadoTexto">
          {estado === "desconocido"
            ? "Desconocido"
            : estado === "encendido"
            ? "Encendido"
            : "Apagado"}
        </span>
      </p>
      <p className={`conexion ${conectado ? "conectado" : ""}`}>
        {conectado ? "Conectado" : "Reconectando..."}
      </p>
      <div className="botones">
        <button className="btn btn-on" onClick={() => enviarComando("on")}>
          Encender
        </button>
        <button className="btn btn-off" onClick={() => enviarComando("off")}>
          Apagar
        </button>
        <button className="btn btn-toggle" onClick={() => enviarComando("toggle")}>
          Alternar
        </button>
      </div>
    </div>
  );
}

export default App;