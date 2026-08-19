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

extern AsyncWebServer server; // servidor declarado en servidor.cpp

const uint8_t PIN_LED = 15; // LED integrado de la ESP32
extern bool estadoLed;

void notFound(AsyncWebServerRequest *request); // Respuesta del servidor cuando no encuentra la dirrección
void IniciarServidor(void);
extern AsyncWebSocket ws; // se crea el socket
void EventosSockets(AsyncWebSocket *server, AsyncWebSocketClient *cliente, AwsEventType evento, void *arg, uint8_t *datos, size_t len); //funcion que analiza el tipo de evento del socket y llama a la funcion correspondiente  





#endif