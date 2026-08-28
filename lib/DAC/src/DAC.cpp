#include "DAC.h"

DAC::DAC()
    : _pin(17), _canal(DAC_CHANNEL_1), _configurado(false)
{
}

bool DAC::configurar(uint8_t pin)
{
    _pin = pin;

    // Determinar canal según el pin
    if (pin == 17)
    {
        _canal = DAC_CHANNEL_1;
    }
    else if (pin == 18)
    {
        _canal = DAC_CHANNEL_2;
    }
    else
    {
        _configurado = false;
        return false;
    }

    dac_output_enable(_canal);
    _configurado = true;
    return true;
}

void DAC::escribir(uint8_t valor)
{
    if (!_configurado)
    {
        return;
    }

    dac_output_voltage(_canal, valor);
}

uint8_t DAC::obtenerMaximo() const
{
    return 255;
}

bool DAC::estaConfigurado() const
{
    return _configurado;
}

void DAC::detener()
{
    if (!_configurado)
    {
        return;
    }

    dac_output_disable(_canal);
    _configurado = false;
}