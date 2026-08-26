#include "servidor.h"
#include "PWM.h"
#include "ADC.h"

AsyncWebServer server(80); // creacion del servidor
AsyncWebSocket ws("/ws");
bool estadoLed = false;

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

void enviarEstadoLed()
{
    ws.textAll(estadoLed ? "1" : "0");
}

void enviarEstadoPwm()
{
    StaticJsonDocument<256> doc;
    doc["tipo"] = "pwm";
    doc["encendido"] = pwmEncendido;
    doc["pin"] = pwmPin;
    doc["frecuencia"] = pwmFrecuencia;
    doc["resolucion"] = pwmResolucion;
    doc["duty"] = pwmDuty;
    doc["maximo"] = pwm.obtenerMaximo();

    String salida;
    serializeJson(doc, salida);
    ws.textAll(salida);
}

void enviarEstadoAdc()
{
    StaticJsonDocument<256> doc;
    doc["tipo"] = "adc";
    doc["encendido"] = adcEncendido;
    doc["pin"] = adcPin;
    doc["resolucion"] = adcResolucion;
    doc["frecuenciaEnvio"] = adcFrecuenciaEnvio;
    doc["maximo"] = adc.getMaximoValor();

    String salida;
    serializeJson(doc, salida);
    ws.textAll(salida);
}

void enviarLecturaAdc()
{
    if (!adcEncendido || !adc.estaConfigurado()) return;

    uint64_t ahora = esp_timer_get_time();
    if (ahora - adcUltimoEnvio < adcPeriodoEnvioUs) return;
    adcUltimoEnvio = ahora;

    int valor = adc.leer();
    if (valor < 0) return;

    float voltaje = adc.leerVoltaje();

    StaticJsonDocument<128> doc;
    doc["tipo"] = "adc";
    doc["valor"] = valor;
    doc["voltaje"] = voltaje;
    doc["timestamp"] = (uint32_t)(ahora / 1000);  // ms

    String salida;
    serializeJson(doc, salida);
    ws.textAll(salida);
}

void procesarComandoPwm(JsonObject comando)
{
    const char *accion = comando["accion"] | "";

    if (strcmp(accion, "configurar") == 0)
    {
        pwmPin = comando["pin"] | pwmPin;
        pwmFrecuencia = comando["frecuencia"] | pwmFrecuencia;
        pwmResolucion = comando["resolucion"] | pwmResolucion;
        pwm.configurar(pwmPin, pwmFrecuencia, pwmResolucion);
        pwmDuty = 0;
        pwmEncendido = false;
    }
    else if (strcmp(accion, "duty") == 0)
    {
        pwmDuty = comando["duty"] | pwmDuty;
        if (pwmEncendido)
        {
            pwm.escribir(pwmDuty);
        }
    }
    else if (strcmp(accion, "encender") == 0)
    {
        pwmEncendido = true;
        pwm.escribir(pwmDuty);
    }
    else if (strcmp(accion, "apagar") == 0)
    {
        pwmEncendido = false;
        pwm.escribir(0);
    }
    else if (strcmp(accion, "modular") == 0)
    {
        // Modula una señal PWM recorriendo un vector de duties con intervalo fijo ts.
        uint32_t ts = comando["ts"] | 1000;
        JsonArray dutiesJson = comando["duties"].as<JsonArray>();
        size_t longitud = dutiesJson.size();
        if (longitud == 0)
        {
            return;
        }

        // Copia los duties a un vector estático (la secuencia se procesa por timer).
        static uint32_t dutiesBuffer[120];
        if (longitud > 120)
        {
            longitud = 120;
        }
        for (size_t i = 0; i < longitud; i++)
        {
            dutiesBuffer[i] = dutiesJson[i].as<uint32_t>();
        }

        pwmEncendido = true;
        pwm.reproducirSecuencia(dutiesBuffer, longitud, ts);
    }
    else if (strcmp(accion, "detener_modulacion") == 0)
    {
        pwm.detenerSecuencia();
        pwmEncendido = false;
        pwmDuty = 0;
        pwm.escribir(0);
    }
    else
    {
        return;
    }

    enviarEstadoPwm();
}

void procesarComandoAdc(JsonObject comando)
{
    const char *accion = comando["accion"] | "";

    if (strcmp(accion, "configurar") == 0)
    {
        adcPin = comando["pin"] | adcPin;
        adcResolucion = comando["resolucion"] | adcResolucion;
        adcFrecuenciaEnvio = comando["frecuenciaEnvio"] | adcFrecuenciaEnvio;
        adcPeriodoEnvioUs = 1000000 / adcFrecuenciaEnvio;

        // Determinar unidad y canal según el pin (solo ADC1 en ESP32-S2)
        if (adcPin >= 1 && adcPin <= 10) {
            adcUnidad = ADC_UNIT_1;
            adcCanal = (adc_channel_t)(adcPin - 1);
        } else {
            // Por defecto ADC1_CH0 (GPIO4)
            adcUnidad = ADC_UNIT_1;
            adcCanal = ADC_CHANNEL_0;
            adcPin = 4;
        }

        adc.configurar(adcUnidad, adcCanal, adcAtenuacion, adcResolucion);
        adcEncendido = false;
    }
    else if (strcmp(accion, "encender") == 0)
    {
        if (adc.estaConfigurado()) {
            adcEncendido = true;
            adcUltimoEnvio = 0;  // Forzar envío inmediato
        }
    }
    else if (strcmp(accion, "apagar") == 0)
    {
        adcEncendido = false;
    }
    else
    {
        return;
    }

    enviarEstadoAdc();
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

    // Si el mensaje es JSON, se procesa como comando de un periférico (p.ej. PWM, ADC).
    if (comando.startsWith("{"))
    {
        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, comando);
        if (error)
        {
            return;
        }

        const char *periferico = doc["periferico"] | "";
        if (strcmp(periferico, "pwm") == 0)
        {
            procesarComandoPwm(doc.as<JsonObject>());
        }
        else if (strcmp(periferico, "adc") == 0)
        {
            procesarComandoAdc(doc.as<JsonObject>());
        }
        return;
    }

    // Comandos simples del LED.
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