#include <Arduino.h>
#include <WiFi.h>
#include "servidor.h"

const char *ssid = "ESP";
const char *password = "123456789";

void setup() 
{
 Serial.begin(9600);

 WiFi.begin(ssid, password);
 while (WiFi.status() != WL_CONNECTED)
 {
   delay(500);
   Serial.print(".");
 }
 Serial.println();
 Serial.print("Conectado, IP: ");
 Serial.println(WiFi.localIP());

 IniciarServidor();
}



void loop() {
  
  
}

