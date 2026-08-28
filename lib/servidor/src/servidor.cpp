#include "servidor.h"
#include "websocket_handler.h"
#include "PWM.h"
#include "ADC.h"

AsyncWebServer server(80); // creacion del servidor
AsyncWebSocket ws("/ws");
bool estadoLed = false;

const uint8_t PIN_LED = 15; // LED integrado de la ESP32

// Estado del PWM
PWM pwm;
bool pwmEncendido = false;
uint8_t pwmPin = 15;
uint32_t pwmFrecuencia = 1000;
uint8_t pwmResolucion = 8;
uint32_t pwmDuty = 0;

// Estado del ADC
ADC adc;
bool adcEncendido = false;
uint8_t adcPin = 4;           // GPIO4 = ADC1_CH0
adc_unit_t adcUnidad = ADC_UNIT_1;
adc_channel_t adcCanal = ADC_CHANNEL_0;
adc_atten_t adcAtenuacion = ADC_ATTEN_DB_12;
uint8_t adcResolucion = 12;  // 9-12 bits
uint32_t adcFrecuenciaEnvio = 100;  // Hz
uint64_t adcUltimoEnvio = 0;
uint32_t adcPeriodoEnvioUs = 10000;  // microsegundos

void notFound(AsyncWebServerRequest *request)
{
    // Fallback SPA: cualquier ruta que no corresponda a un archivo real
    // devuelve index.html para que React Router maneje la navegación.
    request->send(SPIFFS, "/index.html", "text/html");
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

    // El WebSocket debe registrarse ANTES que los handlers HTTP genéricos,
    // para que la ruta /ws no sea interceptada por el regex de archivos.
    ws.onEvent(EventosSockets);
    server.addHandler(&ws);

    // Se enruta las solicitudes del servidor , tambien se puede ver mas tipo de contenido en https://www.iana.org/assignments/media-types/media-types.xhtml
    server.on("/", [](AsyncWebServerRequest *request)
              { request->send(SPIFFS, "/index.html", "text/html"); });

    // Sirve cualquier archivo de la carpeta data (SPIFFS) con su tipo MIME
    server.on("^\\/(.*)$", HTTP_GET, [](AsyncWebServerRequest *request)
              {
                  String ruta = "/" + request->pathArg(0);
                  String tipo = "application/octet-stream";
                  if (ruta.endsWith(".html"))
                  {
                      tipo = "text/html";
                  }
                  else if (ruta.endsWith(".js"))
                  {
                      tipo = "text/javascript";
                  }
                  else if (ruta.endsWith(".css"))
                  {
                      tipo = "text/css";
                  }
                  else if (ruta.endsWith(".svg"))
                  {
                      tipo = "image/svg+xml";
                  }
                  else if (ruta.endsWith(".png"))
                  {
                      tipo = "image/png";
                  }
                  else if (ruta.endsWith(".jpg") || ruta.endsWith(".jpeg"))
                  {
                      tipo = "image/jpeg";
                  }
                  else if (ruta.endsWith(".gif"))
                  {
                      tipo = "image/gif";
                  }
                  else if (ruta.endsWith(".ico"))
                  {
                      tipo = "image/x-icon";
                  }
                  else if (ruta.endsWith(".json"))
                  {
                      tipo = "application/json";
                  }
                  else if (ruta.endsWith(".woff2"))
                  {
                      tipo = "font/woff2";
                  }
                  else if (ruta.endsWith(".woff"))
                  {
                      tipo = "font/woff";
                  }
                  else if (ruta.endsWith(".ttf"))
                  {
                      tipo = "font/ttf";
                  }
                  else if (ruta.endsWith(".txt"))
                  {
                      tipo = "text/plain";
                  }
                  request->send(SPIFFS, ruta, tipo); });

    server.onNotFound(notFound);
    server.begin();
}