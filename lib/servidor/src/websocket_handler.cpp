#include "websocket_handler.h"
#include "servidor.h"

// Función para enviar el estado del LED a todos los clientes conectados
void enviarEstadoLed()
{
    ws.textAll(estadoLed ? "1" : "0");
}

// Función para enviar el estado del PWM a todos los clientes conectados
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
    Serial.printf("[PWM ESP32] Enviando estado: %s\n", salida.c_str());
    ws.textAll(salida);
}

// Función para enviar el estado del ADC a todos los clientes conectados
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

// Función para enviar la lectura del ADC a todos los clientes conectados
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

// Procesar comandos PWM recibidos por WebSocket
void procesarComandoPwm(JsonObject comando)
{
    const char *accion = comando["accion"] | "";
    Serial.printf("[PWM ESP32] Comando PWM recibido, accion=%s\n", accion);

    if (strcmp(accion, "configurar") == 0)
    {
        pwmPin = comando["pin"] | pwmPin;
        pwmFrecuencia = comando["frecuencia"] | pwmFrecuencia;
        pwmResolucion = comando["resolucion"] | pwmResolucion;
        Serial.printf("[PWM ESP32] Configurar: pin=%u freq=%lu res=%u\n", pwmPin, (unsigned long)pwmFrecuencia, pwmResolucion);
        pwm.configurar(pwmPin, pwmFrecuencia, pwmResolucion);
        pwmDuty = 0;
        pwmEncendido = false;
    }
    else if (strcmp(accion, "duty") == 0)
    {
        pwmDuty = comando["duty"] | pwmDuty;
        Serial.printf("[PWM ESP32] Duty: %lu (encendido=%d)\n", (unsigned long)pwmDuty, pwmEncendido);
        if (pwmEncendido)
        {
            pwm.escribir(pwmDuty);
        }
    }
    else if (strcmp(accion, "encender") == 0)
    {
        Serial.println("[PWM ESP32] Encender");
        pwmEncendido = true;
        pwm.escribir(pwmDuty);
    }
    else if (strcmp(accion, "apagar") == 0)
    {
        Serial.println("[PWM ESP32] Apagar");
        pwmEncendido = false;
        pwm.escribir(0);
    }
    else if (strcmp(accion, "modular") == 0)
    {
        // Modula una señal PWM recorriendo un vector de duties con intervalo fijo ts.
        uint32_t ts = comando["ts"] | 1000;
        JsonArray dutiesJson = comando["duties"].as<JsonArray>();
        size_t longitud = dutiesJson.size();
        Serial.printf("[PWM ESP32] Modular: ts=%lu, longitud=%u\n", (unsigned long)ts, (unsigned int)longitud);
        if (longitud == 0)
        {
            Serial.println("[PWM ESP32] ERROR: longitud de duties es 0");
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
        Serial.printf("[PWM ESP32] Duties copiados: primeros=%lu,%lu,%lu,%lu,%lu ultimos=%lu,%lu,%lu,%lu,%lu\n",
                      (unsigned long)dutiesBuffer[0], (unsigned long)dutiesBuffer[1], (unsigned long)dutiesBuffer[2],
                      (unsigned long)dutiesBuffer[3], (unsigned long)dutiesBuffer[4],
                      (unsigned long)dutiesBuffer[longitud-5], (unsigned long)dutiesBuffer[longitud-4],
                      (unsigned long)dutiesBuffer[longitud-3], (unsigned long)dutiesBuffer[longitud-2],
                      (unsigned long)dutiesBuffer[longitud-1]);

        pwmEncendido = true;
        pwm.reproducirSecuencia(dutiesBuffer, longitud, ts);
        Serial.printf("[PWM ESP32] Secuencia iniciada, activa=%d\n", pwm.secuenciaActiva());
    }
    else if (strcmp(accion, "detener_modulacion") == 0)
    {
        Serial.println("[PWM ESP32] Detener modulación");
        pwm.detenerSecuencia();
        pwmEncendido = false;
        pwmDuty = 0;
        pwm.escribir(0);
    }
    else
    {
        Serial.printf("[PWM ESP32] Acción desconocida: %s\n", accion);
        return;
    }

    enviarEstadoPwm();
}

// Procesar comandos ADC recibidos por WebSocket
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

// Función principal que maneja los eventos del WebSocket
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
    Serial.printf("[WS ESP32] Mensaje recibido (%u bytes): %s\n", (unsigned int)len, comando.c_str());

    // Si el mensaje es JSON, se procesa como comando de un periférico (p.ej. PWM, ADC).
    if (comando.startsWith("{"))
    {
        // Usa DynamicJsonDocument con suficiente memoria para el array de 100 duties.
        // Cada elemento del array ocupa ~16 bytes en ArduinoJson, más el overhead del objeto.
        DynamicJsonDocument doc(4096);
        DeserializationError error = deserializeJson(doc, comando);
        if (error)
        {
            Serial.printf("[WS ESP32] ERROR deserializando JSON: %s\n", error.c_str());
            return;
        }

        const char *periferico = doc["periferico"] | "";
        Serial.printf("[WS ESP32] Periférico: %s\n", periferico);
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