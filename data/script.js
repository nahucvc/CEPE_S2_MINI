const led = document.getElementById("led");
const estadoTexto = document.getElementById("estadoTexto");
const btnOn = document.getElementById("btnOn");
const btnOff = document.getElementById("btnOff");
const btnToggle = document.getElementById("btnToggle");
let socket;

function actualizarEstado(encendido) {
    estadoTexto.textContent = encendido ? "Encendido" : "Apagado";
    led.classList.toggle("encendido", encendido);
}

function conectarWebSocket() {
    const protocolo = window.location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocolo}://${window.location.host}/ws`);

    socket.addEventListener("message", (evento) => {
        actualizarEstado(evento.data.trim() === "1");
    });

    socket.addEventListener("error", (error) => {
        console.error("Error al comunicarse con el ESP32:", error);
        socket.close();
    });

    socket.addEventListener("close", () => {
        setTimeout(conectarWebSocket, 1000);
    });
}

function enviarComando(comando) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(comando);
    }
}

btnOn.addEventListener("click", () => enviarComando("on"));
btnOff.addEventListener("click", () => enviarComando("off"));
btnToggle.addEventListener("click", () => enviarComando("toggle"));

window.addEventListener("load", conectarWebSocket);
