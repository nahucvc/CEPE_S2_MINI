#ifndef SERVIDOR_H
#define SERVIDOR_H
#include <Arduino.h>
#include <SPIFFS.h>
#include <FS.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include "SPIFFS.h"
#include <ArduinoJson.h>
#include <driver/adc.h>
#include "websocket_handler.h"

extern AsyncWebServer server; // servidor declarado en servidor.cpp

extern const uint8_t PIN_LED; // LED integrado de la ESP32
extern bool estadoLed;

void notFound(AsyncWebServerRequest *request); // Respuesta del servidor cuando no encuentra la dirrección
void IniciarServidor(void);
extern AsyncWebSocket ws; // se crea el socket

// Funciones ADC
void enviarLecturaAdc(void);
void enviarEstadoAdc(void);

#endif