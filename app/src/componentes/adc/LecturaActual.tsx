type Props = {
  ultimoValor: number | null;
  ultimoVoltaje: number | null;
  maximo: number;
};

function LecturaActual({ ultimoValor, ultimoVoltaje, maximo }: Props) {
  const porcentaje =
    ultimoValor !== null && maximo > 0 ? ((ultimoValor / maximo) * 100).toFixed(1) : null;

  return (
    <section className="panel panel-lectura">
      <h3>Lectura actual</h3>
      <div className="valores">
        <div className="valor">
          <span className="etiqueta">Valor ADC:</span>
          <span className="numero">{ultimoValor !== null ? ultimoValor : "—"}</span>
          <span className="unidad">/ {maximo}</span>
        </div>
        <div className="valor">
          <span className="etiqueta">Voltaje:</span>
          <span className="numero">
            {ultimoVoltaje !== null ? ultimoVoltaje.toFixed(3) : "—"}
          </span>
          <span className="unidad">V</span>
        </div>
        <div className="valor">
          <span className="etiqueta">Porcentaje:</span>
          <span className="numero">{porcentaje !== null ? porcentaje : "—"}</span>
          <span className="unidad">%</span>
        </div>
      </div>
    </section>
  );
}

export default LecturaActual;