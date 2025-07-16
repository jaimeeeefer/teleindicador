// js/ui.js

import { getTrenActual, getTrenes, setTrenActual , getProximosTrenes, getPaginaActual, setPaginaActual, getTipoPanel } from './api.js';
import { getEstaciones, getOperadores, getAuthHeader } from './auth.js'; // Asegúrate de importar getAuthHeader y getEstaciones

let lastDate = null;


// CACHE DE ELEMENTOS DEL DOM PARA LA UI
const uiElements = {
    cargandoScreen: document.getElementById("cargando"),
    verifyInfo: document.getElementById("verifyInfo"),
    loginScreen: document.getElementById("login"),
    consultaScreen: document.getElementById("consulta"),
    resultadoTrenDiv: document.getElementById("resultadoTren"),
    resultadoEstacionDiv: document.getElementById("resultadoEstacion"),
    infoTrenDiv: document.getElementById("infoTren"),
    tablaPasosBody: document.getElementById("tablaPasos")?.querySelector("tbody"),
    tablaPanelBody: document.getElementById("tablaPanel")?.querySelector("tbody"),
    resultadoPre: document.getElementById("resultado"),
    btnAnterior: document.getElementById("btnAnterior"),
    btnSiguiente: document.getElementById("btnSiguiente"),
    contadorTrenSpan: document.getElementById("contadorTren"),
    clearResultadosButton: document.getElementById("clearResultadosButton"),
    cerrarSesionButton: document.getElementById("cerrarSesionButton"),
    sugerencias: document.getElementById('sugerencias'),
    cargarMas: document.getElementById("cargarMas"),
    resultadoTeleDiv: document.getElementById("resultadoTele"), // Añadido para el teleindicador
};

export function clearLastDate() {
    lastDate = null;
}

// --- FUNCIONES DE VISIBILIDAD Y ESTADO ---

export function mostrarPantalla(screenId) {
    document.querySelectorAll(".pantalla").forEach(pantalla => {
        if (!['cargando', 'titulo', 'login', 'tabs', 'botonesCentro'].includes(pantalla.id)) {
            pantalla.classList.remove("visible");
        }
    });
    document.getElementById(screenId)?.classList.add("visible");
}

export function setVerifyingState(isVerifying, message = "") {
    if (isVerifying) {
        uiElements.cargandoScreen.classList.add("visible");
        uiElements.verifyInfo.textContent = message;
    } else {
        uiElements.cargandoScreen.classList.remove("visible");
        uiElements.verifyInfo.textContent = "";
    }
}

// --- FUNCIONES PARA LA VISUALIZACIÓN DE TRENES Y ESTACIONES ---

export function mostrarTren(tren) {
    // ... (Mantén tu función mostrarTren existente) ...
    // Esta función probablemente ya está en tu ui.js
}

export function mostrarEstacion(estacion) {
    // ... (Mantén tu función mostrarEstacion existente) ...
    // Esta función probablemente ya está en tu ui.js
}

export function mostrarTrenAnterior() {
    // ... (Mantén tu función mostrarTrenAnterior existente) ...
}

export function mostrarTrenSiguiente() {
    // ... (Mantén tu función mostrarTrenSiguiente existente) ...
}

export function autocompletarEstaciones(texto, sugerenciasDiv, inputElement, clearButton) {
    const estaciones = getEstaciones(); // Accede a las estaciones cargadas
    const valor = texto.toLowerCase();
    sugerenciasDiv.innerHTML = ''; // Limpia sugerencias anteriores

    if (valor.length < 2) {
        clearButton.style.display = 'none';
        return;
    }

    clearButton.style.display = 'block';

    const coincidencias = Object.entries(estaciones).filter(([codigo, nombre]) =>
        nombre.toLowerCase().includes(valor) || codigo.includes(valor)
    ).slice(0, 10); // Limita a 10 sugerencias

    coincidencias.forEach(([codigo, nombre]) => {
        const div = document.createElement('div');
        div.classList.add('sugerencia-item');
        div.textContent = `${nombre} (${codigo})`;
        div.addEventListener('click', () => {
            inputElement.value = codigo;
            sugerenciasDiv.innerHTML = '';
            clearButton.style.display = 'block';
        });
        sugerenciasDiv.appendChild(div);
    });
}


export function finCargarMas() {
    // ... (Mantén tu función finCargarMas existente) ...
}

// --- FUNCIONES AUXILIARES DE TIEMPO Y ESTADO ---

export function formatTime(segundosTotales) {
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

// --- DICCIONARIOS DE TRADUCCIÓN ---

function traducirEstado(estado) {
    const traducciones = {
        "STOPPED": "DETENIDO", "PENDING_TO_CIRCULATE": "PENDIENTE DE CIRCULAR",
        "TRACKING_LOST": "SEGUIMIENTO PERDIDO", "RUNNING": "EN MARCHA",
        "SUPPRESSED": "SUPRIMIDO", "FINISHED": "FINALIZADO"
    };
    return traducciones[estado] || estado;
}

function traducirVia(estado) {
    const traducciones = {
        "RELIABLE_PLANNED": "PLANIFICADO (PROBABLE)",
        "FORECASTED": "PREVISTA",
        "PREASSIGNED": "PREASIGNADA",
        "AUDITED": "AUDITADA",
        "REAL": "REAL",
        "THEORETICAL": "TEÓRICA",
        "OPERATOR": "OPERADOR" // Nuevo estado posible
    };
    return traducciones[estado] || estado;
}


// --- FUNCIÓN ESPECÍFICA PARA EL TELEINDICADOR ---
export async function buscarTeleindicador() {
  const input = document.getElementById("numeroTeleEst");
  const resultado = uiElements.resultadoTeleDiv; // Usar el elemento cacheado
  const modo = document.querySelector(".modo-btn.selected")?.dataset.modo || "salidas";
  const tipo = document.getElementById("tipoTele").value;
  const numero = input.value.trim();
  const pagina = 0; // Por ahora, la API no devuelve paginación para esto directamente
  const viajeros = "BOTH";
  const parada = "BOTH";

  if (!numero) {
    resultado.innerHTML = '<div class="tele-no-results">Introduce una estación válida.</div>';
    return;
  }

  resultado.innerHTML = '<div class="tele-loading">Consultando…</div>';

  try {
    const response = await fetch(`https://adif-api.onrender.com/${modo}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": getAuthHeader() // Obtener el token de autorización
      },
      body: JSON.stringify({ numero, pagina, viajeros, parada, tipo })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en la consulta: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const trenes = data.commercialPaths || [];
    const estaciones = getEstaciones(); // Obtener el mapa de estaciones

    if (!trenes.length) {
      resultado.innerHTML = '<div class="tele-no-results">No hay resultados para la estación indicada.</div>';
      return;
    }

    let teleindicadorHTML = `
      <div class="tele-header">
        <span class="tele-header-hora">Hora</span>
        <span class="tele-header-linea">Línea</span>
        <span class="tele-header-destino">${modo === 'salidas' ? 'Destino' : 'Origen'}</span>
        <span class="tele-header-operador">Operador</span>
        <span class="tele-header-numero">Nº Tren</span>
        <span class="tele-header-via">Vía</span>
      </div>
    `;

    trenes.forEach(tren => {
      const info = tren.commercialPathInfo || {};
      const paso = tren.passthroughStep || {};

      // Obtener hora (Llegada o Salida según el modo)
      let plannedTime = null;
      if (modo === 'salidas') {
          plannedTime = paso.departurePassthroughStepSides?.plannedTime;
      } else { // 'llegadas'
          plannedTime = paso.arrivalPassthroughStepSides?.plannedTime;
      }

      const hora = plannedTime ? new Date(plannedTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—';

      // Obtener origen/destino
      const origenCodigo = info.commercialOriginStationCode;
      const destinoCodigo = info.commercialDestinationStationCode;

      // Usar el mapa de estaciones para traducir códigos a nombres
      const obtenerNombreEstacion = (codigo) => estaciones[codigo] || `Código ${codigo}`;


      const origenNombre = obtenerNombreEstacion(origenCodigo);
      const destinoNombre = obtenerNombreEstacion(destinoCodigo);

      const destinoOrigenDisplay = modo === 'salidas' ? destinoNombre : origenNombre;

      const linea = info.line || "—"; // CORRECCIÓN: Usar info.line
      const via = paso.plannedPlatform || "-";
      const operador = tren.operatorName || "Renfe";
      const numeroTren = tren.trainNumber || "—";

      teleindicadorHTML += `
        <div class="tele-row">
          <span class="tele-hora">${hora}</span>
          <span class="tele-linea">${linea}</span>
          <span class="tele-destino">${destinoOrigenDisplay}</span>
          <span class="tele-operador">${operador}</span>
          <span class="tele-numero">${numeroTren}</span>
          <span class="tele-via">${via}</span>
        </div>
      `;
    });

    resultado.innerHTML = teleindicadorHTML;

  } catch (error) {
    console.error("Error en buscarTeleindicador:", error);
    resultado.innerHTML = `<div class="tele-error">Error al cargar datos: ${error.message}. Asegúrate de que la estación es correcta y tienes sesión iniciada.</div>`;
  }
}
