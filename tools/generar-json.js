#!/usr/bin/env node

/**
 * Quiero Freestyle Stats - Generador de datos
 *
 * Uso recomendado:
 * 1) Google Sheets -> Archivo -> Descargar -> Valores separados por comas (.csv)
 * 2) Guardar el archivo como: imports/datos-2026.csv
 * 3) Ejecutar: node tools/generar-json.js
 *
 * También se puede pasar una ruta personalizada:
 * node tools/generar-json.js ./imports/mi-archivo.csv
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CSV_PATH = path.join(PROJECT_ROOT, 'imports', 'datos-2026.csv');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const CSV_PATH = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : DEFAULT_CSV_PATH;

const CONFIG = {
  temporada: 2026,
  ubicacionDefault: 'Alta Gracia',
  columnas: {
    fecha: 'Fecha',
    competencia: 'Compe',
    campeon: 'Campeón',
    subcampeon: 'Segundo',
    modalidad: 'Modalidad',
    tipo: 'Tipo de compe'
  }
};

function main() {
  assertFileExists(CSV_PATH, `No se encontró el CSV: ${CSV_PATH}`);
  assertDirectoryExists(DATA_DIR, `No se encontró la carpeta data: ${DATA_DIR}`);

  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csv).filter(row => row.some(cell => String(cell).trim() !== ''));

  if (rows.length < 2) {
    throw new Error('El CSV no tiene datos suficientes. Debe incluir encabezados y al menos una fila.');
  }

  const competidoresPrevios = leerJsonSiExiste(path.join(DATA_DIR, 'competidores.json'), []);
  const competenciasPrevias = leerJsonSiExiste(path.join(DATA_DIR, 'competencias.json'), []);

  const eventos = generarEventos(rows);
  const competidores = generarCompetidores(eventos, competidoresPrevios);
  const competencias = generarCompetencias(eventos, competenciasPrevias);
  const metadata = generarMetadata(eventos, competidores, competencias);

  validarEventos(eventos);

  escribirJson('eventos.json', eventos);
  escribirJson('competidores.json', competidores);
  escribirJson('competencias.json', competencias);
  escribirJson('metadata.json', metadata);

  console.log('✅ JSON generados correctamente');
  console.log(`📄 CSV usado: ${path.relative(PROJECT_ROOT, CSV_PATH)}`);
  console.log(`🏆 Eventos: ${eventos.length}`);
  console.log(`🎤 Competidores: ${competidores.length}`);
  console.log(`📅 Competencias: ${competencias.length}`);
  console.log(`🕒 Última actualización: ${metadata.ultimaActualizacion || 'sin fecha'}`);
}

function generarEventos(rows) {
  const headers = rows[0].map(normalizarHeader);
  const idx = obtenerIndices(headers);
  const eventos = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const fecha = formatearFecha(getCell(row, idx.fecha));
    const competenciaNombre = limpiarTexto(getCell(row, idx.competencia));
    const campeon = limpiarTexto(getCell(row, idx.campeon));
    const subcampeon = limpiarTexto(getCell(row, idx.subcampeon));
    const modalidad = limpiarTexto(getCell(row, idx.modalidad));
    const tipo = limpiarTexto(getCell(row, idx.tipo));

    if (!fecha && !competenciaNombre && !campeon && !subcampeon && !modalidad && !tipo) continue;

    if (!fecha || !competenciaNombre || !campeon) {
      console.warn(`⚠️ Fila ${i + 1} omitida: faltan Fecha, Compe o Campeón.`);
      continue;
    }

    const competenciaId = slugify(competenciaNombre);

    eventos.push({
      id: generarIdEvento(competenciaNombre, fecha, i),
      fecha,
      fecha_visible: formatearFechaVisible(fecha),
      competencia_id: competenciaId,
      competencia_nombre: competenciaNombre,
      ganadores: parsearParticipantes(campeon),
      subcampeones: parsearParticipantes(subcampeon),
      modalidad,
      modalidad_base: obtenerModalidadBase(modalidad),
      relevancia: tipo || 'Local',
      ubicacion: CONFIG.ubicacionDefault
    });
  }

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return eventos;
}

function parsearParticipantes(valor) {
  const texto = limpiarTexto(valor);
  if (!texto) return [];

  return texto
    .split(/\s+-\s+|\s+\/\s+|\s*,\s*/)
    .map(nombre => limpiarTexto(nombre))
    .filter(Boolean)
    .map(nombre => ({
      competidor_id: slugify(nombre),
      competidor_nombre: nombre
    }));
}

function generarCompetidores(eventos, previos) {
  const previosPorId = indexarPorId(previos);
  const mapa = {};

  eventos.forEach(evento => {
    [...(evento.ganadores || []), ...(evento.subcampeones || [])].forEach(participante => {
      const id = participante.competidor_id;
      const nombre = participante.competidor_nombre;
      if (!id || !nombre) return;

      const previo = previosPorId[id] || {};

      if (!mapa[id]) {
        mapa[id] = {
          id,
          nombre: previo.nombre || nombre,
          slug: previo.slug || id,
          activo: previo.activo !== undefined ? previo.activo : true,
          zona: previo.zona || '',
          pais: previo.pais || 'Argentina',
          frase: previo.frase || '',
          estilo: previo.estilo || '',
          instagram: previo.instagram || '',
          ciudad: previo.ciudad || '',
          foto: previo.foto || ''
        };
      }
    });
  });

  return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function generarCompetencias(eventos, previas) {
  const previasPorId = indexarPorId(previas);
  const mapa = {};

  eventos.forEach(evento => {
    if (!evento.competencia_id) return;

    const previa = previasPorId[evento.competencia_id] || {};

    if (!mapa[evento.competencia_id]) {
      mapa[evento.competencia_id] = {
        id: evento.competencia_id,
        nombre: previa.nombre || evento.competencia_nombre,
        slug: previa.slug || evento.competencia_id,
        zona: previa.zona || CONFIG.ubicacionDefault,
        ciudad: previa.ciudad || CONFIG.ubicacionDefault,
        dia_habitual: previa.dia_habitual || '-',
        descripcion: previa.descripcion || ''
      };
    }
  });

  return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function generarMetadata(eventos, competidores, competencias) {
  const fechas = eventos.map(e => e.fecha).filter(Boolean).sort();

  return {
    proyecto: 'Quiero Freestyle Stats',
    temporada: CONFIG.temporada,
    totalEventos: eventos.length,
    totalCompetidores: competidores.length,
    totalCompetencias: competencias.length,
    ultimaActualizacion: fechas.length ? fechas[fechas.length - 1] : '',
    ultimaActualizacionVisible: fechas.length ? formatearFechaVisible(fechas[fechas.length - 1]) : '',
    generadoEl: new Date().toISOString()
  };
}

function validarEventos(eventos) {
  const claves = new Map();
  const errores = [];

  eventos.forEach((evento, index) => {
    if (evento.ganadores.length === 0) {
      errores.push(`Fila aproximada ${index + 2}: no tiene campeón.`);
    }

    const ganadores = new Set(evento.ganadores.map(p => p.competidor_id));
    evento.subcampeones.forEach(p => {
      if (ganadores.has(p.competidor_id)) {
        errores.push(`Fila aproximada ${index + 2}: campeón y subcampeón incluyen a ${p.competidor_nombre}.`);
      }
    });

    const clave = `${evento.fecha}|${normalizarTexto(evento.competencia_nombre)}|${evento.ganadores.map(g => g.competidor_id).join('-')}`;
    claves.set(clave, (claves.get(clave) || 0) + 1);
  });

  claves.forEach((cantidad, clave) => {
    if (cantidad > 1) errores.push(`Posible duplicado: ${clave}`);
  });

  if (errores.length > 0) {
    console.warn('\n⚠️ Advertencias de validación:');
    errores.forEach(error => console.warn(`- ${error}`));
    console.warn('');
  }
}

function obtenerIndices(headersNormalizados) {
  const columnasNormalizadas = Object.fromEntries(
    Object.entries(CONFIG.columnas).map(([key, value]) => [key, normalizarHeader(value)])
  );

  const idx = {};

  Object.entries(columnasNormalizadas).forEach(([key, header]) => {
    idx[key] = headersNormalizados.indexOf(header);
    if (idx[key] === -1) throw new Error(`Falta la columna "${CONFIG.columnas[key]}" en el CSV.`);
  });

  return idx;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const normalized = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function getCell(row, index) {
  return row[index] ?? '';
}

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function formatearFecha(valor) {
  const texto = limpiarTexto(valor);
  if (!texto) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  // Google Sheets puede exportar fechas como dd/mm/yyyy o mm/dd/yyyy según configuración regional.
  const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let parte1 = Number(match[1]);
    let parte2 = Number(match[2]);
    let anio = match[3];
    if (anio.length === 2) anio = `20${anio}`;

    let dia;
    let mes;

    if (parte1 > 12) {
      dia = parte1;
      mes = parte2;
    } else if (parte2 > 12) {
      // Caso mm/dd/yyyy, por ejemplo 6/30/2026.
      mes = parte1;
      dia = parte2;
    } else {
      // Google Sheets está exportando este CSV como mm/dd/yyyy.
      mes = parte1;
      dia = parte2;
    }

    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  return texto;
}

function formatearFechaVisible(fechaISO) {
  const match = String(fechaISO).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return fechaISO || '-';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function obtenerModalidadBase(modalidad) {
  const valor = normalizarTexto(modalidad);
  if (valor.includes('1vs1') || valor.includes('1v1')) return '1vs1';
  if (valor.includes('2vs2') || valor.includes('2v2')) return '2vs2';
  if (valor.includes('3vs3') || valor.includes('3v3')) return '3vs3';
  return modalidad || '';
}

function generarIdEvento(competencia, fecha, index) {
  return slugify(`${competencia}-${fecha}-${index}`);
}

function slugify(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizarTexto(texto) {
  return slugify(texto);
}

function normalizarHeader(texto) {
  return limpiarTexto(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/\s+/g, ' ');
}

function indexarPorId(items) {
  return (items || []).reduce((acc, item) => {
    if (item && item.id) acc[item.id] = item;
    return acc;
  }, {});
}

function leerJsonSiExiste(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`⚠️ No se pudo leer ${path.basename(filePath)}. Se usará un valor vacío.`);
    return fallback;
  }
}

function escribirJson(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`✅ data/${fileName}`);
}

function assertFileExists(filePath, message) {
  if (!fs.existsSync(filePath)) throw new Error(message);
}

function assertDirectoryExists(dirPath, message) {
  if (!fs.existsSync(dirPath)) throw new Error(message);
}

try {
  main();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}
