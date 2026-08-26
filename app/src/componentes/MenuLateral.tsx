import { NavLink } from "react-router-dom";

// Lista de periféricos de la ESP32. Cada entrada tendrá su página asociada
// cuando se creen las funciones y botones correspondientes.
const perifericos = [
  { ruta: "/", etiqueta: "Inicio" },
  { ruta: "/led", etiqueta: "LED" },
  { ruta: "/pwm", etiqueta: "PWM" },
  { ruta: "/adc", etiqueta: "ADC" },
  { ruta: "/dac", etiqueta: "DAC" },
  { ruta: "/gpio", etiqueta: "GPIO" },
  { ruta: "/uart", etiqueta: "UART" },
  { ruta: "/i2c", etiqueta: "I2C" },
  { ruta: "/spi", etiqueta: "SPI" },
];

function MenuLateral() {
  return (
    <nav className="menu-lateral">
      <ul>
        {perifericos.map((periferico) => (
          <li key={periferico.ruta}>
            <NavLink
              to={periferico.ruta}
              className={({ isActive }) => (isActive ? "activo" : "")}
            >
              {periferico.etiqueta}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default MenuLateral;