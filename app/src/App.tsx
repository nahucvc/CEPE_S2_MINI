import { Routes, Route } from "react-router-dom";
import Encabezado from "./componentes/Encabezado";
import MenuLateral from "./componentes/MenuLateral";
import Inicio from "./paginas/Inicio";
import PWM from "./paginas/PWM";
import ADC from "./paginas/ADC";
import DAC from "./paginas/DAC";
import GPIO from "./paginas/GPIO";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Encabezado />
      <div className="contenido">
        <MenuLateral />
        <main className="principal">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/pwm" element={<PWM />} />
            <Route path="/adc" element={<ADC />} />
            <Route path="/dac" element={<DAC />} />
            <Route path="/gpio" element={<GPIO />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;