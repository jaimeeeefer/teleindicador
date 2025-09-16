// js/ui.js

import { getTrenActual, getTrenes, setTrenActual, getProximosTrenes, getPaginaActual, setPaginaActual, getTipoPanel, buscarTren, buscarEstacion } from './api.js';
import { getEstaciones, getOperadores } from './auth.js';
import { actualizarControlesInput } from './main.js';

let horaCabeceraTeleIntervalId = null;

let lastDate = null;
let pictogramasCercanias = {};
let pictosPorProducto = {};
let reglas = {};
let pictosPorNumero = {};
let productoPorNumero = {};

let trenesAnunciados = {}; // Para no repetir anuncios
let colaDeAnuncios = []; // Para poner en cola los anuncios si ya hay uno sonando
let estaReproduciendo = false; // Para saber si el "altavoz" está ocupado
let audioActual = null;
const retrasosAnunciados = {};

let fechaConcreta = null;

const rutasOperadorFeve = [
    "img/operadores/FEVE.png",
    "img/operadores/FEVE2.png",
    "img/operadores/FEVE3.png",
    "img/operadores/FEVE4.png",
    "img/operadores/FEVE5.png"
];

export async function cargarPictogramas() {
    try {
        const res = await fetch('data/pictogramasCercanias.json');
        pictogramasCercanias = await res.json();
    } catch (e) {
        console.error("Error cargando pictogramasCercanias.json", e);
        pictogramasCercanias = {};
    }
    try {
        const res = await fetch('data/pictosPorProducto.json');
        pictosPorProducto = await res.json();
    } catch (e) {
        console.error("Error cargando pictosPorProducto.json", e);
        pictosPorProducto = {};
    }
    try {
        const res = await fetch('data/reglas.json');
        reglas = await res.json();
    } catch (e) {
        console.error("Error cargando reglas.json", e);
        reglas = {};
    }
    try {
        const res = await fetch('data/pictosPorNumero.json');
        pictosPorNumero = await res.json();
    } catch (e) {
        console.error("Error cargando pictosPorNumero.json", e);
        pictosPorNumero = {};
    }
    try {
        const res = await fetch('data/productoPorNumero.json');
        productoPorNumero = await res.json();
    } catch (e) {
        console.error("Error cargando productoPorNumero.json", e);
        productoPorNumero = {};
    }
}


// CACHE DE ELEMENTOS DEL DOM PARA LA UI
const uiElements = {
    cargandoScreen: document.getElementById("cargando"),
    verifyInfo: document.getElementById("verifyInfo"),
    loginScreen: document.getElementById("login"),
    consultaScreen: document.getElementById("consulta"),
    resultadoTrenDiv: document.getElementById("resultadoTren"),
    resultadoEstacionDiv: document.getElementById("resultadoEstacion"),
    infoTrenDiv: document.getElementById("infoTren"),
    tablaPasosBody: document.getElementById("tablaPasos").querySelector("tbody"),
    tablaPanelBody: document.getElementById("tablaPanel").querySelector("tbody"),
    resultadoPre: document.getElementById("resultado"),
    btnAnterior: document.getElementById("btnAnterior"),
    btnSiguiente: document.getElementById("btnSiguiente"),
    contadorTrenSpan: document.getElementById("contadorTren"),
    clearResultadosButton: document.getElementById("clearResultadosButton"),
    cerrarSesionButton: document.getElementById("cerrarSesionButton"),
    sugerencias: document.getElementById('sugerencias'),
    cargarMas: document.getElementById("cargarMas"),
    btnDescargarMarcha: document.getElementById("descargarMarchaBtn")
};

export function clearLastDate() {
    lastDate = null;
}

// --- FUNCIONES DE VISIBILIDAD Y ESTADO ---

export function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => {
        if (p.id !== id) p.classList.remove('visible');
    });
    const destino = document.getElementById(id);
    if (destino) destino.classList.add('visible');
    if (destino.id === 'login') {
        titulo.classList.add('visible');
        botonesCentro.classList.add('visible');
        uiElements.clearResultadosButton.style.display = 'none';
        uiElements.cerrarSesionButton.style.display = 'none';
    }
    else if (destino.id === 'consulta') {
        titulo.classList.add('visible');
        botonesCentro.classList.add('visible');
        tabs.classList.add('visible');
        uiElements.clearResultadosButton.style.display = 'block';
        uiElements.cerrarSesionButton.style.display = 'block';
    }
}

export function setVerifyingState(isVerifying, message = "Verificando sesión...") {
    if (isVerifying) {
        mostrarPantalla("cargando");
        uiElements.verifyInfo.textContent = message;
    }
}

// --- FUNCIONES MEGAFONIA ---

// Función para limpiar los anuncios al hacer una nueva búsqueda
export function limpiarAnuncios() {
    // resetear trackers por referencia, no reasignar
    trenesAnunciados = {};
    // vacía la cola en sitio
    colaDeAnuncios.length = 0;
    // Detén audio actual si existe
    if (audioActual) {
        try {
        audioActual.onended = null;
        audioActual.onerror = null;
        audioActual.pause();
        } catch (e) {}
        try { audioActual.src = ""; } catch (e) {}
        audioActual = null;
    }
    estaReproduciendo = false;

    // limpiar retrasos anunciados en sitio (si lo usas)
    for (const k of Object.keys(retrasosAnunciados)) delete retrasosAnunciados[k];

    // si guardas timers globales para procesarCola, límpialos aquí (ejemplo)
    if (typeof window !== 'undefined' && window._mgf_process_timer) {
        clearTimeout(window._mgf_process_timer);
        window._mgf_process_timer = null;
    }
}

// Procesa la cola de anuncios
function procesarColaDeAnuncios() {
    if (estaReproduciendo || colaDeAnuncios.length === 0) {
        return; // Si ya está sonando algo o no hay nada que anunciar, no hace nada
    }
    estaReproduciendo = true;
    const secuencia = colaDeAnuncios.shift(); // Coge el primer anuncio de la cola
    reproducirSecuencia(secuencia);
}

// Reproduce una secuencia de archivos de audio uno tras otro
function reproducirSecuencia(archivos, index = 0) {
    // Si la secuencia no es válida, pasa a la siguiente
    if (!Array.isArray(archivos) || archivos.length === 0) {
        estaReproduciendo = false;
        setTimeout(procesarColaDeAnuncios, 1000);
        return;
    }

    // Si hemos terminado con el índice actual
    if (index >= archivos.length) {
        // limpia audioActual por si quedó algo
        if (audioActual) {
        try { audioActual.onended = null; } catch {}
        audioActual = null;
        }
        estaReproduciendo = false;
        // Esperamos un segundo y procesamos siguiente
        setTimeout(procesarColaDeAnuncios, 1000);
        return;
    }

    // Asegúrate de detener cualquier audio anterior y desvincular handlers
    try {
        if (audioActual) {
        audioActual.onended = null;
        audioActual.onerror = null;
        audioActual.pause();
        // no tocar src si quieres que el navegador no haga otra llamada
        audioActual = null;
        }
    } catch (e) { /* ignore */ }

    // Crea un único objeto global y así limpiarAnuncios podrá pararlo
    audioActual = new Audio(archivos[index]);
    // evita reproducir si la url está vacía
    if (!audioActual.src) {
        // salta al siguiente
        reproducirSecuencia(archivos, index + 1);
        return;
    }

    audioActual.play().catch(e => {
        console.error("Error al reproducir audio:", e);
        // si falla, intenta siguiente
        setTimeout(() => reproducirSecuencia(archivos, index + 1), 100);
    });

    // Al terminar el fichero actual, reproducir siguiente de la misma secuencia
    audioActual.onended = () => reproducirSecuencia(archivos, index + 1);

    audioActual.onerror = () => {
        console.warn(`No se encontró el archivo de audio: ${archivos[index]}`);
        reproducirSecuencia(archivos, index + 1);
    };
}

// Normalizacion para los audios de estaciones

function normalizeKey(text) {
  if (!text) return "";
  return text
    .toString()
    // quita acentos
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    // homogeneiza guiones (cubre hyphen, non-breaking hyphen, en/em dash, minus, figure dash, soft hyphen, etc.)
    .replace(/[\u00AD\u2010-\u2015\u2212\uFE58\uFE63\uFF0D-]/g, " ")
    // otros signos → espacio
    .replace(/[.,;:(){}\[\]/\\]/g, " ")
    // & → Y
    .replace(/&/g, " Y ")
    // colapsa espacios
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeKeyKeepAccents(text) {
  if (!text) return "";
  return text.toString()
    // NO quitamos acentos aquí
    .replace(/[\u00AD\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-") // todos los guiones unicode → "-"
    .replace(/[.,;:(){}\[\]/\\]/g, " ")                             // otros signos → espacio
    .replace(/\s+/g, " ")
    .replace(/-\s+/g, "-").replace(/\s+-/g, "-")
    .trim()
    .toLocaleUpperCase("es-ES");
}

// ===== Genera prefijos progresivos y versiones sin stopwords =====
const STOPWORDS = new Set(["DE","DEL","LA","LAS","LO","LOS","EL","SAN","SANTA","Y"]);

function generatePrefixVariants(rawName) {
    const baseAcc   = normalizeKeyKeepAccents(rawName); // CON tildes
    const baseNoAcc = normalizeKey(rawName);             // SIN tildes
    const bases = [baseAcc, baseNoAcc];

    const variants = [];
    
    // AÑADE ESTA LÓGICA DE PRIORIDAD
    if (baseAcc) variants.push(baseAcc);
    if (baseNoAcc && baseNoAcc !== baseAcc) variants.push(baseNoAcc);

    // Prefijos n-1, n-2, ..., 1 (y su versión sin stopwords) en este orden
    for (const full of bases) {
        if (!full) continue;
        const tokens = full.split(" ");
        for (let k = tokens.length - 1; k >= 1; k--) {
            const pref = tokens.slice(0, k).join(" ");
            variants.push(pref);

            const noStops = tokens.slice(0, k).filter(t => !STOPWORDS.has(t)).join(" ");
            if (noStops && noStops !== pref) variants.push(noStops);
        }
    }

    // Pegados al final (para ambas bases)
    for (const full of bases) {
        if (!full) continue;
        variants.push(full.replace(/[ -]/g, "")); // sin espacios ni guiones
    }

    // Dedupe preservando el orden de aparición
    const seen = new Set();
    return variants.filter(v => v && !seen.has(v) && seen.add(v));
}

// ===== Candidatos de nombre de archivo para un texto normalizado =====
function buildFileNameCandidates(norm) {
  const tokens = norm.split(" ");
  const hybrids = [];

  if (tokens.length > 1) {
    for (let i = 0; i < tokens.length - 1; i++) {
      const left  = tokens.slice(0, i + 1).join(" ");
      const right = tokens.slice(i + 1).join(" ");
      hybrids.push(`${left}-${right}`);
    }
  }

  const list = [
    norm,                         // tal cual
    ...hybrids,                   // ← prioridad a híbridos aquí
    norm.replace(/ /g, "-"),      // todo con guiones
    norm.replace(/-/g, " "),      // todo con espacios (si venía con guiones)
    norm.replace(/[ -]/g, ""),    // pegado (sin espacios ni guiones)
  ];

  // Deduplicar manteniendo orden
  const seen = new Set();
  return list.filter(x => x && !seen.has(x) && seen.add(x));
}

// ===== Comprobación de existencia =====
async function fileExists(url) {
  const u = encodeURI(url); // soporta "Ó", "Í", etc.
  try {
    const h = await fetch(u, { method: "HEAD", cache: "no-store" });
    if (h.ok) return true;
  } catch {}
  try {
    const r = await fetch(u, { method: "GET", cache: "no-store" });
    if (r.ok) return true;
  } catch {}
  return false;
}

// ===== Cache en memoria para resoluciones previas =====
const AUDIO_RESOLVE_CACHE = new Map();
const AUDIO_RESOLVE_CACHE_FEVE = new Map();

// ===== Resolver ruta real del audio de estación SIN índices fijos =====
async function getStationAudioPath(nombreEstacion) {
  if (!nombreEstacion) return null;

  // Cache hit
  if (AUDIO_RESOLVE_CACHE.has(nombreEstacion)) {
    return AUDIO_RESOLVE_CACHE.get(nombreEstacion);
  }

  // 1) Genera prefijos decrecientes y derivados
  const variants = generatePrefixVariants(nombreEstacion);

  // 2) Prueba cada variante con múltiples formatos de nombre
  for (const v of variants) {
    for (const base of buildFileNameCandidates(v)) {
      const url = `mgf/estaciones/${base}.wav`;
      console.log("Probando URL:", url);
      // eslint-disable-next-line no-await-in-loop
      if (await fileExists(url)) {
        AUDIO_RESOLVE_CACHE.set(nombreEstacion, url);
        return url;
      }
    }
  }

  // 3) Fallback: usa el normalizado completo con guiones (algo razonable)
  const fallback = `mgf/estaciones/${normalizeKey(nombreEstacion).replace(/\s+/g, "-")}.wav`;
  AUDIO_RESOLVE_CACHE.set(nombreEstacion, fallback);
  return fallback;
}

async function getStationAudioPathFeve(nombreEstacion) {
  if (!nombreEstacion) return null;

  // Cache hit (FEVE)
  if (AUDIO_RESOLVE_CACHE_FEVE.has(nombreEstacion)) {
    return AUDIO_RESOLVE_CACHE_FEVE.get(nombreEstacion);
  }

  // 1) Genera prefijos decrecientes y derivados (reusa tu función existente)
  const variants = generatePrefixVariants(nombreEstacion);

  // 2) Prueba cada variante con múltiples formatos de nombre
  for (const v of variants) {
    for (const base of buildFileNameCandidates(v)) {
      const url = `mgffeve/Castellano/Estaciones/${base}.wav`;
      // eslint-disable-next-line no-await-in-loop
      if (await fileExists(url)) {
        AUDIO_RESOLVE_CACHE_FEVE.set(nombreEstacion, url);
        return url;
      }
    }
  }

  // 3) Fallback: usa el normalizado completo con guiones (algo razonable)
  const fallback = `mgffeve/Castellano/Estaciones/${normalizeKey(nombreEstacion).replace(/\s+/g, "-")}.wav`;
  AUDIO_RESOLVE_CACHE_FEVE.set(nombreEstacion, fallback);
  return fallback;
}

// Función principal que se llamará para crear y encolar un nuevo anuncio
async function anunciarMegafonia(tren, tipoPanel, tipoAnuncio) {
    // La primera parte para obtener los datos es igual...
    const info = tren.commercialPathInfo || {};
    const infoextra = tipoPanel === 'llegadas'
        ? tren.passthroughStep?.arrivalPassthroughStepSides || {}
        : tren.passthroughStep?.departurePassthroughStepSides || {};
    const stopType = tren.passthroughStep?.stopType || '';

    const productoOriginal = info.opeProComPro?.commercialProduct?.trim().toUpperCase() || 'TREN';
    const mapaProductos = {
        "RODALIES-R11": "REGIONAL",
        "RODALIES-R12": "REGIONAL",
        "RODALIES-R13": "REGIONAL",
        "RODALIES-R14": "REGIONAL",
        "RODALIES-R15": "REGIONAL",
        "RODALIES-R16": "REGIONAL",
        "RODALIES-R17": "REGIONAL",
        // añade aquí más reglas si lo necesitas
    };
    const producto = mapaProductos[productoOriginal] || productoOriginal;
    const estaciones = getEstaciones();
    const codigoDestino = tipoPanel === 'llegadas' 
        ? info.commercialPathKey?.originStationCode 
        : info.commercialPathKey?.destinationStationCode;
    const destino = estaciones[codigoDestino?.replace(/^0+/, '')] || codigoDestino;
    const horaEstimMs = infoextra.plannedTime + (infoextra.forecastedOrAuditedDelay || 0) * 1000;
    const fecha = new Date(horaEstimMs);
    const horas = fecha.getHours();
    const minutos = fecha.getMinutes();
    const delaySeg = Number(infoextra.forecastedOrAuditedDelay || 0);
    const delayMin = Math.max(0, Math.round(delaySeg / 60));
    const idTren = info.commercialPathKey.commercialCirculationKey.commercialNumber || ""; // usa un identificador único
    const ultimoRetrasoAnunciado = retrasosAnunciados[idTren] ?? 0;
    const via = obtenerVia(tren.passthroughStep?.departurePassthroughStepSides, tren.passthroughStep?.arrivalPassthroughStepSides).plataforma;

    const normalizar = (texto) => {
        if (!texto) return '';
        return texto.toString().toUpperCase().replace(/[\/]+/g, ''); // Elimina espacios, guiones y barras
    };

    // --- LÓGICA AÑADIDA PARA FORMATEAR NÚMEROS ---
    const horasFormateadas = String(horas).padStart(2, '0');
    const minutosFormateados = String(minutos).padStart(2, '0');
    
    // --- LÓGICA MODIFICADA PARA CONSTRUIR EL ANUNCIO ---
    let secuenciaDeAudios = [];

    // --- LÓGICA DE VÍA MODIFICADA ---
    let audioViaNumero = null;
    let audioViaLetra  = null;

    if (!via || via.trim() === '' || via === '*') {
    audioViaNumero = 'mgf/frases/oportunamente indicaremos la vía en la que quedará estacionado.wav';
    } else {
    const m = String(via).trim().toUpperCase().match(/^(\d+)([A-Z]?)$/);
    if (m) {
        const numero = m[1].padStart(2, '0');
        const letra  = m[2] || "";
        audioViaNumero = `mgf/vías/VIA ${numero}.wav`;
        if (letra) audioViaLetra = `mgf/vías/${letra}.wav`;
    } else {
        const num = (String(via).match(/\d+/) || [])[0];
        if (num) audioViaNumero = `mgf/vías/VIA ${String(num).padStart(2,'0')}.wav`;
    }
    }
    // --- FIN LÓGICA DE VÍA ---

    // 1. Condición combinada para trenes sin servicio
    if (producto === 'MATERIAL VACIO' || producto === 'MATERIAL VACIO RAM' || producto === 'SERVICIO INTERNO') {
        secuenciaDeAudios = [
            'mgf/frases/Atención, por favor.wav',
            'mgf/frases/tren estacionado en.wav',
            audioViaNumero,
            audioViaLetra,
            'mgf/frases/no presta servicio.wav'
        ];
    } 
    // 2. Anuncio para tren sin parada
    else if (stopType === 'NO_STOP' && via) {
        secuenciaDeAudios = [
            'mgf/frases/Atención, atención, tren sin parada por.wav',
            audioViaNumero,
            audioViaLetra,
            'mgf/frases/Rogamos no se acerquen a la vía.wav'
        ];
    } 
    // 3. Anuncio FEVE
    else if (tipoAnuncio === 'feve') {
        const estacionAudioPathFeve = await getStationAudioPathFeve(destino);
        secuenciaDeAudios = [
            `mgffeve/DING.wav`,
            `mgffeve/Castellano/Trenes/ES_tren_dest_C.wav`,
            estacionAudioPathFeve,
            `mgffeve/Castellano/Frases/ES_efectuara_su_salida.wav`,
            `mgffeve/Castellano/Vias/ES_v${via}.wav`,
        ];
    }
    else if (tipoAnuncio === 'salidaInminenteFeve') {
        const estacionAudioPathFeve = await getStationAudioPathFeve(destino);
        secuenciaDeAudios = [
            `mgffeve/DING.wav`,
            `mgffeve/Castellano/Trenes/ES_tren_dest_C.wav`,
            estacionAudioPathFeve,
            `mgffeve/Castellano/Frases/ES_situado_en_la_via.wav`,
            `mgffeve/Castellano/Vias/ES_v${via}.wav`,
            `mgffeve/Castellano/Frases/ES_va_a_efectuar_su_salida.wav`,
        ];
    }
    else if (tipoAnuncio === 'feveRegional') {
        const estacionAudioPathFeve = await getStationAudioPathFeve(destino);
        secuenciaDeAudios = [
            `mgffeve/DING.wav`,
            `mgffeve/Castellano/Trenes/ES_tren_dest_R.wav`,
            estacionAudioPathFeve,
            `mgffeve/Castellano/Frases/ES_efectuara_su_salida.wav`,
            `mgffeve/Castellano/Vias/ES_v${via}.wav`,
        ];
    }
    else if (tipoAnuncio === 'salidaInminenteFeveRegional') {
        const estacionAudioPathFeve = await getStationAudioPathFeve(destino);
        secuenciaDeAudios = [
            `mgffeve/DING.wav`,
            `mgffeve/Castellano/Trenes/ES_tren_dest_R.wav`,
            estacionAudioPathFeve,
            `mgffeve/Castellano/Frases/ES_situado_en_la_via.wav`,
            `mgffeve/Castellano/Vias/ES_v${via}.wav`,
            `mgffeve/Castellano/Frases/ES_va_a_efectuar_su_salida.wav`,
        ];
    }
    // 4. Lógica para trenes con parada normales
    else {
        const estacionAudioPath = await getStationAudioPath(destino);
        const introAnuncio = [
            `mgf/trenes/${normalizar(producto)}.wav`,
            `mgf/frases/destino.wav`,
            estacionAudioPath
        ];

        if (tipoAnuncio === 'salidaInminente') {
            secuenciaDeAudios = [
                ...introAnuncio,
                audioViaNumero,
                audioViaLetra,
                `mgf/frases/va a efectuar su salida.wav`
            ];
        } else {
            secuenciaDeAudios = [
                ...introAnuncio,
                `mgf/frases/con salida a las.wav`,
                `mgf/horas/${horasFormateadas} horas.wav`,
                `mgf/motivos/MSG000 Y.wav`,
                `mgf/minutos/${minutosFormateados} minutos.wav`,
                audioViaNumero,
                audioViaLetra
            ];
        }
    }
    enqueueSequence(secuenciaDeAudios);
}

function enqueueSequence(seq) {
    // Asegura que la secuencia es un array plano de strings, sin valores nulos ni arrays anidados
    const flat = (Array.isArray(seq) ? seq : [seq]).flat(Infinity).filter(Boolean).map(String);
    if (flat.length === 0) return;
    colaDeAnuncios.push(flat);
    procesarColaDeAnuncios();
}

// --- FUNCIONES DE NÚMERO DE TREN ---

export function mostrarTren() {
    const trenes = getTrenes();
    const trenActual = getTrenActual();

    if (trenActual < 0 || trenActual >= trenes.length || !trenes[trenActual]) {
        console.error("Índice de tren inválido o tren no encontrado.");
        return;
    }

    const path = trenes[trenActual];
    if (!path) return;

    actualizarNavegacion(trenActual, trenes.length);
    renderizarInfoTren(path);
    renderizarTablaPasos(path);

    uiElements.resultadoTrenDiv.classList.remove("hidden");
    uiElements.btnDescargarMarcha.classList.remove('hidden');
}

function renderizarInfoTren(path) {
    const info = path.commercialPathInfo;
    const estaciones = getEstaciones();

    let { ultimaEstacion, esUltimaEstacion, retUltimaEstacion, estadoUltimaEstacion } = getUltimaSituacion(path.passthroughSteps);
    estadoUltimaEstacion = traducirEstado(estadoUltimaEstacion);
    ultimaEstacion = estaciones[ultimaEstacion.replace(/^0+/, '')] || ultimaEstacion;

    const claseEstado = `estado-${estadoUltimaEstacion?.replaceAll(" ", "_")}`;

    uiElements.infoTrenDiv.innerHTML = `
        <div class="infoTablaGlobal">
          <div class= "infoTablaColumna">
              <div><strong class="blanco">Número:</strong><br>${info.commercialPathKey.commercialCirculationKey.commercialNumber}</div>
              <div><strong class="blanco">Fecha:</strong><br>${formatearTimestampFecha(info.commercialPathKey.commercialCirculationKey.launchingDate)}</div>
              <div><strong class="blanco">Origen:</strong><br><div class="dividirBarra">${estaciones[info.commercialPathKey.originStationCode.replace(/^0+/, '')] || info.commercialPathKey.commercialCirculationKey.originStationCode}</div></div>
              <div><strong class="blanco">Destino:</strong><br><div class="dividirBarra">${estaciones[info.commercialPathKey.destinationStationCode.replace(/^0+/, '')] || info.commercialPathKey.commercialCirculationKey.destinationStationCode}</div></div>
          </div>
          <div class= "infoTablaColumna">
              <div><strong class="blanco">Tipo:</strong><br>${info.trafficType}</div>
              <div><strong class="blanco">Operador:</strong><br>
                    ${info.opeProComPro?.operator || ''}
                    ${traducirOperador(info.opeProComPro?.operator)
            ? ' - ' + traducirOperador(info.opeProComPro?.operator)
            : ''
        }
                </div>
              <div><strong class="blanco">Producto:</strong><br>${info.opeProComPro?.product || ''}${info.opeProComPro?.commercialProduct?.trim() ? ' - ' : ''}${info.opeProComPro?.commercialProduct?.trim() || ''}</div>
              ${info?.line ? `<div><strong class="blanco">Línea/Núcleo:</strong><br>${info.line} - ${info.core}</div>` : ''}
          </div>
          <div class= "infoTablaColumna">
              <div><strong class="blanco">Estado:</strong><br><span class="${claseEstado}">${estadoUltimaEstacion}</span></div>
              ${ultimaEstacion ? `<div><strong class="blanco">Última situación:</strong><br>${ultimaEstacion}${esUltimaEstacion ? ` (${esUltimaEstacion})` : ''}</div>` : ''}
              ${ultimaEstacion ? `<div><strong class="blanco">Retraso:</strong><br><span class="${getColorClass(retUltimaEstacion)}">${formatoRetraso(retUltimaEstacion)}</span></div>` : ''}
          </div>
        </div>
        <div class="infoTablaGlobal">
            <div class= "infoTablaColumna">
                ${info?.observation ? `<div><strong class="blanco">Observaciones:</strong><br>${info.observation}</div>` : ''}
            </div>
        </div>
    `;
    //PARA QUE SE DIVIDAN LAS BARRAS
    document.querySelectorAll('.dividirBarra').forEach(el => {
        el.innerHTML = el.textContent.replace(/([\/\-])/g, '$1\u200B');
    });
}

function renderizarTablaPasos(path) {
    uiElements.tablaPasosBody.innerHTML = '';
    const estaciones = getEstaciones();
    const estadoCirculacion = traducirEstado(path.passthroughSteps[0]?.departurePassthroughStepSides?.circulationState);

    path.passthroughSteps.forEach(paso => {
        const llegada = paso.arrivalPassthroughStepSides;
        const salida = paso.departurePassthroughStepSides;
        const estadoPaso = getEstadoPaso(llegada, salida);

        const fila = document.createElement('tr');
        if (paso.stopType === "COMMERCIAL" || paso.stopType === "TECHNICAL") {
            fila.classList.add('fila-negrita');
        }

        if (estadoPaso.clase) fila.classList.add(estadoPaso.clase);

        const viaInfo = obtenerVia(salida, llegada);

        const codigoEstacion = paso.stationCode.replace(/^0+/, '');
        const nombreEstacion = estaciones[codigoEstacion] || paso.stationCode;
        const celdaEstacion = document.createElement('td');
        celdaEstacion.innerHTML = `<span class="estacion-clicable numero-tren-clicable dividirBarra" title="Ver salidas" onclick="buscarEstacionClick('${codigoEstacion}', '${nombreEstacion.replace(/'/g, "\\'")}')">${nombreEstacion}</span>`;

        fila.appendChild(celdaEstacion);
        fila.innerHTML += `
          <td>${traducirParada(paso.stopType)}</td>
          <td>${llegada ? formatearTimestampHora(llegada.plannedTime) : ''}</td>
          <td>${llegada ? `<span class="${getColorClass(llegada.forecastedOrAuditedDelay)}">${calcularHoraReal(formatearTimestampHora(llegada.plannedTime), llegada.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${llegada ? `<span class="${getColorClass(llegada.forecastedOrAuditedDelay)} noDividir">${formatoRetraso(llegada.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${salida ? formatearTimestampHora(salida.plannedTime) : ''}</td>
          <td>${salida ? `<span class="${getColorClass(salida.forecastedOrAuditedDelay)}">${calcularHoraReal(formatearTimestampHora(salida.plannedTime), salida.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${salida ? `<span class="${getColorClass(salida.forecastedOrAuditedDelay)} noDividir">${formatoRetraso(salida.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${viaInfo.plataforma}</td>
          <td>${traducirVia(viaInfo.estado) || ''}</td>
          <td>${estadoPaso.texto}</td>
        `;
        uiElements.tablaPasosBody.appendChild(fila);
        if (paso.departurePassthroughStepSides?.supressed) {
            fila.classList.add('estado-sup');
            fila.cells[6].textContent = '';
            fila.cells[7].textContent = '';
        }
        if (paso.arrivalPassthroughStepSides?.supressed) {
            fila.classList.add('estado-sup');
            fila.cells[3].textContent = '';
            fila.cells[4].textContent = '';
        }
        if (viaInfo.estado === "SITRA" && !estadoPaso.clase) {
            fila.classList.add('estado-sitra');
        }
    });

    if (estadoCirculacion === 'PENDIENTE DE CIRCULAR') {
        ajustarFilasParaEstado();
    }

    if (fechaConcreta) {
        irAFechaConcreta(fechaConcreta);
        fechaConcreta = null;
    }

    //PARA QUE SE DIVIDAN LAS BARRAS
    document.querySelectorAll('.dividirBarra').forEach(el => {
        el.innerHTML = el.textContent.replace(/([\/\-])/g, '$1\u200B');
    });
}

function obtenerVia(salida, llegada) {
    // Prioridad: CTC > SITRA > OPERATOR > PLANNED/RELIABLE_PLANNED
    const prioridad = ['CTC', 'SITRA', 'OPERATOR'];
    for (const tipo of prioridad) {
        if (salida?.resultantPlatform === tipo && salida?.[`${tipo.toLowerCase()}Platform`]) {
            return { plataforma: salida[`${tipo.toLowerCase()}Platform`], estado: tipo };
        }
        if (llegada?.resultantPlatform === tipo && llegada?.[`${tipo.toLowerCase()}Platform`]) {
            return { plataforma: llegada[`${tipo.toLowerCase()}Platform`], estado: tipo };
        }
    }
    // Si ambos son PLANNED o RELIABLE_PLANNED, mostrar plannedPlatform
    if (
        (['PLANNED', 'RELIABLE_PLANNED'].includes(salida?.resultantPlatform) || !salida?.resultantPlatform) &&
        (['PLANNED', 'RELIABLE_PLANNED'].includes(llegada?.resultantPlatform) || !llegada?.resultantPlatform)
    ) {
        return {
            plataforma: salida?.plannedPlatform || llegada?.plannedPlatform || '',
            estado: salida?.resultantPlatform || llegada?.resultantPlatform || ''
        };
    }
    // Si solo uno es PLANNED/RELIABLE_PLANNED y el otro es null, mostrar plannedPlatform
    return {
        plataforma: salida?.plannedPlatform || llegada?.plannedPlatform || '',
        estado: salida?.resultantPlatform || llegada?.resultantPlatform || ''
    };
}

export function descargarMarchaXLSX() {
    const trenes = getTrenes();
    const trenActual = getTrenActual();
    const tren = trenes[trenActual];

    if (!tren) {
        alert("No hay datos de marcha para descargar.");
        return;
    }

    const estaciones = getEstaciones();
    const numeroTren = tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.commercialNumber;

    const cabeceras = [
        "Estacion", "Tipo Parada", "Llegada Planificada", "Llegada Real",
        "Retraso Llegada (s)", "Salida Planificada", "Salida Real",
        "Retraso Salida (s)", "Via", "Info Via", "E/S"
    ];

    const filas = tren.passthroughSteps.map(paso => {
        const llegada = paso.arrivalPassthroughStepSides;
        const salida = paso.departurePassthroughStepSides;
        const viaInfo = obtenerVia(salida, llegada);
        const nombreEstacion = estaciones[paso.stationCode.replace(/^0+/, '')] || paso.stationCode;
        const estadoPaso = getEstadoPaso(llegada, salida);

        return [
            nombreEstacion,
            traducirParada(paso.stopType),
            llegada ? formatearTimestampHora(llegada.plannedTime) : '',
            llegada ? calcularHoraReal(formatearTimestampHora(llegada.plannedTime), llegada.forecastedOrAuditedDelay) : '',
            llegada ? formatoRetraso(llegada.forecastedOrAuditedDelay) || '0' : '',
            salida ? formatearTimestampHora(salida.plannedTime) : '',
            salida ? calcularHoraReal(formatearTimestampHora(salida.plannedTime), salida.forecastedOrAuditedDelay) : '',
            salida ? formatoRetraso(salida.forecastedOrAuditedDelay) || '0' : '',
            viaInfo.plataforma,
            traducirVia(viaInfo.estado) || '',
            estadoPaso.texto || ''
        ];
    });

    // Crear hoja de trabajo (workbook) y hoja (worksheet)
    const ws_data = [cabeceras, ...filas];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marcha del Tren");

    // Ajustar el ancho de las columnas
    const wscols = [
        { wch: 30 }, // Estacion
        { wch: 15 }, // Tipo Parada
        { wch: 20 }, // Llegada Planificada
        { wch: 15 }, // Llegada Real
        { wch: 20 }, // Retraso Llegada (s)
        { wch: 20 }, // Salida Planificada
        { wch: 15 }, // Salida Real
        { wch: 20 }, // Retraso Salida (s)
        { wch: 5 },  // Via
        { wch: 25 }, // Info Via
        { wch: 10 }  // Estado
    ];
    ws['!cols'] = wscols;

    // Guardar archivo
    XLSX.writeFile(wb, `marcha_tren_${numeroTren}.xlsx`);
}

export function descargarMarchaPDF() {
    const trenes = getTrenes();
    const trenActual = getTrenActual();
    const tren = trenes[trenActual];

    if (!tren) {
        alert("No hay datos de marcha para descargar.");
        return;
    }

    const estaciones = getEstaciones();
    const numeroTren = tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.commercialNumber;
    const fechaTren = formatearTimestampFecha(tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.launchingDate);

    // Extraer datos para columnas
    const info = tren.commercialPathInfo;
    const { ultimaEstacion, esUltimaEstacion, retUltimaEstacion, estadoUltimaEstacion } = getUltimaSituacion(tren.passthroughSteps);
    const estadoTraducido = traducirEstado(estadoUltimaEstacion);
    const claseEstado = estadoTraducido;
    const nombreUltimaEstacion = estaciones[ultimaEstacion?.replace(/^0+/, '')] || ultimaEstacion;

    // Columnas
    const col1 = [
        { label: "Número", value: info.commercialPathKey.commercialCirculationKey.commercialNumber },
        { label: "Fecha", value: formatearTimestampFecha(info.commercialPathKey.commercialCirculationKey.launchingDate) },
        { label: "Origen", value: estaciones[info.commercialPathKey.originStationCode.replace(/^0+/, '')] || info.commercialPathKey.commercialCirculationKey.originStationCode },
        { label: "Destino", value: estaciones[info.commercialPathKey.destinationStationCode.replace(/^0+/, '')] || info.commercialPathKey.commercialCirculationKey.destinationStationCode }
    ];
    const col2 = [
        { label: "Tipo", value: info.trafficType },
        { label: "Operador", value: (info.opeProComPro?.operator || '') + (traducirOperador(info.opeProComPro?.operator) ? ' - ' + traducirOperador(info.opeProComPro?.operator) : '') },
        { label: "Producto", value: (info.opeProComPro?.product || '') + (info.opeProComPro?.commercialProduct?.trim() ? ' - ' : '') + (info.opeProComPro?.commercialProduct?.trim() || '') },
        ...(info?.line ? [{ label: "Línea/Núcleo", value: `${info.line} - ${info.core}` }] : [])
    ];
    const col3 = [
        { label: "Estado", value: estadoTraducido },
        ...(nombreUltimaEstacion ? [{ label: "Última situación", value: nombreUltimaEstacion + (esUltimaEstacion ? ` (${esUltimaEstacion})` : '') }] : []),
        ...(nombreUltimaEstacion ? [{ label: "Retraso", value: formatoRetraso(retUltimaEstacion) }] : [])
    ];
    const colObs = info?.observation ? [{ label: "Observaciones", value: info.observation }] : [];

    // Crear PDF usando jsPDF
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Marcha del Tren ${numeroTren} para el ${fechaTren}`, 14, 18);
    doc.setFontSize(13);
    doc.text(`(actualizado ${new Date().toLocaleString()})`, 14, 25);

    // Imprimir columnas
    doc.setFontSize(11);
    let y = 35;
    const x1 = 14, x2 = 110, x3 = 200;
    let yActual = y;
    col1.forEach((item, i) => {
        if (item.label) {
            doc.text(`${item.label}:`, x1, yActual);
            let opciones = {};
            if (item.label === "Origen" || item.label === "Destino") {
                opciones = { maxWidth: 60 };
            }
            doc.text(String(item.value), x1 + 18, yActual, opciones);

            // Si es Origen o Destino, calcular altura ocupada y sumar a yActual
            if (item.label === "Origen" || item.label === "Destino") {
                const dims = doc.getTextDimensions(String(item.value), opciones);
                yActual += Math.max(7, dims.h); // 7 es el salto normal, dims.h es la altura real
            } else {
                yActual += 7;
            }
        } else {
            doc.text(" ", x1, yActual);
            yActual += 7;
        }
    });
    col2.forEach((item, i) => {
        doc.text(`${item.label}:`, x2, y + i * 7);
        doc.text(String(item.value), x2 + 28, y + i * 7);
    });
    col3.forEach((item, i) => {
        doc.text(`${item.label}:`, x3, y + i * 7);
        doc.text(String(item.value), x3 + 32, y + i * 7);
    });
    if (colObs.length) {
        doc.text(`${colObs[0].label}:`, x1, y + 30);
        doc.text(String(colObs[0].value), x1 + 30, y + 30, { maxWidth: 250 });
    }

    // Añadir tabla (usando autoTable)
    const cabeceras = [
        "Estación", "Tipo Parada", "Llegada Planificada", "Llegada Real",
        "Retraso Llegada", "Salida Planificada", "Salida Real",
        "Retraso Salida", "Vía", "Info Vía", "E/S"
    ];
    const filas = tren.passthroughSteps.map(paso => {
        const llegada = paso.arrivalPassthroughStepSides;
        const salida = paso.departurePassthroughStepSides;
        const viaInfo = obtenerVia(salida, llegada);
        const nombreEstacion = estaciones[paso.stationCode.replace(/^0+/, '')] || paso.stationCode;
        const estadoPaso = getEstadoPaso(llegada, salida);

        return [
            nombreEstacion,
            traducirParada(paso.stopType) === "↓" ? "" : traducirParada(paso.stopType),
            llegada ? formatearTimestampHora(llegada.plannedTime) : '',
            llegada ? calcularHoraReal(formatearTimestampHora(llegada.plannedTime), llegada.forecastedOrAuditedDelay) : '',
            llegada ? formatoRetraso(llegada.forecastedOrAuditedDelay) || '0' : '',
            salida ? formatearTimestampHora(salida.plannedTime) : '',
            salida ? calcularHoraReal(formatearTimestampHora(salida.plannedTime), salida.forecastedOrAuditedDelay) : '',
            salida ? formatoRetraso(salida.forecastedOrAuditedDelay) || '0' : '',
            viaInfo.plataforma,
            traducirVia(viaInfo.estado) || '',
            estadoPaso.texto || ''
        ];
    });

    doc.autoTable({
        head: [cabeceras],
        body: filas,
        startY: y + 40,
        styles: { fontSize: 10 },
        headStyles: {
            fillColor: '#1A3254',
            textColor: '#afc1d9',
            fontStyle: 'bold',
            halign: 'left',
            valign: 'middle',
        }
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    doc.save(`marcha_tren_${numeroTren}.pdf`);
}

// --- NAVEGACIÓN ENTRE TRENES ---

export function mostrarTrenAnterior() {
    const trenActual = getTrenActual();
    if (trenActual > 0) {
        setTrenActual(trenActual - 1);
        mostrarTren();
    }
}

export function mostrarTrenSiguiente() {
    const trenes = getTrenes();
    const trenActual = getTrenActual();
    if (trenActual < trenes.length - 1) {
        setTrenActual(trenActual + 1);
        mostrarTren();
    }
}

function actualizarNavegacion(indice, total) {
    uiElements.btnAnterior.disabled = indice === 0;
    uiElements.btnSiguiente.disabled = indice === total - 1;
    uiElements.contadorTrenSpan.innerHTML = `Tren <strong>${indice + 1}</strong> de <strong>${total}</strong>`;
}

function irAFechaConcreta(fecha) {
    const trenes = getTrenes();
    const trenActual = getTrenActual();
    let tren = trenes[trenActual];
    while (tren && getTrenActual() < trenes.length - 1) {
        if (tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.launchingDate < fecha) {
            mostrarTrenSiguiente();
        }
        else break;
        tren = trenes[getTrenActual()];
    }
}

// --- FUNCIONES AUXILIARES DE UI Y FORMATO ---

function getUltimaSituacion(pasos) {
    let ultimaEstacion = '';
    let esUltimaEstacion = '';
    let retUltimaEstacion = '';
    let estadoUltimaEstacion = '';
    pasos.forEach(paso => {
        const llegadaAudited = paso.arrivalPassthroughStepSides?.timeType === 'AUDITED';
        const salidaAudited = paso.departurePassthroughStepSides?.timeType === 'AUDITED';
        if (llegadaAudited || salidaAudited) {
            ultimaEstacion = paso.stationCode;
            esUltimaEstacion = salidaAudited ? 'S' : 'E';
            retUltimaEstacion = salidaAudited ? paso.departurePassthroughStepSides.forecastedOrAuditedDelay : paso.arrivalPassthroughStepSides.forecastedOrAuditedDelay;
            estadoUltimaEstacion = paso.departurePassthroughStepSides?.circulationState;
            if (estadoUltimaEstacion === undefined) estadoUltimaEstacion = paso.arrivalPassthroughStepSides?.circulationState;
        }
    });
    if (estadoUltimaEstacion === '' || estadoUltimaEstacion === undefined) estadoUltimaEstacion = pasos[0].departurePassthroughStepSides?.circulationState;
    return { ultimaEstacion, esUltimaEstacion, retUltimaEstacion, estadoUltimaEstacion };
}

function getEstadoPaso(llegada, salida) {
    const llegadaAudited = llegada?.timeType === 'AUDITED';
    const salidaAudited = salida?.timeType === 'AUDITED';
    if (llegadaAudited && salidaAudited) return { texto: 'E/S', clase: 'estado-es' };
    if (llegadaAudited) return { texto: 'E', clase: 'estado-e' };
    if (salidaAudited) return { texto: 'S', clase: 'estado-s' };
    return { texto: '', clase: '' };
}

function ajustarFilasParaEstado() {
    const filas = Array.from(uiElements.tablaPasosBody.querySelectorAll('tr'));
    for (let i = filas.length - 1; i >= 0; i--) {
        const fila = filas[i];
        if (fila.cells[10]?.textContent.trim() !== '') break;
        // Limpiar tiempos estimados para ambos estados
        fila.cells[3].textContent = '';
        fila.cells[4].textContent = '';
        fila.cells[6].textContent = '';
        fila.cells[7].textContent = '';
    }
}

// FUNCIONES ESTACIÓN

export function finCargarMas() {
    uiElements.cargarMas.classList.add("hidden");
}

export function autocompletarEstaciones() {
    const estacionesArray = Object.entries(getEstaciones());
    const estacion = document.getElementById("numeroEst");
    const estacionInput = estacion.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const sugerencias = document.getElementById("sugerencias");
    sugerencias.innerHTML = '';

    // Limpia el atributo data-codigo si el usuario edita el input
    estacion.removeAttribute('data-codigo');

    if (estacionInput.length < 2) {
        // Mostrar favoritos
        const favs = getFavoritosEstaciones();
        if (favs.length > 0) {
            const estaciones = getEstaciones();
            const titulo = document.createElement('div');
            titulo.textContent = "Favoritos";
            titulo.classList.add("sugerencias-titulo");
            sugerencias.appendChild(titulo);

            favs.forEach(codigo => {
                const nombre = estaciones[codigo];
                if (!nombre) return;
                const item = document.createElement('div');
                item.innerHTML = `
                    <span class="nombre-estacion-wrap">${nombre}</span>
                    <span class="codigo-estacion">${codigo.padStart(5, '0')}</span>
                `;
                item.dataset.codigo = codigo;
                item.addEventListener('click', () => {
                    estacion.value = nombre;
                    estacion.setAttribute('data-codigo', codigo);
                    sugerencias.classList.remove('visible');
                    mostrarFavoritoEstrella();
                    document.getElementById('clearNumeroEst').classList.add('visible');
                    document.getElementById('estrellaFavoritoEst').classList.add('visible');
                    estacion.classList.add('input-con-x');
                });
                sugerencias.appendChild(item);
            });
            sugerencias.classList.add('visible');
        } else sugerencias.classList.remove('visible');
        return;
    }

    // Dividir en palabras (divisor: espacio o guión)
    const palabras = estacionInput.split(/[\s-]+/).filter(p => p.length > 0);

    // Si el input es numérico, buscar también por código
    const esNumerico = /^\d{1,5}$/.test(estacionInput);
    const esAlfaNumerico = /^[ABCZabcz]\d{1,4}$/.test(estacionInput);

    const coincidencias = estacionesArray.filter(([codigo, nombre]) => {
        const nombreLower = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const coincideNombre = palabras.every(palabra => nombreLower.includes(palabra));
        let coincideCodigo = false;
        if (esNumerico) {
            coincideCodigo = codigo.padStart(5, '0').includes(estacionInput);
        } else if (esAlfaNumerico) {
            coincideCodigo = codigo.padStart(5, '0').includes(estacionInput.toUpperCase());
        }
        return coincideNombre || coincideCodigo;
    });

    // Añadir título de sugerencias
    const titulo = document.createElement('div');
    titulo.textContent = "Sugerencias";
    titulo.classList.add("sugerencias-titulo");
    sugerencias.appendChild(titulo);

    if (coincidencias.length > 0) {
        coincidencias.forEach(([codigo, nombre]) => {
            const item = document.createElement('div');
            item.innerHTML = `
            <span class="nombre-estacion-wrap">${nombre}</span>
            <span class="codigo-estacion">${codigo.padStart(5, '0')}</span>
            `;
            item.dataset.codigo = codigo;
            item.addEventListener('click', () => {
                estacion.value = nombre;
                estacion.setAttribute('data-codigo', codigo);
                sugerencias.classList.remove('visible');
            });
            sugerencias.appendChild(item);
        });
        sugerencias.classList.add('visible');
    } else {
        const sinCoincidencias = document.createElement("div");
        sinCoincidencias.textContent = "(sin coincidencias)";
        sinCoincidencias.classList.add("sugerencia", "no-click");
        sugerencias.appendChild(sinCoincidencias);
        return;
    }
}

export function mostrarEstacion(tipo) {
    const trenes = getProximosTrenes();
    const paginaActual = getPaginaActual();

    if (paginaActual < 0) {
        console.error("Índice de tren inválido o tren no encontrado.");
        return;
    }

    if (trenes.length > 0) {
        if (tipo === "detallado") {
            uiElements.tablaPanelBody.innerHTML = "";
            renderizarPanel(trenes);
            uiElements.resultadoEstacionDiv.classList.remove("hidden");
            document.getElementById("salidasLlegadasHeader").textContent = "Próximas " + getTipoPanel() + ":";
        } else if (tipo === "teleindicador") {
            renderizarPanelTeleindicador(trenes);
        }
    }

}

function renderizarPanel(trenes) {
    lastDate = null;
    const estaciones = getEstaciones();

    // Ordenar trenes por fecha y hora real (timestamp)
    trenes.sort((a, b) => {
        const pasoA = a.passthroughStep.departurePassthroughStepSides || a.passthroughStep.arrivalPassthroughStepSides;
        const pasoB = b.passthroughStep.departurePassthroughStepSides || b.passthroughStep.arrivalPassthroughStepSides;
        return getTimestampReal(pasoA) - getTimestampReal(pasoB);
    });

    // Fecha de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    //OBSERVACIONES DE ESTACIONES (TODO)
    //document.getElementById("infoEstacion").innerHTML = ``;

    trenes.forEach(tren => {
        const numeroTren = tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.commercialNumber || '';
        const paso = tren.passthroughStep.departurePassthroughStepSides || tren.passthroughStep.arrivalPassthroughStepSides;
        const timestampReal = getTimestampReal(paso);
        const fecha = timestampReal ? new Date(timestampReal) : null;

        if (fecha) {
            // Normaliza la fecha a las 00:00:00
            fecha.setHours(0, 0, 0, 0);

            // Si la fecha es distinta a la anterior y no es hoy, añade separador
            if ((!lastDate || fecha.getTime() !== lastDate.getTime()) && fecha.getTime() !== hoy.getTime()) {
                const separador = document.createElement('tr');
                separador.className = 'fila-separador-dia';
                separador.innerHTML = `<td colspan="9">↓ ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} ↓</td>`;
                uiElements.tablaPanelBody.appendChild(separador);
                lastDate = fecha;
            }
        }

        const claseEstado = `estado-${traducirEstado(paso.circulationState).replaceAll(" ", "_")}`;
        const estadoTraducido = traducirEstado(paso.circulationState);
        let horaPlanificada = formatearTimestampHora(paso.plannedTime);
        let horaReal = calcularHoraReal(horaPlanificada, paso.forecastedOrAuditedDelay);
        let mostrarHoraReal = (
            estadoTraducido !== 'SUPRIMIDO' &&
            estadoTraducido !== 'PENDIENTE DE CIRCULAR' &&
            horaReal
        );
        const fila = document.createElement('tr');

        const origen = estaciones[tren.commercialPathInfo.commercialPathKey.originStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.originStationCode;
        const destino = estaciones[tren.commercialPathInfo.commercialPathKey.destinationStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.destinationStationCode;

        let tacharHora = paso.forecastedOrAuditedDelay !== null && (paso.forecastedOrAuditedDelay >= 180 || paso.forecastedOrAuditedDelay < 0) && estadoTraducido !== 'PENDIENTE DE CIRCULAR';

        // Construye la celda según tipoPanel
        let celdaDestinoOrigen = '';
        if (getTipoPanel() === 'salidas') {
            celdaDestinoOrigen = `
                <span class="noDividir">${destino}</span>
                <br>
                <span class="origen-difuminado">ORIGEN: ${origen}</span>
            `;
        } else {
            celdaDestinoOrigen = `
                <span class="noDividir">${origen}</span>
                <br>
                <span class="origen-difuminado">DESTINO: ${destino}</span>
            `;
        }

        const fechaInicio = tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.launchingDate || '';

        fila.innerHTML = `
        <td>
            <span${tacharHora ? ' style="text-decoration: line-through;"' : ''}>${horaPlanificada}</span>
            ${mostrarHoraReal ? `<span class="hora-real ${getColorClass(paso.forecastedOrAuditedDelay)}">${horaReal}</span>` : ''}
        </td>
        <td>
            ${mostrarHoraReal ? `<span class="${getColorClass(paso.forecastedOrAuditedDelay)} noDividir">${formatoRetraso(paso.forecastedOrAuditedDelay)}</span>` : ''}
        </td>
        <td>
            ${celdaDestinoOrigen}
        </td>
        <td>
            <span class="numero-tren-clicable" style="cursor:pointer;" onclick="buscarTrenClick('${numeroTren}', '${fechaInicio}')" title="Ver marcha">
                ${numeroTren}
            </span>
        </td>
        <td>
            <span class="noDividir">
                ${tren.commercialPathInfo.opeProComPro?.operator || ''}
                ${traducirOperador(tren.commercialPathInfo.opeProComPro?.operator)
                ? ' - ' + traducirOperador(tren.commercialPathInfo.opeProComPro?.operator)
                : ''
            }
            </span>
            <br>
            <span class="origen-difuminado">
                ${tren.commercialPathInfo.opeProComPro?.product || ''}
                ${tren.commercialPathInfo.opeProComPro?.commercialProduct.trim()
                ? ' - ' + tren.commercialPathInfo.opeProComPro?.commercialProduct
                : ''
            }
            </span>
        </td>
        <td>${obtenerVia(paso, paso).plataforma || ''}</td>
        <td><span class="${claseEstado}">${estadoTraducido || ''}</span></td>
        <td>${traducirParada(tren.passthroughStep.stopType)}</td>
        `;
        uiElements.tablaPanelBody.appendChild(fila);
    });

    ajustarFilasParaEstadoEstacion();
}

function getTimestampReal(paso) {
    if (!paso?.plannedTime) return 0;
    const retraso = paso.forecastedOrAuditedDelay || 0;
    return paso.plannedTime + retraso * 1000;
}

function ajustarFilasParaEstadoEstacion() {
    const filas = Array.from(uiElements.tablaPanelBody.querySelectorAll('tr'));
    for (let i = filas.length - 1; i >= 0; i--) {
        const fila = filas[i];
        const estadoCirculacion = fila.cells[6]?.textContent.trim()
        if (estadoCirculacion === 'SUPRIMIDO') fila.classList.add('estado-sup');
        else if (estadoCirculacion === 'PENDIENTE DE CIRCULAR') {
            fila.classList.add('estado-pend');
        }
        else if (estadoCirculacion === 'SEGUIMIENTO PERDIDO' || estadoCirculacion === 'DESCONOCIDO') {
            fila.classList.add('estado-segPerd');
        }
        else if (estadoCirculacion === 'DETENIDO') {
            fila.classList.add('estado-det');
        }
        if (estadoCirculacion === 'SUPRIMIDO' || estadoCirculacion === 'PENDIENTE DE CIRCULAR') {
            fila.cells[1].textContent = '';
        }
    }
}

export function descargarPanelXLSX() {
    const trenes = getProximosTrenes();
    if (!trenes || trenes.length === 0) {
        alert("No hay datos de salidas para descargar.");
        return;
    }
    const estaciones = getEstaciones();
    const tipoPanel = getTipoPanel(); // "salidas" o "llegadas"
    const nombreEstacion = (() => {
        const paso = trenes[0]?.passthroughStep;
        if (!paso) return "";
        const codigo = paso.stationCode;
        return estaciones[codigo?.replace(/^0+/, '')] || codigo || "";
    })();

    // Cabeceras de la tabla
    const cabeceras = [
        "Hora", "Retraso", tipoPanel === "salidas" ? "Destino" : "Origen",
        "Nº Tren", "Operador", "Vía", "Estado", "Tipo Parada"
    ];

    // Ordenar trenes por fecha real
    trenes.sort((a, b) => {
        const pasoA = a.passthroughStep.departurePassthroughStepSides || a.passthroughStep.arrivalPassthroughStepSides;
        const pasoB = b.passthroughStep.departurePassthroughStepSides || b.passthroughStep.arrivalPassthroughStepSides;
        return getTimestampReal(pasoA) - getTimestampReal(pasoB);
    });

    // Fecha de hoy a las 00:00:00
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let filas = [];
    let lastDate = null;

    trenes.forEach(tren => {
        const paso = tren.passthroughStep.departurePassthroughStepSides || tren.passthroughStep.arrivalPassthroughStepSides;
        const timestampReal = getTimestampReal(paso);
        const fecha = timestampReal ? new Date(timestampReal) : null;

        if (fecha) {
            fecha.setHours(0, 0, 0, 0);
            // Si la fecha es distinta a la anterior y no es hoy, añade separador
            if ((!lastDate || fecha.getTime() !== lastDate.getTime()) && fecha.getTime() !== hoy.getTime()) {
                filas.push([
                    `Trenes para el ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}:`,
                    '', '', '', '', '', '', ''
                ]);
                lastDate = fecha;
            }
        }

        const estadoTraducido = traducirEstado(paso.circulationState);
        const horaPlanificada = formatearTimestampHora(paso.plannedTime);
        const horaReal = calcularHoraReal(horaPlanificada, paso.forecastedOrAuditedDelay);
        const mostrarHoraReal = (
            estadoTraducido !== 'SUPRIMIDO' &&
            estadoTraducido !== 'PENDIENTE DE CIRCULAR' &&
            horaReal
        );
        const origen = estaciones[tren.commercialPathInfo.commercialPathKey.originStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.originStationCode;
        const destino = estaciones[tren.commercialPathInfo.commercialPathKey.destinationStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.destinationStationCode;
        const numeroTren = tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.commercialNumber || '';
        const operador = (tren.commercialPathInfo.opeProComPro?.operator || '') +
            (traducirOperador(tren.commercialPathInfo.opeProComPro?.operator)
                ? ' - ' + traducirOperador(tren.commercialPathInfo.opeProComPro?.operator)
                : '');
        const producto = (tren.commercialPathInfo.opeProComPro?.product || '') +
            (tren.commercialPathInfo.opeProComPro?.commercialProduct?.trim()
                ? ' - ' + tren.commercialPathInfo.opeProComPro?.commercialProduct
                : '');
        const via = obtenerVia(paso, paso).plataforma || '';
        const tipoParada = traducirParada(tren.passthroughStep.stopType) === "↓" ? "" : traducirParada(tren.passthroughStep.stopType);

        filas.push([
            horaPlanificada + (mostrarHoraReal ? ` (${horaReal})` : ''),
            mostrarHoraReal ? formatoRetraso(paso.forecastedOrAuditedDelay) : '',
            tipoPanel === "salidas" ? destino : origen,
            numeroTren,
            operador + (producto ? `\n${producto}` : ''),
            via,
            estadoTraducido,
            tipoParada
        ]);
    });

    // Crear hoja de trabajo (workbook) y hoja (worksheet)
    const ws_data = [cabeceras, ...filas];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Panel");

    // Ajustar el ancho de las columnas
    const wscols = [
        { wch: 15 }, // Hora
        { wch: 12 }, // Retraso
        { wch: 30 }, // Destino/Origen
        { wch: 10 }, // Nº Tren
        { wch: 30 }, // Operador
        { wch: 6 },  // Vía
        { wch: 18 }, // Estado
        { wch: 15 }  // Tipo Parada
    ];
    ws['!cols'] = wscols;

    // Guardar archivo
    XLSX.writeFile(wb, `panel_${tipoPanel}_${nombreEstacion.replace(/\s+/g, "_")}.xlsx`);
}

export function descargarPanelPDF() {
    const trenes = getProximosTrenes();
    if (!trenes || trenes.length === 0) {
        alert("No hay datos de salidas para descargar.");
        return;
    }
    const estaciones = getEstaciones();
    const tipoPanel = getTipoPanel(); // "salidas" o "llegadas"
    const nombreEstacion = (() => {
        const paso = trenes[0]?.passthroughStep;
        if (!paso) return "";
        const codigo = paso.stationCode;
        return estaciones[codigo?.replace(/^0+/, '')] || codigo || "";
    })();

    // Cabeceras de la tabla
    const cabeceras = [
        "Hora", "Retraso", tipoPanel === "salidas" ? "Destino" : "Origen",
        "Nº Tren", "Operador", "Vía", "Estado", "Tipo Parada"
    ];

    // Ordenar trenes por fecha real
    trenes.sort((a, b) => {
        const pasoA = a.passthroughStep.departurePassthroughStepSides || a.passthroughStep.arrivalPassthroughStepSides;
        const pasoB = b.passthroughStep.departurePassthroughStepSides || b.passthroughStep.arrivalPassthroughStepSides;
        return getTimestampReal(pasoA) - getTimestampReal(pasoB);
    });

    // Fecha de hoy a las 00:00:00
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let filas = [];
    let lastDate = null;

    trenes.forEach(tren => {
        const paso = tren.passthroughStep.departurePassthroughStepSides || tren.passthroughStep.arrivalPassthroughStepSides;
        const timestampReal = getTimestampReal(paso);
        const fecha = timestampReal ? new Date(timestampReal) : null;

        if (fecha) {
            fecha.setHours(0, 0, 0, 0);
            // Si la fecha es distinta a la anterior y no es hoy, añade separador
            if ((!lastDate || fecha.getTime() !== lastDate.getTime()) && fecha.getTime() !== hoy.getTime()) {
                filas.push([
                    `Trenes para el ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}:`,
                    '', '', '', '', '', '', ''
                ]);
                lastDate = fecha;
            }
        }

        const estadoTraducido = traducirEstado(paso.circulationState);
        const horaPlanificada = formatearTimestampHora(paso.plannedTime);
        const horaReal = calcularHoraReal(horaPlanificada, paso.forecastedOrAuditedDelay);
        const mostrarHoraReal = (
            estadoTraducido !== 'SUPRIMIDO' &&
            estadoTraducido !== 'PENDIENTE DE CIRCULAR' &&
            horaReal
        );
        const origen = estaciones[tren.commercialPathInfo.commercialPathKey.originStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.originStationCode;
        const destino = estaciones[tren.commercialPathInfo.commercialPathKey.destinationStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.destinationStationCode;
        const numeroTren = tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.commercialNumber || '';
        const operador = (tren.commercialPathInfo.opeProComPro?.operator || '') +
            (traducirOperador(tren.commercialPathInfo.opeProComPro?.operator)
                ? ' - ' + traducirOperador(tren.commercialPathInfo.opeProComPro?.operator)
                : '');
        const producto = (tren.commercialPathInfo.opeProComPro?.product || '') +
            (tren.commercialPathInfo.opeProComPro?.commercialProduct?.trim()
                ? ' - ' + tren.commercialPathInfo.opeProComPro?.commercialProduct
                : '');
        const via = obtenerVia(paso, paso).plataforma || '';
        const tipoParada = traducirParada(tren.passthroughStep.stopType) === "↓" ? "" : traducirParada(tren.passthroughStep.stopType);

        filas.push([
            horaPlanificada + (mostrarHoraReal ? ` (${horaReal})` : ''),
            mostrarHoraReal ? formatoRetraso(paso.forecastedOrAuditedDelay) : '',
            tipoPanel === "salidas" ? destino : origen,
            numeroTren,
            operador + (producto ? `\n${producto}` : ''),
            via,
            estadoTraducido,
            tipoParada
        ]);
    });

    // Crear PDF usando jsPDF
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(
        `${tipoPanel === "salidas" ? "Salidas" : "Llegadas"} - ${nombreEstacion}`,
        14, 18
    );
    doc.setFontSize(13);
    doc.text(`(actualizado ${new Date().toLocaleString()})`, 14, 25);

    // Añadir tabla (usando autoTable)
    doc.autoTable({
        head: [cabeceras],
        body: filas,
        startY: 35,
        styles: { fontSize: 10 },
        headStyles: {
            fillColor: '#1A3254',
            textColor: '#afc1d9',
            fontStyle: 'bold',
            halign: 'left',
            valign: 'middle',
        },
        // Estilo especial para filas de separador
        didParseCell: function (data) {
            if (
                data.row.raw &&
                typeof data.row.raw[0] === "string" &&
                data.row.raw[0].startsWith("Trenes para el")
            ) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [220, 230, 240];
                data.cell.styles.textColor = [30, 50, 84];
                data.cell.colSpan = 8;
                if (data.column.index > 0) data.cell.text = '';
            }
        }
    });

    doc.save(`${tipoPanel}_${nombreEstacion.replace(/\s+/g, "_")}.pdf`);
}

function buscarTrenClick(numero, fecha) {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
    // Cambiar pestaña activa
    document.getElementById("marchasButton").click();
    // Cambiar texto barra de búsqueda
    const barraBusqueda = document.getElementById("numeroTren");
    barraBusqueda.value = numero;
    actualizarControlesInput(barraBusqueda, document.getElementById("clearNumeroTren"), document.getElementById("estrellaFavoritoNumero"));
    mostrarFavoritoEstrellaTren();

    fechaConcreta = fecha;
    buscarTren();
}
window.buscarTrenClick = buscarTrenClick;
function buscarEstacionClick(codigo, nombre) {
    document.getElementById("estacionesButton").click();
    const inputEst = document.getElementById("numeroEst");
    inputEst.value = nombre;
    inputEst.setAttribute('data-codigo', codigo);
    actualizarControlesInput(inputEst, document.getElementById("clearNumeroEst"), document.getElementById("estrellaFavoritoEst"));
    mostrarFavoritoEstrella();
    document.getElementById("buscarEstButton").click();
}
window.buscarEstacionClick = buscarEstacionClick;

// FAVORITOS ESTACION
function getFavoritosEstaciones() {
    return JSON.parse(localStorage.getItem('favoritosEstaciones') || '[]');
}
function setFavoritosEstaciones(favs) {
    localStorage.setItem('favoritosEstaciones', JSON.stringify(favs));
}

export function toggleFavoritoEstacion(codigo) {
    let favs = getFavoritosEstaciones();
    if (favs.includes(codigo)) {
        favs = favs.filter(c => c !== codigo);
    } else {
        favs.push(codigo);
    }
    setFavoritosEstaciones(favs);
    mostrarFavoritoEstrella();
    mostrarFavoritoEstrellaTele();
}

export function mostrarFavoritoEstrella() {
    const estacionInput = document.getElementById("numeroEst");
    const estrella = document.getElementById("estrellaFavoritoEst");
    const estaciones = getEstaciones();
    let codigo = null;
    const inputNorm = estacionInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();

    // Si el input es numérico, buscar por código también
    const esNumerico = /^\d+$/.test(estacionInput.value.trim());

    for (const [cod, nombre] of Object.entries(estaciones)) {
        const nombreNorm = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();

        // Coincidencia por nombre normalizado
        if (nombreNorm === inputNorm) {
            codigo = cod;
            break;
        }

        // Coincidencia por código (rellenado a 5 dígitos)
        if (esNumerico && (cod === estacionInput.value.trim() || cod.padStart(5, '0') === estacionInput.value.trim())) {
            codigo = cod;
            break;
        }
    }

    if (!codigo) {
        estrella.classList.remove('favorito-activo');
        return;
    }
    const favs = getFavoritosEstaciones();
    if (favs.includes(codigo)) {
        estrella.classList.add('favorito-activo');
    } else {
        estrella.classList.remove('favorito-activo');
    }
}

// FAVORITOS TRENES
function normalizarOrigenDestino(origenDestino) {
    const regex = /^(.+?) - (.+?)(&nbsp;){8}/;
    const match = origenDestino.match(regex);
    if (match) {
        return origenDestino.slice(0, match[0].length);
    }
    const partes = origenDestino.split(' - ');
    if (partes.length >= 2) {
        return `${partes[0]} - ${partes[1]}${'&nbsp;'.repeat(8)}`;
    }
    return '';
}
function getFavoritosTrenes() {
    return JSON.parse(localStorage.getItem('favoritosTrenes') || '[]');
}
function setFavoritosTrenes(favs) {
    localStorage.setItem('favoritosTrenes', JSON.stringify(favs));
}
export function toggleFavoritoTren(numero, origenDestino) {
    let favs = getFavoritosTrenes();
    // Buscar si existe el favorito en cualquier formato
    const idx = favs.findIndex(f => {
        if (typeof f === 'object' && f !== null) {
            return f.numero === numero;
        }
        return f === numero || f === Number(numero);
    });

    if (idx !== -1) {
        // Si es objeto y falta origenDestino, actualizarlo
        if (typeof favs[idx] === 'object' && favs[idx] !== null) {
            if (!favs[idx].origenDestino && origenDestino) {
                favs[idx].origenDestino = origenDestino;
                setFavoritosTrenes(favs);
                mostrarFavoritoEstrellaTren();
                return;
            }
        }
        // Si es solo número, actualizar al nuevo formato
        if (typeof favs[idx] !== 'object') {
            favs[idx] = { numero, origenDestino };
            setFavoritosTrenes(favs);
            mostrarFavoritoEstrellaTren();
            return;
        }
        // Si ya existe y tiene origenDestino, quitar de favoritos
        favs.splice(idx, 1);
    } else {
        favs.push({ numero, origenDestino });
    }
    setFavoritosTrenes(favs);
    mostrarFavoritoEstrellaTren();
}
export function mostrarFavoritoEstrellaTren() {
    const input = document.getElementById("numeroTren");
    const estrella = document.getElementById("estrellaFavoritoNumero");
    const numero = input.value.trim();
    const favs = getFavoritosTrenes();
    if (favs.some(f => f.numero === numero)) {
        estrella.classList.add('favorito-activo');
    } else {
        estrella.classList.remove('favorito-activo');
    }
}
export function mostrarFavoritosTren() {
    const input = document.getElementById("numeroTren");
    const favoritosDiv = document.getElementById("favoritos");
    favoritosDiv.innerHTML = '';

    // Obtener trenes cargados para buscar origen/destino
    const trenes = getTrenes();
    const estaciones = getEstaciones();

    if (input.value.trim().length < 2) {
        const favs = getFavoritosTrenes();
        const recientes = getUltimosTrenesBuscados().filter(
            obj => !favs.some(f => f.numero === obj.numero)
        );
        let hayContenido = false;

        // Título y favoritos
        if (favs.length > 0) {
            const titulo = document.createElement('div');
            titulo.textContent = "Favoritos";
            titulo.classList.add("sugerencias-titulo");
            favoritosDiv.appendChild(titulo);

            favs.forEach(obj => {
                const item = document.createElement('div');
                item.classList.add("sugerencia", "numtren-container");
                item.innerHTML = `
                    <span>${obj.numero || obj}</span>
                    <span class="origenDestino"><span class="origenDestino-texto">${normalizarOrigenDestino(obj.origenDestino).repeat(4) || ''}</span></span>
                `;
                item.addEventListener('click', () => {
                    input.value = obj.numero || obj;
                    favoritosDiv.innerHTML = '';
                    mostrarFavoritoEstrellaTren();
                    document.getElementById('clearNumeroTren').classList.add('visible');
                    document.getElementById('estrellaFavoritoNumero').classList.add('visible');
                    input.classList.add('input-con-x');
                });
                favoritosDiv.appendChild(item);
                const origenDestinoSpan = item.querySelector('.origenDestino-texto');
                const origenDestinoCont = item.querySelector('.origenDestino');
                if (origenDestinoSpan && origenDestinoCont &&
                    origenDestinoSpan.scrollWidth > origenDestinoCont.clientWidth) {
                    origenDestinoSpan.classList.add('desplazamiento-derecha');
                }
            });
            hayContenido = true;
        }

        // Título y recientes (solo si hay recientes)
        if (recientes.length > 0) {
            const tituloRecientes = document.createElement('div');
            tituloRecientes.textContent = "Recientes";
            tituloRecientes.classList.add("sugerencias-titulo");
            favoritosDiv.appendChild(tituloRecientes);

            recientes.forEach(obj => {
                const item = document.createElement('div');
                item.classList.add("sugerencia", "reciente", "numtren-container");
                item.innerHTML = `
                    <span>${obj.numero || obj}</span>
                    <span class="origenDestino"><span class="origenDestino-texto">${normalizarOrigenDestino(obj.origenDestino).repeat(4) || ''}</span></span>
                `;
                item.addEventListener('click', () => {
                    input.value = obj.numero || obj;
                    favoritosDiv.innerHTML = '';
                    mostrarFavoritoEstrellaTren();
                    document.getElementById('clearNumeroTren').classList.add('visible');
                    document.getElementById('estrellaFavoritoNumero').classList.add('visible');
                    input.classList.add('input-con-x');
                });
                favoritosDiv.appendChild(item);
                const origenDestinoSpan = item.querySelector('.origenDestino-texto');
                const origenDestinoCont = item.querySelector('.origenDestino');
                if (origenDestinoSpan && origenDestinoCont &&
                    origenDestinoSpan.scrollWidth > origenDestinoCont.clientWidth) {
                    origenDestinoSpan.classList.add('desplazamiento-derecha');
                }
            });
            hayContenido = true;
        }

        if (hayContenido) {
            favoritosDiv.classList.add('visible');
        } else {
            favoritosDiv.classList.remove('visible');
        }
    } else {
        favoritosDiv.classList.remove('visible');
        favoritosDiv.innerHTML = '';
    }
}
function getUltimosTrenesBuscados() {
    return JSON.parse(localStorage.getItem('ultimosTrenesBuscados') || '[]');
}
export function addTrenBuscado(numero, origenDestino) {
    console.log(origenDestino);
    if (!numero) return;
    let ultimos = getUltimosTrenesBuscados();
    ultimos = ultimos.filter(t => t.numero !== numero); // Eliminar si ya existe
    ultimos.unshift({ numero, origenDestino }); // Añadir al principio
    if (ultimos.length > 5) ultimos = ultimos.slice(0, 5);
    localStorage.setItem('ultimosTrenesBuscados', JSON.stringify(ultimos));
}

// --- FUNCIONES GENERALES ---

function formatearTimestampFecha(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatearTimestampHora(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString('es-ES');
}

function formatearTimestampHoraTele(timestamp) {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); // SIN segundos
}

function calcularHoraReal(horaTeoricaStr, retrasoSegundos) {
    if (!horaTeoricaStr || retrasoSegundos === null) return '';
    const [horas, minutos, segundos] = horaTeoricaStr.split(':').map(Number);
    let totalSegundos = horas * 3600 + minutos * 60 + segundos + retrasoSegundos;
    totalSegundos = ((totalSegundos % 86400) + 86400) % 86400; // Manejar días y negativos

    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSegundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function calcularHoraRealTele(horaTeoricaStr, retrasoSegundos) {
    if (!horaTeoricaStr || retrasoSegundos === null) return '';
    // Permitir hora con o sin segundos
    let [horas, minutos, segundos] = horaTeoricaStr.split(':').map(Number);
    if (segundos === undefined || isNaN(segundos)) segundos = 0;
    let totalSegundos = horas * 3600 + minutos * 60 + segundos + retrasoSegundos;
    totalSegundos = ((totalSegundos % 86400) + 86400) % 86400; // Manejar días y negativos

    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSegundos % 60).toString().padStart(2, '0');
    return `${h}:${m}`; // si quieres mostrar sin segundos
}

function formatoRetraso(segundosTotales) {
    if (segundosTotales === null) return '';
    const negativo = segundosTotales < 0 ? '-' : '';
    const absSegundos = Math.abs(segundosTotales);
    const h = Math.floor(absSegundos / 3600);
    const m = Math.floor((absSegundos % 3600) / 60);
    const s = absSegundos % 60;

    if (h > 0) return `${negativo}${h}h ${m}m ${s}s`;
    if (m > 0) return `${negativo}${m}m ${s}s`;
    return `${negativo}${s}s`;
}

function getColorClass(delay) {
    if (delay === null) return '';
    if (delay < 0) return 'azul';
    if (delay < 180) return 'verde';
    if (delay < 600) return 'amarillo';
    return 'rojo';
}

export function upperCamelCase(texto) {
    const excluir = ['de', 'y', 'o', 'en', 'del', 'por', 'con', 'sin'];
    // Para tratar puntos, barras, guiones y apóstrofes como separadores pero sin añadir espacios
    let textoMod = texto.toLowerCase().replace(/-/g, ' - ');
    // Divide en palabras, pero también separa por puntos, barras, apóstrofes y espacios sin perderlos
    let palabras = textoMod.split(/([./('\s]+)/).filter(Boolean);
    palabras = palabras.map((palabra, i) => {
        if (
            palabra === '-' ||
            palabra === '.' ||
            palabra === '/' ||
            palabra === "'" ||
            palabra === "("
        ) return palabra;
        if (excluir.includes(palabra.trim()) && i !== 0) {
            return palabra;
        }
        // Si la palabra anterior es una barra, punto, guion o apóstrofe, poner mayúscula
        if (
            i > 0 &&
            (
                palabras[i - 1] === '/' ||
                palabras[i - 1] === '.' ||
                palabras[i - 1] === '-' ||
                palabras[i - 1] === "'" ||
                palabras[i - 1] === "("
            )
        ) {
            return palabra.charAt(0).toUpperCase() + palabra.slice(1);
        }
        return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    });
    // Une todo, pero elimina espacios alrededor de los puntos, barras, guiones y apóstrofes
    return palabras.join('')
        .replace(/\s*\.\s*/g, '.')
        .replace(/\s*-\s*/g, '-')
        .replace(/\s*\/\s*/g, '/')
        .replace(/\s*\(\s*/g, ' (')
        .replace(/\s*'\s*/g, "'");
}

// --- DICCIONARIOS DE TRADUCCIÓN ---

function traducirEstado(estado) {
    const traducciones = {
        "STOPPED": "DETENIDO", "PENDING_TO_CIRCULATE": "PENDIENTE DE CIRCULAR",
        "TRACKING_LOST": "SEGUIMIENTO PERDIDO", "RUNNING": "EN MARCHA",
        "SUPPRESSED": "SUPRIMIDO", "FINISHED": "FINALIZADO", "UNKNOWN": "DESCONOCIDO"
    };
    return traducciones[estado] || estado;
}

function traducirVia(estado) {
    const traducciones = {
        "RELIABLE_PLANNED": "PLANIFICADO (PROBABLE)", "PLANNED": "PLANIFICADO",
        "OPERATOR": "OPERADOR"
    };
    return traducciones[estado] || estado;
}

function traducirParada(parada) {
    const traducciones = { "COMMERCIAL": "COMERCIAL", "NO_STOP": "↓", "TECHNICAL": "TÉCNICA" };
    return traducciones[parada] || parada;
}

function traducirOperador(operador) {
    const operadores = getOperadores();
    return operadores[operador] || '';
}

function obtenerRutaPictograma(linea, core, adif) {
    const coreKey = (core || "").toUpperCase();
    const imgsNucleo = pictogramasCercanias[coreKey];
    if (linea && imgsNucleo && imgsNucleo[linea]) {
        return `img/pastillas/${imgsNucleo[linea]}`;
    }

    const prod = adif?.opeProComPro?.commercialProduct?.toUpperCase()?.trim();
    if (prod) {
        if (imgsNucleo && imgsNucleo[prod]) {
            return `img/pastillas/${imgsNucleo[prod]}`;
        }
        if (pictosPorProducto[prod]) {
            return `img/pastillas/${pictosPorProducto[prod]}`;
        }
    }

    const numeroTren = adif?.commercialPathKey?.commercialCirculationKey?.commercialNumber;
    if (numeroTren && pictosPorNumero[numeroTren]) {
        return `img/pastillas/${pictosPorNumero[numeroTren]}`;
    }

    return null;
}

function obtenerRutaIconoADIF(adif) {
    const { trafficType, opeProComPro = {} } = adif;
    const regla = reglas[trafficType?.toUpperCase()];
    if (!regla) return '';  // sin regla: nada

    // 1) turisticos y trenes concretos
    const numeroTren = adif?.commercialPathKey?.commercialCirculationKey?.commercialNumber;
    if (numeroTren && productoPorNumero[numeroTren]) {
        return `img/operadores/${productoPorNumero[numeroTren]}`;
    }

    // 2) operator si existe en la regla
    if (regla.operator) {
        const op = opeProComPro.operator?.toUpperCase();
        if (op && regla.operator[op]) {
            return `img/operadores/${regla.operator[op]}`;
        }
    }

    // 3) Núcleo específico
    if (regla.core) {
        const core = adif.core?.toUpperCase();
        if (core && regla.core[core] && !opeProComPro.commercialProduct.includes("RAM")) {
            return `img/operadores/${regla.core[core]}`;
        }
    }

    // 4) commercialProduct si existe en la regla
    if (regla.commercialProduct) {
        const prod = opeProComPro.commercialProduct?.toUpperCase();
        if (prod && regla.commercialProduct[prod]) {
            return `img/operadores/${regla.commercialProduct[prod]}`;
        }
    }

    // 5) default de este trafficType, si lo hay
    if (regla.default) {
        return `img/operadores/${regla.default}`;
    }

    // 6) sin default: nada
    return '';
}

// TELEINDICADOR

export async function renderizarPanelTeleindicador(datos) {
    datos = datos.slice(0, 25); //MOSTRAR SOLO PRIMEROS 25

    const tbody = document.getElementById("tablaTeleindicadorBody");
    const estaciones = getEstaciones();
    const tipo = getTipoPanel();

    document.getElementById("tablaTeleindicador").classList.remove("hidden");
    document.getElementById("btnFullScreenTele").classList.remove("hidden");

    // Función auxiliar para obtener el timestamp real (planificado + retraso)
    datos.sort((a, b) => {
        // Determinamos si usamos los datos de llegada o salida para cada tren
        const pasoA = tipo === 'llegadas'

            ? a.passthroughStep?.arrivalPassthroughStepSides
            : a.passthroughStep?.departurePassthroughStepSides;

        const pasoB = tipo === 'llegadas'
            ? b.passthroughStep?.arrivalPassthroughStepSides
            : b.passthroughStep?.departurePassthroughStepSides;

        // Usamos la función que ya existía
        const timestampA = getTimestampReal(pasoA || {});
        const timestampB = getTimestampReal(pasoB || {});

        return timestampA - timestampB;
    });

    if (!tbody) {
        console.error("No se encontró el tbody de la tabla del teleindicador");
        return;
    }

    tbody.innerHTML = "";
    if (!Array.isArray(datos) || datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay datos disponibles</td></tr>`;
        return;
    }

    for (const tren of datos) {
        const info = tren.commercialPathInfo || {};
        const infoextra = tipo === 'llegadas'
            ? tren.passthroughStep?.arrivalPassthroughStepSides || {}
            : tren.passthroughStep?.departurePassthroughStepSides || {};
        const estadoTrad = traducirEstado(infoextra.circulationState || "");

        const delaySec = infoextra.forecastedOrAuditedDelay || 0;
        const tacharHora = delaySec !== null
            && (delaySec >= 60 || delaySec < 0)
            && estadoTrad !== 'PENDIENTE DE CIRCULAR';

        const plannedMs = infoextra.plannedTime || 0;
        const horaPlan = plannedMs
            ? formatearTimestampHoraTele(plannedMs)
            : "-";
        let horaMostrada = horaPlan;

        // cálculo hora estimada (ms)
        const horaEstimMs = plannedMs
            ? plannedMs + delaySec * 1000
            : null;

        const horaEstimStr = calcularHoraRealTele(horaPlan, delaySec);

        if (tacharHora) {
            horaMostrada = `
        <span style="text-decoration:line-through;color:gray;">${horaPlan}</span><br>
        <span class="${getColorClass(delaySec)}">${horaEstimStr}</span>
      `;
        }

        // estación origen/destino
        const oriCode = info.commercialPathKey?.originStationCode || "-";
        const desCode = info.commercialPathKey?.destinationStationCode || "-";
        const origen = oriCode
            ? upperCamelCase(estaciones[oriCode.replace(/^0+/, '')] || oriCode)
            : "-";
        const destino = desCode
            ? upperCamelCase(estaciones[desCode.replace(/^0+/, '')] || desCode)
            : "-";

        // pictograma de línea
        const pictograma = obtenerRutaPictograma(info.line, info.core, info);

        // operador
        const opCode = info.opeProComPro?.operator || "";
        const opName = traducirOperador(opCode);

        // producto comercial / product
        const commProd = info.opeProComPro?.commercialProduct?.trim().toUpperCase() || "";
        const prod = info.opeProComPro?.product || "";

        // número de tren
        const numeroTren = info.commercialPathKey?.commercialCirculationKey?.commercialNumber || "-";

        // vía
        const llegada = tren.passthroughStep?.arrivalPassthroughStepSides;
        const salida = tren.passthroughStep?.departurePassthroughStepSides;
        const viaInfo = obtenerVia(salida, llegada); // Usamos la función existente
        const via = viaInfo.plataforma || "-";      // Obtenemos la plataforma del resultado

        // — Celda Hora —
        const fila = document.createElement("tr");
        const tdHora = document.createElement("td");
        tdHora.classList.add("hora-teleindicador");
        const diffMin = horaEstimMs ? (horaEstimMs - Date.now()) / 60000 : null;

        if (diffMin !== null && diffMin >= -5 && diffMin < 4 && estadoTrad !== 'SEGUIMIENTO PERDIDO') {
            tdHora.classList.add("parpadeante");
        }

        if (diffMin !== null && diffMin >= -1 && diffMin < 10 && estadoTrad !== 'SEGUIMIENTO PERDIDO') {
            const minutosRestantes = Math.floor(diffMin);
            const tiempoRestanteStr = `${Math.max(0, minutosRestantes)} min`;
            tdHora.innerHTML = `
        <div class="countdown-container">
            <span">${tiempoRestanteStr}</span><br>
            <span class="${estadoTrad !== 'PENDIENTE DE CIRCULAR' ? getColorClass(delaySec) : ''
                }">${horaEstimStr}</span>
        </div>
      `;
        } else {
            tdHora.innerHTML = horaMostrada;
        }

        // --- AVISO DE RETRASO “LIBRE” (independiente del resto de anuncios) ---
        try {
        const paso = (tipo === 'llegadas')
            ? tren.passthroughStep?.arrivalPassthroughStepSides
            : tren.passthroughStep?.departurePassthroughStepSides;

        const stopType = tren.passthroughStep?.stopType;
        const delaySeg  = Number(paso?.forecastedOrAuditedDelay || 0);
        const delayMin  = Math.max(0, Math.round(delaySeg / 60));
        const megafoniaOn = localStorage.getItem('megafoniaActivada') === 'true';
        let threshold = 5;
        if (commProd === "CERCANIAS") threshold = 10;

        // Solo anunciar si:
        //  - megafonía activada
        //  - el tren PARA en esta estación
        //  - supera +5 minutos
        //  - y el retraso es mayor que el último anunciado para este tren
        if (megafoniaOn && stopType !== 'NO_STOP' && prod !== 'M' && commProd !== 'MATERIAL VACIO' && commProd !== 'MATERIAL VACIO RAM' && commProd !== 'SERVICIO INTERNO' && commProd !== 'CERCANIAS RAM' && commProd !== 'REGIONAL RAM' && estadoTrad !== 'SEGUIMIENTO PERDIDO' && delayMin > threshold) {
            const idTren = tren?.commercialPathInfo?.commercialPathKey?.commercialCirculationKey?.commercialNumber || '';
            const ultimo = retrasosAnunciados[idTren] ?? 0;
            const diff = delayMin - (ultimo || 0);
            if (diff >= 2) {
                retrasosAnunciados[idTren] = delayMin;

                const estaciones = getEstaciones();
                const codigoDestino = (tipo === 'llegadas')
                    ? tren.commercialPathInfo?.commercialPathKey?.originStationCode
                    : tren.commercialPathInfo?.commercialPathKey?.destinationStationCode;
                const destino = estaciones[codigoDestino?.replace(/^0+/, '')] || codigoDestino;

                // Hora planificada (para anunciar “con salida/llegada a las HH:MM”)
                const fechaPlan = new Date(paso?.plannedTime || 0);
                const hh = String(fechaPlan.getHours()).padStart(2, '0');
                const mm = String(fechaPlan.getMinutes()).padStart(2, '0');
                const delayHours = Math.floor(delayMin / 60);
                const delayRemainMin = delayMin % 60;
                const delayAudio = [];
                delayAudio.push('mgf/frases/circula con un retraso de aproximadamente.wav');

                if (delayHours > 0) {
                    delayAudio.push(`mgf/horas/${String(delayHours).padStart(2,'0')} horas.wav`);
                    if (delayRemainMin > 0) {
                        delayAudio.push('mgf/motivos/MSG000 Y.wav'); // "y"
                        delayAudio.push(`mgf/minutos/${String(delayRemainMin).padStart(2,'0')} minutos.wav`);
                    }
                } else {
                    // menos de una hora → solo minutos
                    delayAudio.push(`mgf/minutos/${String(delayRemainMin).padStart(2,'0')} minutos.wav`);
                }

                const producto = (tren.commercialPathInfo?.opeProComPro?.commercialProduct || 'TREN')
                                    .toString().trim().toUpperCase();

                // Construye y encola el anuncio independiente de retraso
                const anuncioRetraso = [
                    'mgf/frases/Atención, por favor.wav',
                    `mgf/trenes/${producto}.wav`,
                    'mgf/frases/destino.wav',
                    await getStationAudioPath(destino),
                    `mgf/frases/con salida a las.wav`,
                    `mgf/horas/${hh} horas.wav`,
                    'mgf/motivos/MSG000 Y.wav',
                    `mgf/minutos/${mm} minutos.wav`,
                    ...delayAudio,
                    'mgf/frases/Rogamos disculpen las molestias.wav',
                ].filter(Boolean);

                enqueueSequence(anuncioRetraso);
                // usa la cola existente
                (function procesar() {
                    // esta función ya existe más arriba; si es privada, llama a la visible en tu archivo
                    // aquí simplemente invocas la que tienes:
                    // procesarColaDeAnuncios();
                })();
                procesarColaDeAnuncios();
            }
        }
        } catch (e) {
        console.debug('Aviso retraso: omitido por error de datos', e);
        }

        // --- LÓGICA DE MEGAFONÍA MODIFICADA ---
        const megafoniaActivada = document.getElementById('toggleMegafonia')?.checked;
        if (megafoniaActivada && numeroTren !== "-") {
            if (!trenesAnunciados[numeroTren]) {
                trenesAnunciados[numeroTren] = { min10: false, min5: false, min1: false };
            }

            const estadoAnuncio = trenesAnunciados[numeroTren];
            const minutosReales = diffMin !== null ? Math.floor(diffMin) : -1;
            
            // Identificamos el tipo de tren para aplicar reglas específicas
            const producto = info.opeProComPro?.commercialProduct?.trim().toUpperCase() || 'TREN';
            const stopType = tren.passthroughStep?.stopType || '';
            const isCercanias = producto === 'CERCANIAS';
            const isFeve = producto === 'CERCANIAS RAM';
            const isFeveR = producto === 'REGIONAL RAM';
            console.debug('Producto:', producto, 'isFeve:', isFeve, 'isCercanias:', isCercanias);

            // REGLA 1: Para "Material Vacio"
            if (producto === 'MATERIAL VACIO' || producto === 'MATERIAL VACIO RAM' || producto === 'SERVICIO INTERNO') {
                // Solo se anuncia a falta de 1 minuto
                if (minutosReales <= 1 && !estadoAnuncio.min1) {
                    estadoAnuncio.min1 = true;
                    anunciarMegafonia(tren, tipo, 'materialVacio'); // Un nuevo tipo de anuncio
                }
            }
            // REGLA 2: Para trenes sin parada comercial
            else if (stopType === 'NO_STOP') {
                // Se anuncia una sola vez cuando entra en el rango de 5 minutos
                if (minutosReales < 5 && !estadoAnuncio.min5) {
                    estadoAnuncio.min5 = true; // Usamos min5 como indicador de "ya anunciado"
                    anunciarMegafonia(tren, tipo, 'sinParada'); // Otro tipo de anuncio
                }
            }
            // REGLA 3: Para el resto de trenes (anuncios normales)
            else if (isCercanias) {
                // CERCANÍAS → solo a 5 y 1 min
                if (minutosReales === 4 && !estadoAnuncio.min5) {
                    estadoAnuncio.min5 = true;
                    anunciarMegafonia(tren, tipo, 'normal'); 
                }
                if (minutosReales <= 1 && !estadoAnuncio.min1) {
                    estadoAnuncio.min1 = true;
                    anunciarMegafonia(tren, tipo, 'salidaInminente');
                }
            } else if (isFeve) {
                // FEVE → solo a 5 y 1 min, pero tipo "feve"
                if (minutosReales === 4 && !estadoAnuncio.min5) {
                    estadoAnuncio.min5 = true;
                    anunciarMegafonia(tren, tipo, 'feve');
                }
                if (minutosReales <= 1 && !estadoAnuncio.min1) {
                    estadoAnuncio.min1 = true;
                    anunciarMegafonia(tren, tipo, 'salidaInminenteFeve');
                }
            } else if (isFeveR) {
                // FEVE → solo a 5 y 1 min, pero tipo "feve"
                if (minutosReales === 4 && !estadoAnuncio.min5) {
                    estadoAnuncio.min5 = true;
                    anunciarMegafonia(tren, tipo, 'feveRegional');
                }
                if (minutosReales <= 1 && !estadoAnuncio.min1) {
                    estadoAnuncio.min1 = true;
                    anunciarMegafonia(tren, tipo, 'salidaInminenteFeveRegional');
                }
            } else {
                // Resto de trenes → 10, 5 y 1 min
                if (minutosReales === 9 && !estadoAnuncio.min10) {
                    estadoAnuncio.min10 = true;
                    anunciarMegafonia(tren, tipo, 'normal');
                }
                if (minutosReales === 4 && !estadoAnuncio.min5) {
                    estadoAnuncio.min5 = true;
                    anunciarMegafonia(tren, tipo, 'normal');
                }
                if (minutosReales <= 1 && !estadoAnuncio.min1) {
                    estadoAnuncio.min1 = true;
                    anunciarMegafonia(tren, tipo, 'salidaInminente');
                }
            }
        }
        // --- FIN DE LA LÓGICA MODIFICADA ---

        // Comprobación si el tren es de mañana
        if (horaEstimMs) {
            const fechaTren = new Date(horaEstimMs);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy);
            manana.setDate(hoy.getDate() + 1);
            const pasado = new Date(hoy);
            pasado.setDate(hoy.getDate() + 2);

            if (
                fechaTren.getFullYear() === manana.getFullYear() &&
                fechaTren.getMonth() === manana.getMonth() &&
                fechaTren.getDate() === manana.getDate()
            ) {
                tdHora.innerHTML += `<br><span class="sin-parada-texto">Mañana</span>`;
            } else if (
                fechaTren.getFullYear() === pasado.getFullYear() &&
                fechaTren.getMonth() === pasado.getMonth() &&
                fechaTren.getDate() === pasado.getDate()
            ) {
                tdHora.innerHTML += `<br><span class="sin-parada-texto">Pasado</span>`;
            }
        }

        fila.appendChild(tdHora);

        // — Celda Destino/Origen —
        const tdDest = document.createElement("td");
        const wrapper = document.createElement("div");
        wrapper.className = "destino-con-pastilla";

        // Pictograma de línea (ej: C-1)
        if (pictograma) {
            const img = document.createElement("img");
            img.src = pictograma;
            img.alt = info.line || "";
            img.className = "pastilla-linea";
            wrapper.appendChild(img);
        }

        // Contenedor para el texto (destino y aviso de "sin parada")
        const textWrapper = document.createElement("div");
        textWrapper.className = "destino-texto-container";

        // Nombre del destino/origen
        const spanDest = document.createElement("span");
        spanDest.classList.add("linea-divisible");
        spanDest.classList.add("dividir-barra");
        spanDest.textContent = tipo === 'llegadas' ? origen : destino;
        textWrapper.appendChild(spanDest);

        // Comprobación para añadir "Tren sin parada"
        if (tren.passthroughStep?.stopType === "NO_STOP") {
            const noStopSpan = document.createElement("span");
            noStopSpan.textContent = "Tren sin parada";
            noStopSpan.className = "sin-parada-texto";
            textWrapper.appendChild(noStopSpan);
        }

        wrapper.appendChild(textWrapper);
        tdDest.appendChild(wrapper);
        fila.appendChild(tdDest);

        // — Celda Operador —
        let feveIcon = Number(localStorage.getItem('feveIcon')) || 0;

        const tdOp = document.createElement("td");
        let rutaOp = obtenerRutaIconoADIF(info);
        if (rutaOp === 'img/operadores/FEVE.png') {
            rutaOp = rutasOperadorFeve[feveIcon];
        }
        if (rutaOp) {
            const spanOp = document.createElement("span");
            spanOp.innerHTML = `
        <img src="${rutaOp}" 
             alt="${commProd || opCode}" 
             class="icono-operador" />
      `;

            //CAMBIAR LOGO FEVE AL HACER CLIC
            spanOp.querySelector("img.icono-operador").addEventListener("click", function () {
                if (/FEVE\d*\.png$/.test(this.src)) {
                    feveIcon = (feveIcon + 1) % rutasOperadorFeve.length;
                    localStorage.setItem('feveIcon', feveIcon);

                    // Precargar la nueva imagen
                    const nuevaSrc = rutasOperadorFeve[feveIcon];
                    const imgPreload = new Image();
                    imgPreload.src = nuevaSrc;
                    imgPreload.onload = () => {
                        // Animación flip solo cuando la imagen está lista
                        this.classList.add('flip');
                        setTimeout(() => {
                            this.src = nuevaSrc;
                            this.classList.remove('flip');
                        }, 200);

                        // Actualiza todos los FEVE*.png
                        document.querySelectorAll('img.icono-operador').forEach(img => {
                            if (img !== this && /FEVE\d*\.png$/.test(img.src)) {
                                img.classList.add('flip');
                                setTimeout(() => {
                                    img.src = nuevaSrc;
                                    img.classList.remove('flip');
                                }, 200);
                            }
                        });
                    };
                }
            });

            tdOp.appendChild(spanOp);
        }
        fila.appendChild(tdOp);

        // — Celda Nº Tren —
        const tdNum = document.createElement("td");
        const spanNum = document.createElement("span");
        spanNum.className = "numero-tren-clicable";
        spanNum.style = "font-size: 1.1em";
        spanNum.textContent = numeroTren;
        const fechaInicio = tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.launchingDate || '';
        spanNum.setAttribute("onclick", `buscarTrenClick('${numeroTren}', '${fechaInicio}')`);
        tdNum.appendChild(spanNum);
        fila.appendChild(tdNum);

        // — Celda Vía —
        const tdVia = document.createElement("td");
        tdVia.innerHTML = `<span style="font-size: 1.7em;">${via}</span>`;
        fila.appendChild(tdVia);

        // Añade fila
        tbody.appendChild(fila);
    };

    //PARA QUE SE DIVIDAN LAS BARRAS
    document.querySelectorAll('.linea-divisible').forEach(el => {
        el.innerHTML = el.textContent.replace(/([\/\-])/g, '$1\u200B');
    });
}

function actualizarHoraCabeceraTele() {
    const el = document.getElementById("hora-cabecera-tele");
    if (el) {
        if (el.classList.contains("parpadeante")) return; // Detener si no se está actualizando
        const ahora = new Date();
        const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const segundos = ahora.getSeconds().toString().padStart(2, '0');
        el.innerHTML = `${hora}<span class="segundos-hora">:${segundos}</span>`;
    }
}

export function iniciarIntervalosUI() {
    if (!horaCabeceraTeleIntervalId) {
        horaCabeceraTeleIntervalId = setInterval(actualizarHoraCabeceraTele, 1000);
    }
    actualizarHoraCabeceraTele();
}

export function limpiarIntervalosUI() {
    if (horaCabeceraTeleIntervalId) {
        clearInterval(horaCabeceraTeleIntervalId);
        horaCabeceraTeleIntervalId = null;
    }
}