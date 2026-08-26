#include "PWM.h"

PWM::PWM()
    : _pin(15), _frecuencia(1000), _resolucion(8), _maximo(255), _configurado(false),
      _duties(nullptr), _ts(0), _longitud(0), _indice(0),
      _inicioUs(0), _secuenciaActiva(false), _timer(nullptr)
{
}

// Callback del timer: llama a actualizar() sobre la instancia PWM.
static void pwmTimerCallback(void *arg)
{
    PWM *instancia = static_cast<PWM *>(arg);
    instancia->actualizar();
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
        return;
    }

    _duties = duties;
    _ts = ts;
    _longitud = longitud;
    _indice = 0;
    _inicioUs = micros();
    _secuenciaActiva = true;

    // Aplica el primer duty de inmediato.
    escribir(_duties[0]);
    _indice = 1;

    // Crea y arranca el timer periódico que procesa la secuencia.
    if (_timer == nullptr)
    {
        esp_timer_create_args_t args = {};
        args.callback = pwmTimerCallback;
        args.arg = this;
        args.name = "pwm_secuencia";
        esp_err_t err = esp_timer_create(&args, &_timer);
        if (err != ESP_OK)
        {
            _secuenciaActiva = false;
            return;
        }
    }

    // Ajusta el periodo del timer a la resolución del ts: si el ts es menor
    // que el periodo base, usa un periodo más fino (mínimo 100 us).
    uint32_t periodoUs = TIMER_PERIODO_US;
    if (ts < periodoUs)
    {
        periodoUs = ts < 100 ? 100 : ts;
    }
    esp_timer_start_periodic(_timer, periodoUs);
}

void PWM::actualizar()
{
    if (!_secuenciaActiva || !_configurado)
    {
        return;
    }

    uint32_t transcurrido = micros() - _inicioUs;

    // Aplica todos los duties cuyo instante (indice * ts) ya haya llegado.
    while (_indice < _longitud && transcurrido >= (_indice * _ts))
    {
        escribir(_duties[_indice]);
        _indice++;
    }

    // Cuando se llega al final del vector, se reinicia para repetir la
    // secuencia indefinidamente (bucle infinito).
    if (_indice >= _longitud)
    {
        _indice = 0;
        _inicioUs = micros();
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
    _duties = nullptr;
    _ts = 0;
    _longitud = 0;
    _indice = 0;
}