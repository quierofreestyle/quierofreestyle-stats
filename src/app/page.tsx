import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="home-hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="page-shell home-copy">
          <p className="eyebrow">La memoria del freestyle</p>
          <h1>
            Cada final.
            <br />
            Cada nombre.
            <br />
            <span>Cada historia.</span>
          </h1>
          <p>
            Explorá competencias, eventos y resultados documentados en una base
            construida para preservar la historia de la escena.
          </p>
          <Link className="primary-action" href="/competencias">
            Explorar competencias <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
