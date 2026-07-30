export default function CompetitionsLoading() {
  return (
    <main className="page-shell content-page" aria-busy="true">
      <section className="page-intro">
        <p className="eyebrow">Archivo competitivo</p>
        <h1>Competencias</h1>
      </section>
      <div className="skeleton filters-skeleton" />
      <div className="competition-grid">
        {[1, 2, 3].map((item) => (
          <div className="skeleton card-skeleton" key={item} />
        ))}
      </div>
    </main>
  );
}
