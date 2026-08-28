type Props = {
  valor: number;
  maximo: number;
  encendido: boolean;
};

function LecturaDac({ valor, maximo, encendido }: Props) {
  const porcentaje = maximo > 0 ? ((valor / maximo) * 100).toFixed(1) : "0.0";
  const voltaje = maximo > 0 ? ((valor / maximo) * 3.3).toFixed(3) : "0.000";

  return (
    <section className="panel panel-lectura">
      <h3>Salida actual</h3>
      <div className="valores">
        <div className="valor">
          <span className="etiqueta">Estado:</span>
          <span className="numero">{encendido ? "Activo" : "Apagado"}</span>
        </div>
        <div className="valor">
          <span className="etiqueta">Valor DAC:</span>
          <span className="numero">{valor}</span>
          <span className="unidad">/ {maximo}</span>
        </div>
        <div className="valor">
          <span className="etiqueta">Voltaje:</span>
          <span className="numero">{voltaje}</span>
          <span className="unidad">V</span>
        </div>
        <div className="valor">
          <span className="etiqueta">Porcentaje:</span>
          <span className="numero">{porcentaje}</span>
          <span className="unidad">%</span>
        </div>
      </div>
    </section>
  );
}

export default LecturaDac;