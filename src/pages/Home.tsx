import { useNavigate } from "react-router-dom";

const features = [
  {
    title: "Modern Arcade Combat",
    description: "High-speed mech duels, reactive enemy AI, and a base-race objective that keeps every second tense.",
  },
  {
    title: "Readable Strategy Layer",
    description: "Manage heat, bank overdrive, and time your dash plus nova pulse to break pressure at the right moment.",
  },
  {
    title: "Playable In Minutes",
    description: "Simple keyboard controls, escalating waves, and instant retries make it easy to jump back in.",
  },
];

const controls = [
  "WASD move",
  "J / Space fire plasma shots",
  "K vector dash",
  "L nova pulse",
  "P pause battle",
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className="home-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Neon Arena Protocol</span>
          <h1>Mech duels reimagined as a stylish, modern arcade run.</h1>
          <p className="hero-text">
            Break the rival ace, survive drone surges, and destroy the enemy core before your
            own defense collapses.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate("/game")}>
              Launch Mission
            </button>
            <div className="inline-note">Solo run • keyboard only • instant restart</div>
          </div>
        </div>

        <div className="hero-side">
          <div className="status-card">
            <span className="card-label">Mission Brief</span>
            <h2>Win the core race.</h2>
            <p>
              You pilot a fast recon mech. The enemy ace adapts over time, while drones pressure
              your side of the arena.
            </p>
          </div>
          <div className="control-card">
            <span className="card-label">Controls</span>
            <ul>
              {controls.map((control) => (
                <li key={control}>{control}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {features.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <span className="card-label">System Upgrade</span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
