#include "PWM.h"

// Tamaño máximo del buffer de secuencia (100 elementos como se solicitó)
#define PWM_MAX_SECUENCIA 100

PWM::PWM()
    : _pin(15), _frecuencia(1000), _resolucion(8), _maximo(255), _configurado(false),
      _ts(0), _longitud(0), _indice(0),
      _secuenciaActiva(false), _timer(nullptr)
{
    // Inicializar buffer interno a cero
    for (size_t i = 0; i < PWM_MAX_SECUENCIA; i++) {
        _bufferDuties[i] = 0;
    }
}

// Callback del timer: avanza un paso en la secuencia circular.
static void pwmTimerCallback(void *arg)
{
    PWM *instancia = static_cast<PWM *>(arg);
    instancia->avanzarPaso();
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
    detenerSecuencia();
}

void PWM::reproducirSecuencia(const uint32_t *duties, size_t longitud, uint32_t ts)
{
    if (!_configurado || duties == nullptr || longitud == 0 || ts == 0)
    {
        Serial.printf("[PWM ESP32] reproducirSecuencia rechazada: config=%d duties=%p long=%u ts=%lu\n",
                      _configurado, (void*)duties, (unsigned int)longitud, (unsigned long)ts);
        return;
    }

    // Limitar a máximo 100 elementos
    size_t elementosACopiar = (longitud > PWM_MAX_SECUENCIA) ? PWM_MAX_SECUENCIA : longitud;

    // Copiar datos al buffer interno (seguro, no depende de memoria externa)
    for (size_t i = 0; i < elementosACopiar; i++)
    {
        uint32_t valor = duties[i];
        if (valor > _maximo) valor = _maximo;
        _bufferDuties[i] = valor;
    }

    _longitud = elementosACopiar;
    _ts = ts;
    _indice = 0;
    _secuenciaActiva = true;

    Serial.printf("[PWM ESP32] reproducirSecuencia: long=%u ts=%lu max=%lu\n",
                  (unsigned int)_longitud, (unsigned long)_ts, (unsigned long)_maximo);

    // Aplica el primer duty de inmediato.
    escribir(_bufferDuties[0]);
    _indice = 1;

    // Crea el timer si no existe.
    if (_timer == nullptr)
    {
        esp_timer_create_args_t args = {};
        args.callback = pwmTimerCallback;
        args.arg = this;
        args.name = "pwm_secuencia";
        esp_err_t err = esp_timer_create(&args, &_timer);
        if (err != ESP_OK)
        {
            Serial.printf("[PWM ESP32] ERROR creando timer: %d\n", err);
            _secuenciaActiva = false;
            return;
        }
    }

    // Configura el timer para disparar exactamente cada 'ts' microsegundos.
    // Cada disparo llama a avanzarPaso() que escribe el siguiente duty.
    uint32_t periodoUs = (ts < 1) ? 1 : ts;
    esp_err_t err = esp_timer_start_periodic(_timer, periodoUs);
    Serial.printf("[PWM ESP32] Timer iniciado: periodo=%lu us, err=%d\n", (unsigned long)periodoUs, err);
}

// Avanza un paso en la secuencia circular - llamado desde el timer ISR.
void PWM::avanzarPaso()
{
    if (!_secuenciaActiva || !_configurado || _longitud == 0)
    {
        return;
    }

    // Escribe el duty actual y avanza al siguiente (circular).
    escribir(_bufferDuties[_indice]);
    _indice++;

    // Circular: volver al inicio cuando se llega al final.
    if (_indice >= _longitud)
    {
        _indice = 0;
    }
}

bool PWM::secuenciaActiva() const
{
    return _secuenciaActiva;
}

void PWM::detenerSecuencia()
{
    if (_timer != nullptr)
    {
        esp_timer_stop(_timer);
    }
    _secuenciaActiva = false;
    _longitud = 0;
    _indice = 0;
    _ts = 0;
}