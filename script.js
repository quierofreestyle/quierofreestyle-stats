function obtenerParametro(nombre) {
  const params = new URLSearchParams(window.location.search);
  return params.get(nombre);
}

async function cargarJSON(ruta) {
  const res = await fetch(ruta);
  if (!res.ok) throw new Error(`No se pudo cargar ${ruta}`);
  return await res.json();
}

function escapeHTML(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function crearLoaderGlobal() {
  if (document.getElementById("app-loader")) return;
  const loader = document.createElement("div");
  loader.id = "app-loader";
  loader.className = "app-loader";
  loader.innerHTML = `<div class="loader-card"><div class="loader-spinner"></div><span>Cargando estadísticas...</span></div>`;
  document.body.appendChild(loader);
}

function ocultarLoaderGlobal() {
  const loader = document.getElementById("app-loader");
  if (!loader) return;
  loader.classList.add("is-hidden");
  setTimeout(() => loader.remove(), 220);
}

function renderEmptyState({ titulo = "Sin datos", texto = "Todavía no hay información disponible.", accionTexto = "Volver al inicio", accionUrl = "index.html" } = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h2>${escapeHTML(titulo)}</h2>
      <p>${escapeHTML(texto)}</p>
      ${accionUrl ? `<a class="btn btn-primary" href="${accionUrl}">${escapeHTML(accionTexto)}</a>` : ""}
    </div>
  `;
}

function renderEmptyRow(colspan, texto) {
  return `<tr class="empty-row"><td colspan="${colspan}">${escapeHTML(texto)}</td></tr>`;
}

function mostrarEstadoNoEncontrado({ titulo, texto, accionTexto = "Volver al inicio", accionUrl = "index.html" }) {
  const heroTitle = document.querySelector(".page-hero h1");
  const heroText = document.querySelector(".page-hero p");
  const main = document.querySelector("main");
  if (heroTitle) heroTitle.textContent = titulo;
  if (heroText) heroText.textContent = texto;
  if (main) {
    main.innerHTML = `<section class="section"><div class="container">${renderEmptyState({ titulo, texto, accionTexto, accionUrl })}</div></section>`;
  }
}

function setBreadcrumbs(items = []) {
  const hero = document.querySelector(".page-hero");
  if (!hero || !items.length) return;

  let breadcrumbs = document.querySelector(".breadcrumbs");
  if (!breadcrumbs) {
    breadcrumbs = document.createElement("nav");
    breadcrumbs.className = "breadcrumbs";
    breadcrumbs.setAttribute("aria-label", "Ruta de navegación");
    hero.parentNode.insertBefore(breadcrumbs, hero);
  }

  breadcrumbs.innerHTML = `
    <div class="container breadcrumbs-inner">
      ${items.map((item, index) => {
        const isLast = index === items.length - 1;
        if (isLast || !item.url) return `<span class="breadcrumb-current">${escapeHTML(item.label)}</span>`;
        return `<a href="${item.url}">${escapeHTML(item.label)}</a><span class="breadcrumb-separator">›</span>`;
      }).join("")}
    </div>
  `;
}


function crearLinkCompetidor(competidor, textoFallback = "-") {
  if (!competidor || !competidor.competidor_id) return textoFallback;
  return `<a href="competidor.html?id=${competidor.competidor_id}">${competidor.competidor_nombre || textoFallback}</a>`;
}

function crearLinkCompetidorPorId(id, nombre) {
  if (!id) return nombre || "-";
  return `<a href="competidor.html?id=${id}">${nombre || id}</a>`;
}

function crearLinkCompetenciaPorId(id, nombre) {
  if (!id) return nombre || "-";
  return `<a href="competencia.html?id=${id}">${nombre || id}</a>`;
}

function formatearParticipantes(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return "-";
  return lista.map(item => crearLinkCompetidor(item)).join(" - ");
}

function ordenarPorFechaDesc(eventos) {
  return [...eventos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function obtenerNombreRanking(item) {
  return item?.nombre || item?.competidor_nombre || "";
}

function compararRankingCompetidores(a, b) {
  const titulosA = Number(a?.titulos || 0);
  const titulosB = Number(b?.titulos || 0);
  const subA = Number(a?.subcampeonatos || 0);
  const subB = Number(b?.subcampeonatos || 0);
  if (titulosB !== titulosA) return titulosB - titulosA;
  if (subB !== subA) return subB - subA;
  return obtenerNombreRanking(a).localeCompare(obtenerNombreRanking(b));
}

function contarMaximosGanadores(eventos) {
  const conteo = {};

  function asegurar(competidor) {
    if (!competidor?.competidor_id) return null;
    const id = competidor.competidor_id;
    if (!conteo[id]) {
      conteo[id] = {
        competidor_id: id,
        competidor_nombre: competidor.competidor_nombre,
        titulos: 0,
        finales: 0,
        subcampeonatos: 0,
        ultima_fecha_ganada: "",
        ultima_fecha_ganada_visible: "-",
        ultima_competencia_ganada: "-",
        ultima_competencia_ganada_id: ""
      };
    }
    return conteo[id];
  }

  eventos.forEach(evento => {
    (evento.ganadores || []).forEach(ganador => {
      const item = asegurar(ganador);
      if (!item) return;
      item.titulos += 1;
      item.finales += 1;
      if (!item.ultima_fecha_ganada || new Date(evento.fecha) > new Date(item.ultima_fecha_ganada)) {
        item.ultima_fecha_ganada = evento.fecha;
        item.ultima_fecha_ganada_visible = evento.fecha_visible;
        item.ultima_competencia_ganada = evento.competencia_nombre;
        item.ultima_competencia_ganada_id = evento.competencia_id;
      }
    });

    (evento.subcampeones || []).forEach(subcampeon => {
      const item = asegurar(subcampeon);
      if (!item) return;
      item.subcampeonatos += 1;
      item.finales += 1;
    });
  });

  return Object.values(conteo).sort(compararRankingCompetidores);
}


function obtenerCompetidoresUnicosDesdeEventos(eventos) {
  const competidores = new Map();

  eventos.forEach(evento => {
    [...(evento.ganadores || []), ...(evento.subcampeones || [])].forEach(competidor => {
      if (!competidor.competidor_id) return;
      competidores.set(competidor.competidor_id, competidor.competidor_nombre);
    });
  });

  return competidores;
}

function obtenerTemporadasDesdeEventos(eventos) {
  return [...new Set(
    eventos
      .map(evento => evento.fecha ? new Date(evento.fecha).getFullYear() : null)
      .filter(Boolean)
  )].sort((a, b) => a - b);
}

function renderMetricaHome(id, valor) {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  elemento.textContent = valor;
}

function actualizarMetricasHome(eventos) {
  const competenciasUnicas = new Set(eventos.map(evento => evento.competencia_id).filter(Boolean));
  const competidoresUnicos = obtenerCompetidoresUnicosDesdeEventos(eventos);
  const temporadas = obtenerTemporadasDesdeEventos(eventos);

  renderMetricaHome("home-total-competencias", competenciasUnicas.size);
  renderMetricaHome("home-total-eventos", eventos.length);
  renderMetricaHome("home-total-mcs", competidoresUnicos.size);
  renderMetricaHome(
    "home-temporada",
    temporadas.length === 1 ? temporadas[0] : `${temporadas[0]}-${temporadas[temporadas.length - 1]}`
  );
}

function actualizarFooterUltimaActualizacion(eventos) {
  const elemento = document.getElementById("footer-ultima-actualizacion");
  if (!elemento || !Array.isArray(eventos) || eventos.length === 0) return;
  const ultimoEvento = ordenarPorFechaDesc(eventos)[0];
  elemento.textContent = ultimoEvento?.fecha_visible || "-";
}

function renderUltimoEventoHome(evento) {
  if (!evento) {
    return `<div class="info-card"><p>Todavía no hay eventos registrados.</p></div>`;
  }

  return `
    <div class="home-last-event-card info-card highlight-card">
      <div>
        <div class="info-card-kicker">Último evento</div>
        <h3>${crearLinkCompetenciaPorId(evento.competencia_id, evento.competencia_nombre)}</h3>
        <p>${evento.fecha_visible} · ${evento.modalidad} · ${evento.relevancia} · ${evento.ubicacion}</p>
      </div>
      <div class="home-last-event-results">
        <div class="result-line">
          <span>🥇 Campeón</span>
          <strong>${formatearParticipantes(evento.ganadores)}</strong>
        </div>
        <div class="result-line">
          <span>🥈 Subcampeón</span>
          <strong>${formatearParticipantes(evento.subcampeones)}</strong>
        </div>
        <div class="home-last-event-actions">
          <a class="btn btn-primary" href="competencia.html?id=${evento.competencia_id}">Ver competencia</a>
        </div>
      </div>
    </div>
  `;
}

function renderPodioHTML(items, tituloFallback = "Sin datos") {
  const top3 = items.slice(0, 3);

  while (top3.length < 3) {
    top3.push({
      competidor_nombre: tituloFallback,
      titulos: 0,
      subcampeonatos: 0,
      ultima_fecha_ganada_visible: "-",
      ultima_competencia_ganada: "-",
      ultima_competencia_ganada_id: ""
    });
  }

  const cards = top3.map((item, index) => {
    const place = index + 1;
    const medals = ["🥇", "🥈", "🥉"];
    const classes = ["podium-first", "podium-second", "podium-third"];
    return `
      <div class="podium-card ${classes[index]}">
        <div class="podium-medal">${medals[index]}</div>
        <div class="podium-place">${place}°</div>
        <div class="podium-name">${crearLinkCompetidorPorId(item.competidor_id, item.competidor_nombre)}</div>
        <div class="podium-stat">${item.titulos} títulos</div>
        <div class="podium-sub">${item.subcampeonatos || 0} subcampeonatos</div>
        <div class="podium-sub">Última victoria: ${item.ultima_fecha_ganada_visible}</div>
        <div class="podium-sub">En: ${item.ultima_competencia_ganada}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="podium podium-ordered" aria-label="Podio ordenado por títulos, subcampeonatos y orden alfabético">
      ${cards}
    </div>
  `;
}

function renderPodioRankingHTML(items) {
  return renderPodioHTML(items, "Sin datos");
}

function resumirCompetencias(competencias, eventos) {
  return competencias.map(competencia => {
    const eventosCompetencia = eventos.filter(e => e.competencia_id === competencia.id);
    const eventosOrdenados = ordenarPorFechaDesc(eventosCompetencia);

    const campeonesDistintos = new Set();
    eventosCompetencia.forEach(evento => {
      (evento.ganadores || []).forEach(ganador => {
        campeonesDistintos.add(ganador.competidor_id);
      });
    });

    return {
      ...competencia,
      fechas: eventosCompetencia.length,
      campeones_distintos: campeonesDistintos.size,
      fecha_ultima_compe: eventosOrdenados[0]?.fecha || "",
      fecha_ultima_compe_visible: eventosOrdenados[0]?.fecha_visible || "-"
    };
  });
}

function renderTablaCompetenciasResumen(items) {
  if (!items.length) return renderEmptyRow(6, "Todavía no hay competencias registradas.");

  return items.map(item => `
    <tr>
      <td><strong><a href="competencia.html?id=${item.id}">${item.nombre}</a></strong></td>
      <td>${item.fechas}</td>
      <td>${item.campeones_distintos}</td>
      <td class="col-date">${item.fecha_ultima_compe_visible}</td>
      <td class="col-day">${item.dia_habitual || "-"}</td>
      <td class="col-location">${item.zona || item.ciudad || "-"}</td>
    </tr>
  `).join("");
}

function renderTablaEventos(items, mostrarCompetencia = true) {
  if (!items.length) return renderEmptyRow(mostrarCompetencia ? 7 : 6, "Todavía no hay eventos registrados.");

  return items.map(item => `
    <tr>
      ${mostrarCompetencia ? `<td><strong><a href="competencia.html?id=${item.competencia_id}">${item.competencia_nombre}</a></strong></td>` : ""}
      <td>${item.fecha_visible}</td>
      <td>${formatearParticipantes(item.ganadores)}</td>
      <td>${formatearParticipantes(item.subcampeones)}</td>
      <td>${item.modalidad}</td>
      <td>${item.relevancia}</td>
      <td class="col-location">${item.ubicacion || "-"}</td>
    </tr>
  `).join("");
}

function renderPaginacion(totalItems, pageSize, currentPage) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return "";

  const maxButtons = 7;
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);

  let html = `<div class="pagination" role="navigation" aria-label="Paginación de tabla">`;
  html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>Anterior</button>`;

  if (start > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`;
    if (start > 2) html += `<span class="pagination-ellipsis">…</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === currentPage ? "active" : ""}" data-page="${i}" aria-current="${i === currentPage ? "page" : "false"}">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span class="pagination-ellipsis">…</span>`;
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>Siguiente</button>`;
  html += `<span class="pagination-info">Página ${currentPage} de ${totalPages}</span>`;
  html += `</div>`;
  return html;
}

function obtenerContenedorPaginacion(tbody) {
  const tableCard = tbody.closest(".table-card");
  if (!tableCard) return null;
  let container = tableCard.nextElementSibling;
  if (!container || !container.classList || !container.classList.contains("pagination-container")) {
    container = document.createElement("div");
    container.className = "pagination-container";
    tableCard.insertAdjacentElement("afterend", container);
  }
  return container;
}

function renderTablaPaginada(tbody, items, renderRows, { pageSize = 10, emptyHTML = "" } = {}) {
  if (!tbody) return;
  const paginationContainer = obtenerContenedorPaginacion(tbody);
  let currentPage = 1;

  function render() {
    if (!Array.isArray(items) || items.length === 0) {
      tbody.innerHTML = emptyHTML || renderRows([]);
      if (paginationContainer) paginationContainer.innerHTML = "";
      return;
    }

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    tbody.innerHTML = renderRows(pageItems, start);

    if (paginationContainer) {
      paginationContainer.innerHTML = renderPaginacion(items.length, pageSize, currentPage);
      paginationContainer.querySelectorAll(".page-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const nextPage = Number(btn.dataset.page);
          if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
          currentPage = nextPage;
          render();
        });
      });
    }
  }

  render();
}

/* =========================
   COMPETENCIAS.HTML
========================= */

async function initCompetenciasPage() {
  const resumenBody = document.getElementById("tabla-competencias-resumen");
  const eventosBody = document.getElementById("tabla-eventos-general");
  const podioContainer = document.getElementById("podio-general");
  if (!resumenBody || !eventosBody || !podioContainer) return;

  setBreadcrumbs([
    { label: "Inicio", url: "index.html" },
    { label: "Competencias" }
  ]);

  const competencias = await cargarJSON("./data/competencias.json");
  const eventos = ordenarPorFechaDesc(await cargarJSON("./data/eventos.json"));
  actualizarFooterUltimaActualizacion(eventos);

  const resumen = resumirCompetencias(competencias, eventos)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  renderTablaPaginada(resumenBody, resumen, (items) => renderTablaCompetenciasResumen(items), { pageSize: 10, emptyHTML: renderEmptyRow(6, "Todavía no hay competencias registradas.") });

  const maximosGanadores = contarMaximosGanadores(eventos);
  podioContainer.innerHTML = renderPodioHTML(maximosGanadores);

  renderTablaPaginada(eventosBody, eventos, (items) => renderTablaEventos(items, true), {
    pageSize: 10,
    emptyHTML: renderEmptyRow(7, "Todavía no hay eventos registrados.")
  });
}

/* =========================
   SERVICIO ESTADISTICAS COMPETENCIAS
========================= */

function obtenerEventosCompetencia(eventos, competenciaId) {
  return ordenarPorFechaDesc(eventos.filter(evento => evento.competencia_id === competenciaId));
}

function obtenerCompetidoresCompetencia(eventosCompetencia) {
  const competidores = new Map();

  eventosCompetencia.forEach(evento => {
    [...(evento.ganadores || []), ...(evento.subcampeones || [])].forEach(competidor => {
      if (!competidor?.competidor_id) return;
      competidores.set(competidor.competidor_id, competidor.competidor_nombre);
    });
  });

  return competidores;
}

function generarRankingCompetencia(eventosCompetencia) {
  const ranking = new Map();

  function asegurarCompetidor(competidor) {
    if (!competidor?.competidor_id) return null;

    if (!ranking.has(competidor.competidor_id)) {
      ranking.set(competidor.competidor_id, {
        id: competidor.competidor_id,
        nombre: competidor.competidor_nombre,
        titulos: 0,
        finales: 0,
        subcampeonatos: 0,
        ultima_final: "",
        ultima_final_visible: "-"
      });
    }

    return ranking.get(competidor.competidor_id);
  }

  eventosCompetencia.forEach(evento => {
    (evento.ganadores || []).forEach(competidor => {
      const item = asegurarCompetidor(competidor);
      if (!item) return;
      item.titulos += 1;
      item.finales += 1;
      if (!item.ultima_final || new Date(evento.fecha) > new Date(item.ultima_final)) {
        item.ultima_final = evento.fecha;
        item.ultima_final_visible = evento.fecha_visible;
      }
    });

    (evento.subcampeones || []).forEach(competidor => {
      const item = asegurarCompetidor(competidor);
      if (!item) return;
      item.subcampeonatos += 1;
      item.finales += 1;
      if (!item.ultima_final || new Date(evento.fecha) > new Date(item.ultima_final)) {
        item.ultima_final = evento.fecha;
        item.ultima_final_visible = evento.fecha_visible;
      }
    });
  });

  return [...ranking.values()].sort(compararRankingCompetidores);
}

function obtenerRecordDesdeRanking(ranking, campo) {
  const items = ranking.filter(item => Number(item[campo]) > 0);
  if (items.length === 0) return null;

  return [...items].sort((a, b) => {
    if (b[campo] !== a[campo]) return b[campo] - a[campo];
    return compararRankingCompetidores(a, b);
  })[0];
}

function crearMetrica(label, valor, detalle = "") {
  return `
    <div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${valor}</div>
      ${detalle ? `<div class="metric-detail">${detalle}</div>` : ""}
    </div>
  `;
}

function renderUltimoEventoCompetencia(evento) {
  if (!evento) {
    return `<div class="info-card"><p>No hay eventos registrados todavía.</p></div>`;
  }

  return `
    <div class="info-card highlight-card">
      <div class="info-card-kicker">Último evento registrado</div>
      <h3>${evento.fecha_visible}</h3>
      <p>${evento.modalidad} · ${evento.relevancia} · ${evento.ubicacion}</p>
      <div class="result-line">
        <span>🥇 Campeón</span>
        <strong>${formatearParticipantes(evento.ganadores)}</strong>
      </div>
      <div class="result-line">
        <span>🥈 Subcampeón</span>
        <strong>${formatearParticipantes(evento.subcampeones)}</strong>
      </div>
    </div>
  `;
}

function renderRecordsCompetencia(ranking) {
  const mayorCampeon = obtenerRecordDesdeRanking(ranking, "titulos");
  const mayorFinalista = obtenerRecordDesdeRanking(ranking, "finales");
  const mayorSubcampeon = obtenerRecordDesdeRanking(ranking, "subcampeonatos");

  const records = [
    { titulo: "Más títulos", item: mayorCampeon, campo: "titulos", sufijo: "títulos" },
    { titulo: "Más finales", item: mayorFinalista, campo: "finales", sufijo: "finales" },
    { titulo: "Más subcampeonatos", item: mayorSubcampeon, campo: "subcampeonatos", sufijo: "subcampeonatos" }
  ];

  return records.map(record => `
    <div class="info-card record-card">
      <div class="info-card-kicker">${record.titulo}</div>
      <h3>${record.item ? crearLinkCompetidorPorId(record.item.id, record.item.nombre) : "Sin datos"}</h3>
      <p>${record.item ? `${record.item[record.campo]} ${record.sufijo}` : "Todavía no hay registros suficientes."}</p>
    </div>
  `).join("");
}

function renderRankingCompetencia(ranking) {
  if (ranking.length === 0) {
    return renderEmptyRow(6, "Todavía no hay datos para esta competencia.");
  }

  return ranking.map((item, index) => {
    const efectividad = item.finales > 0 ? Math.round((item.titulos / item.finales) * 100) : 0;

    return `
      <tr>
        <td><strong>#${index + 1}</strong></td>
        <td><strong>${crearLinkCompetidorPorId(item.id, item.nombre)}</strong></td>
        <td>${item.titulos}</td>
        <td>${item.finales}</td>
        <td>${item.subcampeonatos}</td>
        <td>${efectividad}%</td>
      </tr>
    `;
  }).join("");
}

function renderCampeonesHistoricos(eventosCompetencia) {
  if (eventosCompetencia.length === 0) {
    return renderEmptyRow(5, "Todavía no hay campeones registrados.");
  }

  return eventosCompetencia.map(evento => `
    <tr>
      <td>${evento.fecha_visible}</td>
      <td>${formatearParticipantes(evento.ganadores)}</td>
      <td>${formatearParticipantes(evento.subcampeones)}</td>
      <td>${evento.modalidad}</td>
      <td>${evento.relevancia}</td>
    </tr>
  `).join("");
}

/* =========================
   COMPETENCIA.HTML
========================= */

async function initCompetenciaPage() {
  const nombre = document.getElementById("competencia-nombre");
  const frase = document.getElementById("competencia-frase");
  const metricas = document.getElementById("competencia-metricas");
  const tabla = document.getElementById("competencia-tabla");
  const historial = document.getElementById("competencia-historial");
  const podio = document.getElementById("podio-competencia");
  const ultimoEvento = document.getElementById("competencia-ultimo-evento");
  const records = document.getElementById("competencia-records");
  const rankingBody = document.getElementById("competencia-ranking");

  if (!nombre || !frase || !metricas || !tabla || !historial || !podio) return;

  const competenciaId = obtenerParametro("id");
  setBreadcrumbs([
    { label: "Inicio", url: "index.html" },
    { label: "Competencias", url: "competencias.html" },
    { label: competenciaId || "Competencia" }
  ]);

  const competencias = await cargarJSON("./data/competencias.json");
  const eventos = await cargarJSON("./data/eventos.json");
  const eventosOrdenados = ordenarPorFechaDesc(eventos);
  actualizarFooterUltimaActualizacion(eventosOrdenados);

  const competencia = competencias.find(c => c.id === competenciaId);
  const eventosCompetencia = obtenerEventosCompetencia(eventosOrdenados, competenciaId);

  if (!competencia || eventosCompetencia.length === 0) {
    document.title = "Competencia no encontrada | Quiero Freestyle Stats";
    setBreadcrumbs([
      { label: "Inicio", url: "index.html" },
      { label: "Competencias", url: "competencias.html" },
      { label: "No encontrada" }
    ]);
    mostrarEstadoNoEncontrado({
      titulo: "Competencia no encontrada",
      texto: "No encontramos eventos registrados para esta competencia. Puede que el enlace esté incompleto o que todavía no haya datos cargados.",
      accionTexto: "Ver competencias",
      accionUrl: "competencias.html"
    });
    return;
  }

  const competidoresUnicos = obtenerCompetidoresCompetencia(eventosCompetencia);
  const rankingCompetencia = generarRankingCompetencia(eventosCompetencia);
  const campeonesDistintos = rankingCompetencia.filter(item => item.titulos > 0).length;
  const ultimaFecha = eventosCompetencia[0];
  const primeraFecha = [...eventosCompetencia].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];
  const modalidades = new Set(eventosCompetencia.map(evento => evento.modalidad_base || evento.modalidad).filter(Boolean));

  document.title = `${competencia.nombre} | Quiero Freestyle Stats`;
  setBreadcrumbs([
    { label: "Inicio", url: "index.html" },
    { label: "Competencias", url: "competencias.html" },
    { label: competencia.nombre }
  ]);
  nombre.textContent = competencia.nombre;
  frase.textContent = `${eventosCompetencia.length} eventos registrados, ${campeonesDistintos} campeones distintos y ranking histórico propio.`;

  metricas.innerHTML = [
    crearMetrica("Eventos", eventosCompetencia.length, "Fechas registradas"),
    crearMetrica("Competidores", competidoresUnicos.size, "MCs con finales"),
    crearMetrica("Campeones", campeonesDistintos, "Ganadores distintos"),
    crearMetrica("Desde", primeraFecha ? new Date(primeraFecha.fecha).getFullYear() : "-", primeraFecha?.fecha_visible || "-")
  ].join("");

  tabla.innerHTML = `
    <tr><td><strong>Nombre</strong></td><td>${competencia.nombre}</td></tr>
    <tr><td><strong>Zona</strong></td><td>${competencia.zona || "Alta Gracia"}</td></tr>
    <tr><td><strong>Día habitual</strong></td><td>${competencia.dia_habitual || "-"}</td></tr>
    <tr><td><strong>Modalidades registradas</strong></td><td>${[...modalidades].join(" · ") || "-"}</td></tr>
    <tr><td><strong>Primera fecha cargada</strong></td><td>${primeraFecha?.fecha_visible || "-"}</td></tr>
    <tr><td><strong>Última fecha cargada</strong></td><td>${ultimaFecha?.fecha_visible || "-"}</td></tr>
  `;

  const topCompetencia = rankingCompetencia.map(item => ({
    competidor_id: item.id,
    competidor_nombre: item.nombre,
    titulos: item.titulos,
    ultima_fecha_ganada_visible: item.ultima_final_visible,
    ultima_competencia_ganada: competencia.nombre,
    ultima_competencia_ganada_id: competencia.id
  }));

  podio.innerHTML = renderPodioHTML(topCompetencia);
  if (ultimoEvento) ultimoEvento.innerHTML = renderUltimoEventoCompetencia(ultimaFecha);
  if (records) records.innerHTML = renderRecordsCompetencia(rankingCompetencia);
  if (rankingBody) {
    renderTablaPaginada(rankingBody, rankingCompetencia, (items, startIndex) => {
      if (items.length === 0) return renderEmptyRow(6, "Todavía no hay datos para esta competencia.");
      return items.map((item, index) => {
        const efectividad = item.finales > 0 ? Math.round((item.titulos / item.finales) * 100) : 0;
        return `
          <tr>
            <td><strong>#${startIndex + index + 1}</strong></td>
            <td><strong>${crearLinkCompetidorPorId(item.id, item.nombre)}</strong></td>
            <td>${item.titulos}</td>
            <td>${item.finales}</td>
            <td>${item.subcampeonatos}</td>
            <td>${efectividad}%</td>
          </tr>
        `;
      }).join("");
    }, { pageSize: 10, emptyHTML: renderEmptyRow(6, "Todavía no hay datos para esta competencia.") });
  }
  if (historial) {
    renderTablaPaginada(historial, eventosCompetencia, (items) => renderCampeonesHistoricos(items), {
      pageSize: 10,
      emptyHTML: renderEmptyRow(5, "Todavía no hay campeones registrados.")
    });
  }
}



/* =========================
   COMPETIDOR.HTML
========================= */

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizarBusqueda(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function crearItemBusqueda({ tipo, nombre, detalle, url }) {
  const icono = tipo === "competidor" ? "🎤" : "🏆";
  const etiqueta = tipo === "competidor" ? "Competidor" : "Competencia";

  return `
    <a class="search-result-item" href="${url}">
      <span class="search-result-icon">${icono}</span>
      <span class="search-result-content">
        <strong>${escapeHTML(nombre)}</strong>
        <small>${etiqueta}${detalle ? ` · ${escapeHTML(detalle)}` : ""}</small>
      </span>
    </a>
  `;
}

function prepararDatosBuscador(competidores, competencias, eventos) {
  const competidoresDesdeEventos = generarEstadisticasCompetidores(eventos, competidores);

  const itemsCompetidores = competidoresDesdeEventos.map(competidor => ({
    tipo: "competidor",
    nombre: competidor.nombre,
    detalle: `${competidor.titulos} títulos · ${competidor.finales} finales`,
    url: `competidor.html?id=${competidor.id}`,
    busqueda: normalizarBusqueda(`${competidor.nombre} ${competidor.id} ${competidor.slug || ""}`),
    relevancia: competidor.titulos * 10 + competidor.finales
  }));

  const resumenCompetencias = resumirCompetencias(competencias, eventos);
  const itemsCompetencias = resumenCompetencias.map(competencia => ({
    tipo: "competencia",
    nombre: competencia.nombre,
    detalle: `${competencia.fechas} fechas · ${competencia.zona || "Alta Gracia"}`,
    url: `competencia.html?id=${competencia.id}`,
    busqueda: normalizarBusqueda(`${competencia.nombre} ${competencia.id} ${competencia.slug || ""} ${competencia.zona || ""}`),
    relevancia: competencia.fechas
  }));

  return [...itemsCompetidores, ...itemsCompetencias];
}

function initBuscadorGlobal(competidores, competencias, eventos) {
  const input = document.getElementById("global-search-input");
  const results = document.getElementById("global-search-results");

  if (!input || !results) return;

  const items = prepararDatosBuscador(competidores, competencias, eventos);

  function renderResultados() {
    const termino = normalizarBusqueda(input.value);

    if (termino.length < 2) {
      results.innerHTML = `<div class="search-empty">Escribí al menos 2 letras para buscar MCs o competencias.</div>`;
      return;
    }

    const encontrados = items
      .filter(item => item.busqueda.includes(termino))
      .sort((a, b) => {
        const aEmpieza = a.busqueda.startsWith(termino) ? 1 : 0;
        const bEmpieza = b.busqueda.startsWith(termino) ? 1 : 0;
        if (bEmpieza !== aEmpieza) return bEmpieza - aEmpieza;
        if (b.relevancia !== a.relevancia) return b.relevancia - a.relevancia;
        return a.nombre.localeCompare(b.nombre);
      })
      .slice(0, 8);

    if (encontrados.length === 0) {
      const terminoVisible = input.value.length > 60 ? `${input.value.slice(0, 60)}...` : input.value;
      results.innerHTML = `<div class="search-empty">No encontré resultados para "${escapeHTML(terminoVisible)}".</div>`;
      return;
    }

    results.innerHTML = encontrados.map(crearItemBusqueda).join("");
  }

  input.addEventListener("input", renderResultados);
  input.addEventListener("focus", renderResultados);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      results.innerHTML = "";
      input.blur();
    }
  });
}

function competidorParticipaEnLista(lista, competidorId) {
  return (lista || []).some(item => item.competidor_id === competidorId);
}

function obtenerResultadosCompetidor(eventos, competidorId) {
  return ordenarPorFechaDesc(eventos)
    .map(evento => {
      const fueCampeon = competidorParticipaEnLista(evento.ganadores, competidorId);
      const fueSubcampeon = competidorParticipaEnLista(evento.subcampeones, competidorId);

      if (!fueCampeon && !fueSubcampeon) return null;

      return {
        ...evento,
        resultado: fueCampeon ? "Campeón" : "Subcampeón",
        instancia: fueCampeon ? "Final ganada" : "Final perdida"
      };
    })
    .filter(Boolean);
}

function contarPorCampo(items, campo) {
  return items.reduce((acc, item) => {
    const clave = item[campo] || "Sin dato";
    acc[clave] = (acc[clave] || 0) + 1;
    return acc;
  }, {});
}

function obtenerClaveMayor(conteo) {
  const entries = Object.entries(conteo);
  if (entries.length === 0) return "-";

  return entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  })[0][0];
}

function calcularTitulosDesdeEventos(resultados) {
  const titulos = {
    total: 0,
    oneVsOne: 0,
    duplas: 0,
    trios: 0,
    especiales: 0
  };

  resultados.forEach(resultado => {
    if (resultado.resultado !== "Campeón") return;

    titulos.total += 1;

    const modalidadBase = (resultado.modalidad_base || resultado.modalidad || "").toLowerCase();
    const modalidad = (resultado.modalidad || "").toLowerCase();

    if (modalidadBase === "1vs1" || modalidad.includes("1vs1")) {
      titulos.oneVsOne += 1;
    } else if (modalidadBase === "2vs2" || modalidad.includes("2vs2")) {
      titulos.duplas += 1;
    } else if (modalidadBase === "3vs3" || modalidad.includes("3vs3")) {
      titulos.trios += 1;
    } else {
      titulos.especiales += 1;
    }
  });

  return titulos;
}



function crearPerfilBaseCompetidor(id, nombre = "") {
  return {
    id,
    nombre: nombre || id,
    slug: id,
    activo: true,
    zona: "-",
    pais: "Argentina",
    frase: "",
    estilo: ""
  };
}

function fusionarPerfilCompetidor(perfilBase, perfilManual = {}) {
  return {
    ...perfilBase,
    ...perfilManual,
    id: perfilBase.id,
    nombre: perfilManual.nombre || perfilBase.nombre,
    slug: perfilManual.slug || perfilBase.slug || perfilBase.id
  };
}

function clasificarTituloPorModalidad(evento) {
  const modalidadBase = (evento.modalidad_base || evento.modalidad || "").toLowerCase();
  const modalidad = (evento.modalidad || "").toLowerCase();

  if (modalidadBase === "1vs1" || modalidad.includes("1vs1")) return "oneVsOne";
  if (modalidadBase === "2vs2" || modalidad.includes("2vs2")) return "duplas";
  if (modalidadBase === "3vs3" || modalidad.includes("3vs3")) return "trios";
  return "especiales";
}

function generarEstadisticasCompetidores(eventos, perfilesManuales = []) {
  const perfilesPorId = new Map((perfilesManuales || []).map(perfil => [perfil.id, perfil]));
  const estadisticas = new Map();

  function asegurarCompetidor(competidor) {
    if (!competidor?.competidor_id) return null;

    const id = competidor.competidor_id;
    const perfilBase = crearPerfilBaseCompetidor(id, competidor.competidor_nombre);
    const perfil = fusionarPerfilCompetidor(perfilBase, perfilesPorId.get(id));

    if (!estadisticas.has(id)) {
      estadisticas.set(id, {
        ...perfil,
        titulos: 0,
        titulos_1vs1: 0,
        titulos_duplas: 0,
        titulos_trios: 0,
        titulos_especiales: 0,
        finales: 0,
        subcampeonatos: 0,
        ultima_fecha_ganada: "",
        ultima_fecha_ganada_visible: "-",
        ultima_competencia_ganada: "-",
        ultima_competencia_ganada_id: ""
      });
    } else {
      estadisticas.set(id, fusionarPerfilCompetidor(estadisticas.get(id), perfilesPorId.get(id)));
    }

    return estadisticas.get(id);
  }

  eventos.forEach(evento => {
    (evento.ganadores || []).forEach(competidor => {
      const item = asegurarCompetidor(competidor);
      if (!item) return;

      item.titulos += 1;
      item.finales += 1;

      const categoria = clasificarTituloPorModalidad(evento);
      if (categoria === "oneVsOne") item.titulos_1vs1 += 1;
      if (categoria === "duplas") item.titulos_duplas += 1;
      if (categoria === "trios") item.titulos_trios += 1;
      if (categoria === "especiales") item.titulos_especiales += 1;

      if (!item.ultima_fecha_ganada || new Date(evento.fecha) > new Date(item.ultima_fecha_ganada)) {
        item.ultima_fecha_ganada = evento.fecha;
        item.ultima_fecha_ganada_visible = evento.fecha_visible;
        item.ultima_competencia_ganada = evento.competencia_nombre;
        item.ultima_competencia_ganada_id = evento.competencia_id;
      }
    });

    (evento.subcampeones || []).forEach(competidor => {
      const item = asegurarCompetidor(competidor);
      if (!item) return;
      item.finales += 1;
      item.subcampeonatos += 1;
    });
  });

  return [...estadisticas.values()].sort(compararRankingCompetidores);
}

function buscarCompetidorEnEstadisticas(estadisticas, parametro) {
  const valor = normalizarTexto(parametro);
  return estadisticas.find(c =>
    c.id === parametro ||
    c.slug === parametro ||
    normalizarTexto(c.nombre) === valor ||
    normalizarTexto(c.slug) === valor
  );
}

function renderHistorialCompetidor(resultados) {
  if (resultados.length === 0) {
    return renderEmptyRow(4, "Todavía no hay resultados cargados para este competidor.");
  }

  return resultados.map(item => `
    <tr>
      <td><strong><a href="competencia.html?id=${item.competencia_id}">${item.competencia_nombre}</a></strong></td>
      <td>${item.resultado}</td>
      <td>${item.modalidad} · ${item.relevancia}</td>
      <td>${item.fecha_visible}</td>
    </tr>
  `).join("");
}

async function initCompetidorPage() {
  const nombre = document.getElementById("competidor-nombre");
  const frase = document.getElementById("competidor-frase");
  const metricas = document.getElementById("competidor-metricas");
  const tabla = document.getElementById("competidor-tabla");
  const historial = document.getElementById("competidor-historial");

  if (!nombre || !frase || !metricas || !tabla || !historial) return;

  const competidorId = obtenerParametro("id");
  setBreadcrumbs([
    { label: "Inicio", url: "index.html" },
    { label: "Competidores", url: "ranking.html" },
    { label: competidorId || "Competidor" }
  ]);

  const perfilesManuales = await cargarJSON("./data/competidores.json");
  const eventos = await cargarJSON("./data/eventos.json");
  actualizarFooterUltimaActualizacion(eventos);
  const estadisticas = generarEstadisticasCompetidores(eventos, perfilesManuales);
  const competidor = buscarCompetidorEnEstadisticas(estadisticas, competidorId);

  if (!competidor) {
    document.title = "Competidor no encontrado | Quiero Freestyle Stats";
    setBreadcrumbs([
      { label: "Inicio", url: "index.html" },
      { label: "Competidores", url: "ranking.html" },
      { label: "No encontrado" }
    ]);
    mostrarEstadoNoEncontrado({
      titulo: "Competidor no encontrado",
      texto: "No encontramos estadísticas para este competidor. Puede que el enlace esté incompleto o que todavía no haya participado en finales registradas.",
      accionTexto: "Ver ranking",
      accionUrl: "ranking.html"
    });
    return;
  }

  const resultados = obtenerResultadosCompetidor(eventos, competidor.id);
  const finales = competidor.finales;
  const efectividad = finales > 0 ? Math.round((competidor.titulos / finales) * 100) : 0;
  const ultimaParticipacion = resultados[0];
  const ultimoTitulo = resultados.find(r => r.resultado === "Campeón");
  const competenciaMasFrecuente = obtenerClaveMayor(contarPorCampo(resultados, "competencia_nombre"));
  const modalidadMasFrecuente = obtenerClaveMayor(contarPorCampo(resultados, "modalidad"));

  document.title = `${competidor.nombre} | Quiero Freestyle Stats`;
  setBreadcrumbs([
    { label: "Inicio", url: "index.html" },
    { label: "Competidores", url: "ranking.html" },
    { label: competidor.nombre }
  ]);
  nombre.textContent = competidor.nombre;
  frase.textContent = competidor.frase || `Perfil estadístico de ${competidor.nombre} en competencias de Alta Gracia durante 2026.`;

  metricas.innerHTML = `
    <div class="metric">
      <div class="metric-label">Títulos 2026</div>
      <div class="metric-value">${competidor.titulos}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Finales</div>
      <div class="metric-value">${finales}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Subcampeonatos</div>
      <div class="metric-value">${competidor.subcampeonatos}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Efectividad en finales</div>
      <div class="metric-value">${efectividad}%</div>
    </div>
  `;

  tabla.innerHTML = `
    <tr><td><strong>Nombre</strong></td><td>${competidor.nombre}</td></tr>
    <tr><td><strong>Zona</strong></td><td>${competidor.zona || "-"}</td></tr>
    <tr><td><strong>País</strong></td><td>${competidor.pais || "-"}</td></tr>
    <tr><td><strong>Títulos 1vs1</strong></td><td>${competidor.titulos_1vs1}</td></tr>
    <tr><td><strong>Títulos 2vs2</strong></td><td>${competidor.titulos_duplas}</td></tr>
    <tr><td><strong>Títulos 3vs3</strong></td><td>${competidor.titulos_trios}</td></tr>
    <tr><td><strong>Títulos en otros formatos</strong></td><td>${competidor.titulos_especiales}</td></tr>
    <tr><td><strong>Competencia con más finales</strong></td><td>${competenciaMasFrecuente}</td></tr>
    <tr><td><strong>Modalidad con más finales</strong></td><td>${modalidadMasFrecuente}</td></tr>
    <tr><td><strong>Última final</strong></td><td>${ultimaParticipacion ? `${ultimaParticipacion.fecha_visible} · ${crearLinkCompetenciaPorId(ultimaParticipacion.competencia_id, ultimaParticipacion.competencia_nombre)}` : "-"}</td></tr>
    <tr><td><strong>Último título</strong></td><td>${ultimoTitulo ? `${ultimoTitulo.fecha_visible} · ${crearLinkCompetenciaPorId(ultimoTitulo.competencia_id, ultimoTitulo.competencia_nombre)}` : "-"}</td></tr>
  `;

  renderTablaPaginada(historial, resultados, (items) => renderHistorialCompetidor(items), {
    pageSize: 10,
    emptyHTML: renderEmptyRow(4, "Todavía no hay resultados cargados para este competidor.")
  });
}

/* =========================
   INDEX.HTML
========================= */

async function initIndexPage() {
  const tablaEventos = document.getElementById("tabla-index-eventos");
  const tablaLideres = document.getElementById("tabla-index-lideres");
  const ultimoEventoHome = document.getElementById("home-ultimo-evento");

  if (!tablaEventos || !tablaLideres) return;

  const eventos = ordenarPorFechaDesc(await cargarJSON("./data/eventos.json"));
  const perfilesManuales = await cargarJSON("./data/competidores.json");
  const competencias = await cargarJSON("./data/competencias.json");
  const lideres = generarEstadisticasCompetidores(eventos, perfilesManuales).slice(0, 10);

  initBuscadorGlobal(perfilesManuales, competencias, eventos);
  actualizarMetricasHome(eventos);
  actualizarFooterUltimaActualizacion(eventos);

  const ultimos5 = eventos.slice(0, 5);

  if (ultimoEventoHome) {
    ultimoEventoHome.innerHTML = renderUltimoEventoHome(eventos[0]);
  }

  tablaEventos.innerHTML = ultimos5.length ? ultimos5.map(item => `
    <tr>
      <td><strong><a href="competencia.html?id=${item.competencia_id}">${item.competencia_nombre}</a></strong></td>
      <td>${item.fecha_visible}</td>
      <td>${formatearParticipantes(item.ganadores)}</td>
      <td>${formatearParticipantes(item.subcampeones)}</td>
      <td>${item.modalidad}</td>
      <td>${item.relevancia}</td>
      <td class="col-location">${item.ubicacion || "-"}</td>
    </tr>
  `).join("") : renderEmptyRow(7, "Todavía no hay eventos registrados.");

  tablaLideres.innerHTML = lideres.length ? lideres.map((item, index) => `
    <tr>
      <td><strong>#${index + 1}</strong></td>
      <td><strong><a href="competidor.html?id=${item.id}">${item.nombre}</a></strong></td>
      <td>${item.titulos_1vs1}</td>
      <td>${item.titulos}</td>
    </tr>
  `).join("") : renderEmptyRow(4, "Todavía no hay competidores registrados.");
}

/* =========================
   RANKING.HTML
========================= */

async function initRankingPage() {
  const tablaRanking = document.getElementById("tabla-ranking-completo");
  const podioContainer = document.getElementById("podio-ranking");

  if (!tablaRanking) return;

  setBreadcrumbs([
    { label: "Inicio", url: "index.html" },
    { label: "Competidores" }
  ]);

  const perfilesManuales = await cargarJSON("./data/competidores.json");
  const eventos = ordenarPorFechaDesc(await cargarJSON("./data/eventos.json"));
  actualizarFooterUltimaActualizacion(eventos);
  const ranking = generarEstadisticasCompetidores(eventos, perfilesManuales);

  if (podioContainer) {
    const dataPodio = ranking.map(item => ({
      competidor_id: item.id,
      competidor_nombre: item.nombre,
      titulos: item.titulos,
      ultima_fecha_ganada_visible: item.ultima_fecha_ganada_visible,
      ultima_competencia_ganada: item.ultima_competencia_ganada,
      ultima_competencia_ganada_id: item.ultima_competencia_ganada_id
    }));

    podioContainer.innerHTML = renderPodioRankingHTML(dataPodio.slice(0, 3));
  }

  renderTablaPaginada(tablaRanking, ranking, (items, startIndex) => {
    if (!items.length) return renderEmptyRow(7, "Todavía no hay competidores registrados.");
    return items.map((item, index) => `
      <tr>
        <td><strong>#${startIndex + index + 1}</strong></td>
        <td><strong><a href="competidor.html?id=${item.id}">${item.nombre}</a></strong></td>
        <td class="col-location">${item.zona || item.ciudad || "-"}</td>
        <td>${item.titulos_1vs1}</td>
        <td>${item.titulos_duplas}</td>
        <td>${item.titulos_trios}</td>
        <td>${item.titulos}</td>
      </tr>
    `).join("");
  }, { pageSize: 12, emptyHTML: renderEmptyRow(7, "Todavía no hay competidores registrados.") });
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  crearLoaderGlobal();
  try {
    await initIndexPage();
    await initCompetenciasPage();
    await initCompetenciaPage();
    await initRankingPage();
    await initCompetidorPage();
  } catch (error) {
    console.error(error);
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `<section class="section"><div class="container">${renderEmptyState({
        titulo: "No pudimos cargar los datos",
        texto: "Hubo un problema leyendo los archivos de estadísticas. Revisá que los JSON estén publicados correctamente.",
        accionTexto: "Volver al inicio",
        accionUrl: "index.html"
      })}</div></section>`;
    }
  } finally {
    ocultarLoaderGlobal();
  }
});