#ifndef PWM_H
#define PWM_H

#include <Arduino.h>

/**
 * @brief Librería de ejemplo para controlar una salida PWM en la ESP32.
 *
 * Permite configurar el pin, la frecuencia y la resolución, y ajustar
 * el ciclo de trabajo (duty cycle) de forma sencilla.
 */
class PWM
{
public:
    /**
     * @brief Constructor por defecto.
     */
    PWM();

    /**
     * @brief Configura el pin, la frecuencia y la resolución del PWM.
     *
     * @param pin        Pin de salida PWM.
     * @param frecuencia Frecuencia en Hz (por defecto 1000 Hz).
     * @param resolucion Bits de resolución (por defecto 8, rango 1-16).
     */
    void configurar(uint8_t pin, uint32_t frecuencia = 1000, uint8_t resolucion = 8);

    /**
     * @brief Establece el ciclo de trabajo.
     *
     * @param valor Valor entre 0 y el máximo permitido por la resolución.
     */
    void escribir(uint32_t valor);

    /**
     * @brief Devuelve el valor máximo de ciclo de trabajo según la resolución.
     *
     * @return uint32_t Máximo valor aceptado por escribir().
     */
    uint32_t obtenerMaximo() const;

    /**
     * @brief Detiene la salida PWM en el pin configurado.
     */
    void detener();

private:
    uint8_t _pin;        // Pin de salida PWM
    uint32_t _frecuencia; // Frecuencia en Hz
    uint8_t _resolucion;  // Resolución en bits
    uint32_t _maximo;     // Valor máximo de ciclo de trabajo
    bool _configurado;    // Indica si el PWM fue configurado
};

#endif