#ifndef ADC_H
#define ADC_H

#include <Arduino.h>
#include <driver/adc.h>
#include <esp_adc_cal.h>
#include <esp_timer.h>

// ESP32-S2 usa ADC_WIDTH_BIT_13 como máximo, mapeamos a valores estándar
#define ADC_WIDTH_BIT_9  ADC_WIDTH_BIT_13  // No existe, usamos 13 y limitamos por software
#define ADC_WIDTH_BIT_10 ADC_WIDTH_BIT_13
#define ADC_WIDTH_BIT_11 ADC_WIDTH_BIT_13
#define ADC_WIDTH_BIT_12 ADC_WIDTH_BIT_13

class ADC {
public:
    ADC();
    ~ADC();

    // Configuración básica
    // resolucion: 9, 10, 11, 12 bits (se mapea internamente)
    bool configurar(adc_unit_t unidad, adc_channel_t canal, adc_atten_t atenuacion = ADC_ATTEN_DB_12, uint8_t resolucion = 12);
    
    // Lectura simple (oneshot)
    int leer();
    
    // Lectura con voltaje
    float leerVoltaje();
    
    // Configurar frecuencia de actualización (para modo oneshot periódico)
    void setFrecuenciaActualizacion(uint32_t frecuenciaHz);
    uint32_t getFrecuenciaActualizacion() const;
    
    // Actualizar lectura periódica (llamar en loop o timer)
    void actualizar();
    
    // Estado
    bool estaConfigurado() const;
    adc_unit_t getUnidad() const;
    adc_channel_t getCanal() const;
    uint8_t getResolucion() const;
    uint32_t getMaximoValor() const;

private:
    // Configuración
    adc_unit_t _unidad = ADC_UNIT_1;
    adc1_channel_t _canal = ADC1_CHANNEL_0;
    adc_atten_t _atenuacion = ADC_ATTEN_DB_12;
    uint8_t _resolucion = 12;  // 9-12 bits
    adc_bits_width_t _widthConfig = ADC_WIDTH_BIT_13;  // Configuración hardware (S2 usa 13 bits)
    bool _configurado = false;
    
    // Calibración
    esp_adc_cal_characteristics_t _adcChars;
    bool _calibrado = false;
    
    // Actualización periódica (modo oneshot)
    uint32_t _frecuenciaActualizacion = 100;  // Hz
    uint32_t _periodoActualizacionUs = 1000000;  // microsegundos
    uint64_t _ultimaActualizacion = 0;
    int _ultimaLectura = 0;
    bool _nuevaLectura = false;
    
    // Helpers privados
    bool _calibrar();
    adc1_channel_t _convertirCanal(adc_channel_t canal) const;
};

#endif // ADC_H