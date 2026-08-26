#include "ADC.h"

ADC::ADC() {
}

ADC::~ADC() {
}

adc1_channel_t ADC::_convertirCanal(adc_channel_t canal) const {
    // ADC1_CHANNEL_0 = 0, ADC1_CHANNEL_1 = 1, etc.
    return static_cast<adc1_channel_t>(canal);
}

bool ADC::configurar(adc_unit_t unidad, adc_channel_t canal, adc_atten_t atenuacion, uint8_t resolucion) {
    _unidad = unidad;
    _canal = _convertirCanal(canal);
    _atenuacion = atenuacion;
    _resolucion = resolucion;
    
    // ESP32-S2 solo soporta ADC_WIDTH_BIT_13 en hardware
    // La resolución se maneja por software limitando los valores
    _widthConfig = ADC_WIDTH_BIT_13;
    
    if (_unidad == ADC_UNIT_1) {
        adc1_config_width(_widthConfig);
        adc1_config_channel_atten(_canal, _atenuacion);
    } else {
        // ADC2 no disponible fácilmente en Arduino ESP32-S2
        return false;
    }
    
    // Calibrar
    _calibrado = _calibrar();
    
    _configurado = true;
    _periodoActualizacionUs = 1000000 / _frecuenciaActualizacion;
    return true;
}

int ADC::leer() {
    if (!_configurado) {
        return -1;
    }
    
    int lectura = 0;
    if (_unidad == ADC_UNIT_1) {
        lectura = adc1_get_raw(_canal);
        // Limitar según resolución configurada
        uint32_t maxVal = getMaximoValor();
        if (lectura > (int)maxVal) lectura = maxVal;
    } else {
        return -1;
    }
    
    _ultimaLectura = lectura;
    _nuevaLectura = true;
    return lectura;
}

float ADC::leerVoltaje() {
    if (!_configurado || !_calibrado) {
        return -1.0f;
    }
    
    int lectura = leer();
    if (lectura < 0) {
        return -1.0f;
    }
    
    uint32_t voltajeMv = esp_adc_cal_raw_to_voltage(lectura, &_adcChars);
    return voltajeMv / 1000.0f;
}

void ADC::setFrecuenciaActualizacion(uint32_t frecuenciaHz) {
    _frecuenciaActualizacion = frecuenciaHz;
    if (_frecuenciaActualizacion == 0) _frecuenciaActualizacion = 1;
    _periodoActualizacionUs = 1000000 / _frecuenciaActualizacion;
}

uint32_t ADC::getFrecuenciaActualizacion() const {
    return _frecuenciaActualizacion;
}

void ADC::actualizar() {
    if (!_configurado || _frecuenciaActualizacion == 0) {
        return;
    }
    
    uint64_t ahora = esp_timer_get_time();
    if (ahora - _ultimaActualizacion >= _periodoActualizacionUs) {
        _ultimaActualizacion = ahora;
        leer();  // Actualiza _ultimaLectura y _nuevaLectura
    }
}

bool ADC::estaConfigurado() const {
    return _configurado;
}

adc_unit_t ADC::getUnidad() const {
    return _unidad;
}

adc_channel_t ADC::getCanal() const {
    return static_cast<adc_channel_t>(_canal);
}

uint8_t ADC::getResolucion() const {
    return _resolucion;
}

uint32_t ADC::getMaximoValor() const {
    switch (_resolucion) {
        case 9:  return 511;
        case 10: return 1023;
        case 11: return 2047;
        case 12: return 4095;
        default: return 4095;
    }
}

bool ADC::_calibrar() {
    esp_adc_cal_value_t val_type = esp_adc_cal_characterize(
        ADC_UNIT_1, _atenuacion, _widthConfig, 1100, &_adcChars);
    return val_type == ESP_ADC_CAL_VAL_EFUSE_VREF || val_type == ESP_ADC_CAL_VAL_EFUSE_TP;
}