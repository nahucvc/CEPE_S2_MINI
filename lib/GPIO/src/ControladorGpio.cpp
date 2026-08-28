#include "ControladorGpio.h"

ControladorGpio::ControladorGpio()
{
}

bool ControladorGpio::_esPinValido(uint8_t pin) const
{
    // Pines GPIO válidos de la ESP32-S2 (excluye pines especiales).
    // Se permiten los pines digitales generales 0-21 y 33-45.
    if (pin <= 21)
    {
        return true;
    }
    if (pin >= 33 && pin <= 45)
    {
        return true;
    }
    return false;
}

bool ControladorGpio::configurarEntrada(uint8_t pin, ModoEntrada modo)
{
    if (!_esPinValido(pin))
    {
        return false;
    }

    switch (modo)
    {
    case ENTRADA_PULLUP:
        pinMode(pin, INPUT_PULLUP);
        break;
    case ENTRADA_PULLDOWN:
        pinMode(pin, INPUT_PULLDOWN);
        break;
    case ENTRADA_FLOTANTE:
    default:
        pinMode(pin, INPUT);
        break;
    }

    return true;
}

bool ControladorGpio::leerEntrada(uint8_t pin)
{
    return digitalRead(pin) == HIGH;
}

bool ControladorGpio::configurarSalida(uint8_t pin)
{
    if (!_esPinValido(pin))
    {
        return false;
    }

    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
    return true;
}

void ControladorGpio::escribirSalida(uint8_t pin, bool estado)
{
    digitalWrite(pin, estado ? HIGH : LOW);
}

bool ControladorGpio::leerSalida(uint8_t pin)
{
    return digitalRead(pin) == HIGH;
}