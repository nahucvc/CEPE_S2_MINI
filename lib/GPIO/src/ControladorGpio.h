#ifndef CONTROLADOR_GPIO_H
#define CONTROLADOR_GPIO_H

#include <Arduino.h>

/**
 * @brief Modos de configuración para pines de entrada.
 */
enum ModoEntrada
{
    ENTRADA_FLOTANTE = 0,  // INPUT (sin resistencias)
    ENTRADA_PULLUP = 1,    // INPUT_PULLUP
    ENTRADA_PULLDOWN = 2   // INPUT_PULLDOWN
};

/**
 * @brief Librería para controlar pines GPIO de entrada y salida de la ESP32-S2.
 *
 * Permite configurar hasta 4 pines como entradas (con pull-up, pull-down o
 * flotante) y hasta 4 pines como salidas digitales.
 */
class ControladorGpio
{
public:
    ControladorGpio();

    /**
     * @brief Configura un pin como entrada digital.
     *
     * @param pin Pin GPIO.
     * @param modo Modo de entrada (flotante, pull-up o pull-down).
     * @return true si el pin es válido.
     */
    bool configurarEntrada(uint8_t pin, ModoEntrada modo);

    /**
     * @brief Lee el estado de un pin de entrada.
     *
     * @param pin Pin GPIO.
     * @return true si el pin está en HIGH.
     */
    bool leerEntrada(uint8_t pin);

    /**
     * @brief Configura un pin como salida digital.
     *
     * @param pin Pin GPIO.
     * @return true si el pin es válido.
     */
    bool configurarSalida(uint8_t pin);

    /**
     * @brief Escribe un estado en un pin de salida.
     *
     * @param pin Pin GPIO.
     * @param estado true = HIGH, false = LOW.
     */
    void escribirSalida(uint8_t pin, bool estado);

    /**
     * @brief Lee el estado actual de un pin de salida.
     *
     * @param pin Pin GPIO.
     * @return true si la salida está en HIGH.
     */
    bool leerSalida(uint8_t pin);

private:
    bool _esPinValido(uint8_t pin) const;
};

#endif // CONTROLADOR_GPIO_H