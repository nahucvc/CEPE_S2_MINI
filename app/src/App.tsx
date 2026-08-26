import { Routes, Route } from "react-router-dom";
import Encabezado from "./componentes/Encabezado";
import MenuLateral from "./componentes/MenuLateral";
import Inicio from "./paginas/Inicio";
import PWM from "./paginas/PWM";
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
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;