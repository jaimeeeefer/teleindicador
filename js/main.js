// --- IMPORTACIONES ---
import { initTheme, toggleTheme } from './theme.js';
import { login, cerrarSesion, verificarSesionGuardada } from './auth.js';
import { buscarTren, clearResultados, buscarEstacion, cargarMas, buscarEstacionPorCodigoParaTeleindicador } from './api.js';
import { mostrarTrenAnterior, mostrarTrenSiguiente, autocompletarEstaciones, autocompletarEstacionesTele } from './ui.js';

// --- REFERENCIAS DOM ---
const DOMElements = {
    loginButton: document.getElementById("loginButton"),
    buscarTrenButton: document.getElementById("buscarTrenButton"),
    clearResultadosButton: document.getElementById("clearResultadosButton"),
    cerrarSesionButton: document.getElementById("cerrarSesionButton"),
    toggleThemeBtn: document.getElementById("toggleThemeBtn"),
    btnAnterior: document.getElementById("btnAnterior"),
    btnSiguiente: document.getElementById("btnSiguiente"),
    tabButtons: document.querySelectorAll(".tab-button"),
    inputEstación: document.getElementById("numeroEst"),
    sugerencias: document.getElementById("sugerencias"),
    buscarEstButton: document.getElementById("buscarEstButton"),
    cargarMas: document.getElementById("cargarMas"),
    numeroTrenInput: document.getElementById("numeroTren"),

    // TELEINDICADOR
    searchButtonTele: document.getElementById('searchButtonTele'),
    stationInputTele: document.getElementById('stationInputTele'),
    clearBtnTele: document.getElementById('clearStationInputTele'),
    sugerenciasTele: document.getElementById('sugerenciasTele'),
    departureTele: document.getElementById('departureTele'),
    arrivalTele: document.getElementById('arrivalTele'),
    telePanel: document.getElementById('teleindicadorPanel'),
    trainTypeTele: document.getElementById('trainTypeTele')
};

// --- EVENTOS ---
function setupEventListeners() {
    DOMElements.loginButton?.addEventListener("click", login);
    DOMElements.buscarTrenButton?.addEventListener("click", buscarTren);
    DOMElements.clearResultadosButton?.addEventListener("click", clearResultados);
    DOMElements.cerrarSesionButton?.addEventListener("click", cerrarSesion);
    DOMElements.toggleThemeBtn?.addEventListener("click", toggleTheme);
    DOMElements.btnAnterior?.addEventListener("click", mostrarTrenAnterior);
    DOMElements.btnSiguiente?.addEventListener("click", mostrarTrenSiguiente);
    DOMElements.inputEstación?.addEventListener("input", autocompletarEstaciones);
    DOMElements.inputEstación?.addEventListener("focus", autocompletarEstaciones);
    DOMElements.buscarEstButton?.addEventListener("click", buscarEstacion);
    DOMElements.cargarMas?.addEventListener("click", cargarMas);
    DOMElements.numeroTrenInput?.addEventListener('keyup', e => { if (e.key === 'Enter') buscarTren(); });
    DOMElements.inputEstación?.addEventListener('keyup', e => { if (e.key === 'Enter') buscarEstacion(); });

    DOMElements.tabButtons.forEach(button => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-target");

        // Oculta todos los paneles
        document.querySelectorAll(".tab-content").forEach(panel => {
          panel.style.display = "none";
        });

        // Elimina clase activa de todos los botones
        DOMElements.tabButtons.forEach(btn => btn.classList.remove("active"));

        // Muestra el panel objetivo
        document.getElementById(`${target}Panel`).style.display = "block";

        // Marca este botón como activo
        button.classList.add("active");
      });
    });

    // TELEINDICADOR
    DOMElements.searchButtonTele?.addEventListener("click", searchTeleindicador);
    DOMElements.stationInputTele?.addEventListener("keydown", function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchTeleindicador();
        }
    });
    DOMElements.stationInputTele?.addEventListener("input", function () {
        autocompletarEstacionesTele();
        if (this.value) {
            DOMElements.clearBtnTele.style.display = 'flex';
            this.classList.add('input-con-x');
        } else {
            DOMElements.clearBtnTele.style.display = 'none';
            this.classList.remove('input-con-x');
        }
    });
    DOMElements.clearBtnTele?.addEventListener('click', () => {
        DOMElements.stationInputTele.value = '';
        DOMElements.clearBtnTele.style.display = 'none';
        DOMElements.stationInputTele.classList.remove('input-con-x');
        DOMElements.stationInputTele.focus();
        DOMElements.sugerenciasTele.innerHTML = '';
        DOMElements.sugerenciasTele.classList.remove('visible');
    });
    document.addEventListener('click', function(event) {
        if (!DOMElements.sugerenciasTele.contains(event.target) &&
            !DOMElements.stationInputTele.contains(event.target)) {
            DOMElements.sugerenciasTele.classList.remove('visible');
        }
    });
    DOMElements.departureTele?.addEventListener('click', function () {
        this.classList.add('selected');
        DOMElements.arrivalTele.classList.remove('selected');
    });
    DOMElements.arrivalTele?.addEventListener('click', function () {
        this.classList.add('selected');
        DOMElements.departureTele.classList.remove('selected');
    });
}

// --- BUSQUEDA TELEINDICADOR ---
function searchTeleindicador() {
    const input = DOMElements.stationInputTele;
    const stationCode = input.dataset.codigo;
    const tipoPanel = DOMElements.departureTele.classList.contains('selected') ? 'salidas' : 'llegadas';
    const tipoTren = DOMElements.trainTypeTele.value;

    if (!stationCode) {
        DOMElements.telePanel.innerHTML = '<div>Selecciona una estación de la lista</div>';
        return;
    }

    buscarEstacionPorCodigoParaTeleindicador(stationCode, tipoPanel, tipoTren)
        .then(trenes => {
            renderTeleindicadorResults(trenes);
        })
        .catch(() => {
            DOMElements.telePanel.innerHTML = '<div>Error al obtener los datos</div>';
        });
}

function renderTeleindicadorResults(trenes) {
    const panel = DOMElements.telePanel;
    panel.innerHTML = '';
    if (!trenes || trenes.length === 0) {
        panel.innerHTML = '<div>No hay trenes para mostrar.</div>';
        return;
    }

    panel.innerHTML = `
      <div class="teleindicador-row teleindicador-header">
        <div>Hora</div>
        <div>Línea</div>
        <div>Destino</div>
        <div>Recorrido</div>
        <div>Operador</div>
        <div>Nº Tren</div>
        <div>Vía</div>
      </div>
    `;

    trenes.forEach(tren => {
        const linea = tren.commercialPathInfo?.line ?? '';
        const hora = tren.passThroughStep?.hora_programada ?? '';
        const destino = tren.commercialPathInfo?.destination ?? '';
        const recorrido = tren.commercialPathInfo?.route ?? '';
        const operador = tren.commercialPathInfo?.company ?? '';
        const numero = tren.commercialPathInfo?.number ?? '';
        const via = tren.passThroughStep?.platform ?? '';

        panel.innerHTML += `
          <div class="teleindicador-row">
            <div>${hora}</div>
            <div>${linea}</div>
            <div>${destino}</div>
            <div>${recorrido}</div>
            <div>${operador}</div>
            <div>${numero}</div>
            <div>${via}</div>
          </div>
        `;
    });
}

// --- INICIALIZACIÓN ---
async function init() {
    initTheme();
    setupEventListeners();
    await verificarSesionGuardada();
}

window.addEventListener('load', init);
