#ifndef DAC_H
#define DAC_H

#include <Arduino.h>
#include <driver/dac.h>

/**
 * @brief Librería para controlar el DAC de la ESP32-S2.
 *
 * La ESP32-S2 tiene 2 canales DAC de 8 bits:
 * - DAC1: GPIO17
 * - DAC2: GPIO18
 */
class DAC
{
public:
    DAC();

    /**
     * @brief Configura el pin de salida DAC.
     *
     * @param pin Pin GPIO (17 = DAC1, 18 = DAC2).
     * @return true si el pin es válido.
     */
    bool configurar(uint8_t pin);

    /**
     * @brief Escribe un valor en el DAC (0-255).
     *
     * @param valor Valor de 8 bits (0-255).
     */
    void escribir(uint8_t valor);

    /**
     * @brief Devuelve el valor máximo del DAC (255).
     */
    uint8_t obtenerMaximo() const;

    /**
     * @brief Indica si el DAC está configurado.
     */
    bool estaConfigurado() const;

    /**
     * @brief Detiene la salida DAC.
     */
    void detener();

private:
    uint8_t _pin;          // Pin de salida DAC
    dac_channel_t _canal;  // Canal DAC
    bool _configurado;     // Indica si el DAC fue configurado
};

#endif // DAC_H