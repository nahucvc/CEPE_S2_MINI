#include "PWM.h"

PWM::PWM()
    : _pin(15), _frecuencia(1000), _resolucion(8), _maximo(255), _configurado(false)
{
}

void PWM::configurar(uint8_t pin, uint32_t frecuencia, uint8_t resolucion)
{
    _pin = pin;
    _frecuencia = frecuencia;
    _resolucion = resolucion;

    // La resolución máxima en la ESP32 es de 16 bits.
    if (_resolucion > 16)
    {
        _resolucion = 16;
    }

    _maximo = (1UL << _resolucion) - 1;

    ledcSetup(0, _frecuencia, _resolucion);
    ledcAttachPin(_pin, 0);

    _configurado = true;
}

void PWM::escribir(uint32_t valor)
{
    if (!_configurado)
    {
        return;
    }

    if (valor > _maximo)
    {
        valor = _maximo;
    }

    ledcWrite(0, valor);
}

uint32_t PWM::obtenerMaximo() const
{
    return _maximo;
}

void PWM::detener()
{
    if (!_configurado)
    {
        return;
    }

    ledcWrite(0, 0);
    ledcDetachPin(_pin);
    _configurado = false;
}