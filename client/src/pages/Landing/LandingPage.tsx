import { Link } from "react-router-dom";
import "./landing.css";

// Landing mínima — a landing de verdade (marketing, captura de e-mail,
// vídeo) é a de renatodepaula.com e NÃO é tocada aqui (projeto separado).
// Isto é só a porta de entrada pro app logado.
export function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-card">
        <span className="landing-selo">Academia do Hábito</span>
        <h1>Um hábito de cada vez.</h1>
        <p>Meditação, alimentação e exercício — sua prática diária, com a comunidade junto.</p>
        <Link to="/login" className="landing-btn">
          Entrar
        </Link>
      </div>
    </div>
  );
}
