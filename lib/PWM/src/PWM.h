#ifndef PWM_H
#define PWM_H

#include <Arduino.h>
#include <esp_timer.h>

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

    /**
     * @brief Reproduce una secuencia de valores de duty con intervalo fijo.
     *
     * Copia hasta 100 elementos del vector `duties` a un buffer interno.
     * Cada elemento se aplica cada `ts` microsegundos de forma uniforme.
     * El primer duty se aplica de inmediato y los siguientes cada `ts` us.
     * La secuencia se procesa automáticamente mediante un timer de hardware,
     * sin necesidad de llamar a actualizar() desde loop(). Al llegar al final
     * del vector, la secuencia se repite indefinidamente (bucle circular)
     * hasta que se llame a `detenerSecuencia()`.
     *
     * @param duties   Vector con los valores de duty a aplicar (máx. 100).
     * @param longitud Número de elementos del vector.
     * @param ts       Intervalo fijo (microsegundos) entre cada cambio de duty.
     */
    void reproducirSecuencia(const uint32_t *duties, size_t longitud, uint32_t ts);

    /**
     * @brief Indica si hay una secuencia en reproducción.
     *
     * @return true si la secuencia está activa.
     */
    bool secuenciaActiva() const;

    /**
     * @brief Detiene la reproducción de la secuencia en curso.
     */
    void detenerSecuencia();

    /**
     * @brief Avanza un paso en la secuencia circular.
     *
     * Llamado automáticamente por el timer de hardware cada `ts` microsegundos.
     * Escribe el duty actual y avanza al siguiente índice (circular).
     */
    void avanzarPaso();

private:
    // Tamaño máximo del buffer de secuencia (100 elementos)
    static constexpr size_t MAX_SECUENCIA = 100;

    uint8_t _pin;        // Pin de salida PWM
    uint32_t _frecuencia; // Frecuencia en Hz
    uint8_t _resolucion;  // Resolución en bits
    uint32_t _maximo;     // Valor máximo de ciclo de trabajo
    bool _configurado;    // Indica si el PWM fue configurado

    // Estado de la secuencia
    uint32_t _bufferDuties[MAX_SECUENCIA]; // Buffer interno de duties (100 elementos)
    uint32_t _ts;                 // Intervalo fijo (us) entre cambios de duty
    size_t _longitud;             // Longitud de la secuencia activa (<= 100)
    size_t _indice;               // Índice del siguiente duty a aplicar
    bool _secuenciaActiva;        // Indica si hay secuencia en reproducción

    // Timer de hardware para procesar la secuencia
    esp_timer_handle_t _timer;
};

#endif