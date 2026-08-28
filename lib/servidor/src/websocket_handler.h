#ifndef WEBSOCKET_HANDLER_H
#define WEBSOCKET_HANDLER_H

#include <Arduino.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include "PWM.h"
#include "ADC.h"
#include "DAC.h"
#include "ControladorGpio.h"

// Variables externas (definidas en servidor.cpp)
extern AsyncWebSocket ws;
extern bool estadoLed;
extern const uint8_t PIN_LED;

// Estado del PWM
extern PWM pwm;
extern bool pwmEncendido;
extern uint8_t pwmPin;
extern uint32_t pwmFrecuencia;
extern uint8_t pwmResolucion;
extern uint32_t pwmDuty;

// Estado del ADC
extern ADC adc;
extern bool adcEncendido;
extern uint8_t adcPin;
extern adc_unit_t adcUnidad;
extern adc_channel_t adcCanal;
extern adc_atten_t adcAtenuacion;
extern uint8_t adcResolucion;
extern uint32_t adcFrecuenciaEnvio;
extern uint64_t adcUltimoEnvio;
extern uint32_t adcPeriodoEnvioUs;

// Estado del DAC
extern DAC dac;
extern bool dacEncendido;
extern uint8_t dacPin;
extern uint8_t dacValor;

// Estado del GPIO
extern ControladorGpio gpio;
extern uint8_t gpioEntradas[4];
extern ModoEntrada gpioModos[4];
extern uint8_t gpioSalidas[4];
extern bool gpioEstadosSalida[4];
extern bool gpioEntradasConfiguradas[4];
extern bool gpioSalidasConfiguradas[4];

// Funciones de envío de estado
void enviarEstadoLed();
void enviarEstadoPwm();
void enviarEstadoAdc();
void enviarLecturaAdc();
void enviarEstadoDac();
void enviarEstadoGpio();

// Funciones de procesamiento de comandos
void procesarComandoPwm(JsonObject comando);
void procesarComandoAdc(JsonObject comando);
void procesarComandoDac(JsonObject comando);
void procesarComandoGpio(JsonObject comando);

// Función principal de eventos WebSocket
void EventosSockets(AsyncWebSocket *server, AsyncWebSocketClient *cliente, AwsEventType evento, void *arg, uint8_t *datos, size_t len);

#endif