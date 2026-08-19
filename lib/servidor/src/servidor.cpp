#include "servidor.h"

AsyncWebServer server(80); // creacion del servidor
AsyncWebSocket ws("/ws");
bool estadoLed = false;

void notFound(AsyncWebServerRequest *request)
{
    request->send(404, "text/plain", "La pagina no fue encontrada");
}

void enviarEstadoLed()
{
    ws.textAll(estadoLed ? "1" : "0");
}

void EventosSockets(AsyncWebSocket *server, AsyncWebSocketClient *cliente, AwsEventType evento, void *arg, uint8_t *datos, size_t len)
{
    if (evento == WS_EVT_CONNECT)
    {

        Serial.printf("Cliente conectado: %u\n", cliente->id());
        cliente->text(estadoLed ? "1" : "0");
        return;
    }

     if (evento == WS_EVT_DISCONNECT)
    {

        Serial.printf("Cliente desconectado: %u\n", cliente->id());
        return;
    }

    if (evento != WS_EVT_DATA)
    {
        return;
    }

    AwsFrameInfo *info = reinterpret_cast<AwsFrameInfo *>(arg);
    if (info->opcode != WS_TEXT || !info->final || info->index != 0 || info->len != len)
    {
        return;
    }

    String comando(reinterpret_cast<char *>(datos), len);
    if (comando == "on")
    {
        estadoLed = true;
    }
    else if (comando == "off")
    {
        estadoLed = false;
    }
    else if (comando == "toggle")
    {
        estadoLed = !estadoLed;
    }
    else if (comando != "estado")
    {
        return;
    }

    digitalWrite(PIN_LED, estadoLed);
    enviarEstadoLed();
}


void IniciarServidor(void)
{

    if (!SPIFFS.begin(true))
    {
        Serial.println("A ocurrido un error al montando SPIFFS");
        return;
    }

    pinMode(PIN_LED, OUTPUT);
    digitalWrite(PIN_LED, estadoLed);

    // Se enruta las solicitudes del servidor , tambien se puede ver mas tipo de contenido en https://www.iana.org/assignments/media-types/media-types.xhtml
    server.on("/", [](AsyncWebServerRequest *request)
              { request->send(SPIFFS, "/index.html", "text/html"); });

    server.on("/styles.css", [](AsyncWebServerRequest *request)
              { request->send(SPIFFS, "/styles.css", "text/css"); });

    server.on("/script.js", [](AsyncWebServerRequest *request)
              { request->send(SPIFFS, "/script.js", "text/javascript"); });

    server.onNotFound(notFound);
    ws.onEvent(EventosSockets);
    server.addHandler(&ws);
    server.begin();
}