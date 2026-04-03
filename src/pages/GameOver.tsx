import { useLocation, useNavigate } from "react-router-dom";

type RunResult = {
  score: number;
  wave: number;
  timeSurvived: number;
  enemyAceHealth: number;
  enemyCoreHealth: number;
  playerCoreHealth: number;
  dronesDestroyed: number;
  result: "victory" | "defeat";
};

const defaultResult: RunResult = {
  score: 0,
  wave: 1,
  timeSurvived: 0,
  enemyAceHealth: 100,
  enemyCoreHealth: 260,
  playerCoreHealth: 240,
  dronesDestroyed: 0,
  result: "defeat",
};

const gradeRun = (result: RunResult) => {
  if (result.result === "victory" && result.wave >= 4) return "S";
  if (result.result === "victory") return "A";
  if (result.wave >= 4) return "B";
  return "C";
};

const formatTime = (seconds: number) => {
  const total = Math.floor(seconds);
  const mins = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

export default function GameOver() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = (location.state as RunResult | undefined) ?? defaultResult;
  const grade = gradeRun(result);

  return (
    <main className="gameover-shell">
      <section className="gameover-panel">
        <span className="eyebrow">{result.result === "victory" ? "Mission Complete" : "Mission Failed"}</span>
        <h1>{result.result === "victory" ? "Enemy core destroyed." : "Your core went down."}</h1>
        <p className="hero-text">
          Grade <strong>{grade}</strong> • Score {result.score} • Survived {formatTime(result.timeSurvived)}
        </p>

        <div className="results-grid">
          <article className="result-card">
            <span className="card-label">Wave</span>
            <strong>{result.wave}</strong>
            <p>Highest combat pressure reached during the run.</p>
          </article>
          <article className="result-card">
            <span className="card-label">Enemy Core</span>
            <strong>{Math.max(0, Math.round(result.enemyCoreHealth))}</strong>
            <p>Remaining enemy shield integrity at extraction.</p>
          </article>
          <article className="result-card">
            <span className="card-label">Your Core</span>
            <strong>{Math.max(0, Math.round(result.playerCoreHealth))}</strong>
            <p>Defensive core status after the final exchange.</p>
          </article>
          <article className="result-card">
            <span className="card-label">Enemy Ace</span>
            <strong>{Math.max(0, Math.round(result.enemyAceHealth))}</strong>
            <p>Hull condition when the encounter ended.</p>
          </article>
        </div>

        <div className="hero-actions">
          <button className="primary-button" onClick={() => navigate("/game")}>
            Run It Back
          </button>
          <button className="secondary-button" onClick={() => navigate("/")}>
            Return Home
          </button>
        </div>
      </section>
    </main>
  );
}
