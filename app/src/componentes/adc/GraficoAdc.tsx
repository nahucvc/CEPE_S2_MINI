import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

type DatoAdc = {
  timestamp: number;
  valor: number;
  voltaje: number;
};

type Props = {
  maximo: number;
  bufferRef: React.MutableRefObject<DatoAdc[]>;
  maximoPuntos: number;
  contadorDatos: number;
};

function GraficoAdc({ maximo, bufferRef, maximoPuntos, contadorDatos }: Props) {
  const uplotRef = useRef<uPlot | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Inicializar uPlot
  useEffect(() => {
    if (!contenedorRef.current) return;

    const opts: uPlot.Options = {
      width: 800,
      height: 300,
      title: "ADC en tiempo real",
      series: [
        {}, // x axis (timestamp)
        {
          label: "Valor ADC",
          stroke: "#e41a1c",
          width: 1,
        },
        {
          label: "Voltaje (V)",
          stroke: "#377eb8",
          width: 1,
          scale: "y2",
        },
      ],
      scales: {
        x: { time: false },
        y: { min: 0, max: maximo },
        y2: { min: 0, max: 3.3 },
      },
      axes: [
        { scale: "x", label: "Muestras" },
        { scale: "y", side: 0, label: "Valor ADC", grid: { stroke: "#eee" } },
        { scale: "y2", side: 1, label: "Voltaje (V)", grid: { stroke: "transparent" } },
      ],
      cursor: { show: true, points: { show: true } },
      legend: { show: true, live: true },
    };

    const data: uPlot.AlignedData = [[], [], []];
    uplotRef.current = new uPlot(opts, data, contenedorRef.current);

    return () => {
      uplotRef.current?.destroy();
      uplotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar escala Y cuando cambia la resolución
  useEffect(() => {
    uplotRef.current?.setScale("y", { min: 0, max: maximo });
  }, [maximo]);

  // Actualizar datos del gráfico cuando llegan nuevos datos
  useEffect(() => {
    if (!uplotRef.current) return;
    const xData = bufferRef.current.map((_, i) => i);
    const yData = bufferRef.current.map((d) => d.valor);
    const y2Data = bufferRef.current.map((d) => d.voltaje);
    uplotRef.current.setData([xData, yData, y2Data]);
  }, [contadorDatos, bufferRef]);

  return (
    <section className="panel panel-grafico">
      <h3>Gráfico en tiempo real</h3>
      <div className="grafico-contenedor" ref={contenedorRef} />
      <p className="info-grafico">
        Mostrando últimos {bufferRef.current.length} de {maximoPuntos} puntos
      </p>
    </section>
  );
}

export default GraficoAdc;