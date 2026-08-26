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
     * Cada elemento del vector `duties` se aplica cada `ts` microsegundos de forma
     * uniforme. El primer duty se aplica de inmediato y los siguientes cada `ts` us.
     * La secuencia se procesa automáticamente mediante un timer de hardware, sin
     * necesidad de llamar a `actualizar()` desde loop(). Al llegar al final del
     * vector, la secuencia se repite indefinidamente (bucle infinito) hasta que
     * se llame a `detenerSecuencia()`.
     *
     * @param duties   Vector con los valores de duty a aplicar.
     * @param longitud Número de elementos del vector.
     * @param ts       Intervalo fijo (microsegundos) entre cada cambio de duty.
     */
    void reproducirSecuencia(const uint32_t *duties, size_t longitud, uint32_t ts);

    /**
     * @brief Procesa la secuencia activa según el tiempo transcurrido.
     *
     * Es invocada automáticamente por el timer de hardware. No es necesario
     * llamarla desde loop().
     */
    void actualizar();

    /**
     * @brief Indica si hay una secuencia en reproducción.
     *
     * @return true si la secuencia aún no ha terminado.
     */
    bool secuenciaActiva() const;

    /**
     * @brief Detiene la reproducción de la secuencia en curso.
     */
    void detenerSecuencia();

    /**
     * @brief Activa o desactiva la depuración por Serial.
     *
     * Cuando está activa, la librería imprime mensajes de diagnóstico
     * (configuración, inicio de secuencia, cambios de duty, errores).
     *
     * @param activar true para activar la depuración, false para desactivarla.
     */
    void depurar(bool activar);

private:
    uint8_t _pin;        // Pin de salida PWM
    uint32_t _frecuencia; // Frecuencia en Hz
    uint8_t _resolucion;  // Resolución en bits
    uint32_t _maximo;     // Valor máximo de ciclo de trabajo
    bool _configurado;    // Indica si el PWM fue configurado
    bool _depurar;        // Indica si la depuración por Serial está activa

    // Estado de la secuencia
    const uint32_t *_duties;      // Vector de duties
    uint32_t _ts;                 // Intervalo fijo (us) entre cambios de duty
    size_t _longitud;             // Longitud del vector
    size_t _indice;               // Índice del siguiente duty a aplicar
    uint32_t _inicioUs;           // Momento de inicio de la secuencia (us)
    bool _secuenciaActiva;        // Indica si hay secuencia en reproducción

    // Timer de hardware para procesar la secuencia
    esp_timer_handle_t _timer;    // Manejador del timer
    static constexpr uint32_t TIMER_PERIODO_US = 1000; // 1 ms
};

#endif