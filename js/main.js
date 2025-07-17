// Importa funciones y almacena referencias
import { initTheme, toggleTheme } from './theme.js';
import { login, cerrarSesion, verificarSesionGuardada } from './auth.js';
import { buscarTren, clearResultados, buscarEstacion, cargarMas } from './api.js';
import { mostrarTrenAnterior, mostrarTrenSiguiente, autocompletarEstaciones, autocompletarEstacionesTele } from './ui.js';

// Elementos DOM principales
const DOMElements = {
    loginButton: document.getElementById("loginButton"),
    buscarTrenButton: document.getElementById("buscarTrenButton"),
    clearResultadosButton: document.getElementById("clearResultadosButton"),
    cerrarSesionButton: document.getElementById("cerrarSesionButton"),
    toggleThemeBtn: document.getElementById("toggleThemeBtn"),
    btnAnterior: document.getElementById("btnAnterior"),
    btnSiguiente: document.getElementById("btnSiguiente"),
    tabButtons: document.querySelectorAll(".tab-button"),
    pantallas: document.querySelectorAll(".pantalla"),
    inputEstación: document.getElementById("numeroEst"),
    sugerencias: document.getElementById("sugerencias"),
    buscarEstButton: document.getElementById("buscarEstButton"),
    cargarMas: document.getElementById("cargarMas"),

    // TELEINDICADOR
    stationInputTele: document.getElementById('stationInputTele'),
    clearBtnTele: document.getElementById('clearStationInputTele'),
    sugerenciasTele: document.getElementById('sugerenciasTele'),
    searchButtonTele: document.getElementById('searchButtonTele'),
    departureTele: document.getElementById('departureTele'),
    arrivalTele: document.getElementById('arrivalTele'),
    telePanel: document.getElementById('teleindicadorPanel')
};

// Setup de listeners para TODOS los apartados, incluido Teleindicador
function setupEventListeners() {
    // --------- MARCHAS / GENERAL ---------
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

    document.getElementById('numeroTren')?.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') buscarTren();
    });
    document.getElementById('numeroEst')?.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') buscarEstacion();
    });

    // Click fuera para sugerencias (Estaciones)
    document.addEventListener('click', function(event) {
        if (
            !DOMElements.sugerencias.contains(event.target) &&
            !DOMElements.inputEstación.contains(event.target) &&
            event.target !== DOMElements.inputEstación
        ) {
            DOMElements.sugerencias.classList.remove('visible');
        }
    });

    // Manejar tabs de navegación
    DOMElements.tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const destinoID = button.dataset.target;

            // Cambiar pestaña activa
            DOMElements.tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            // Oculta todos los tabs
            document.querySelectorAll('.pantalla, .tab-content').forEach(tab => tab.classList.remove("visible"));
            // Muestra solo el tab correspondiente
            if (destinoID === "consulta") {
                document.getElementById("consulta")?.classList.add("visible");
            } else if (destinoID === "estacion") {
                document.getElementById("estacion")?.classList.add("visible");
            } else if (destinoID === "teleindicador") {
                document.getElementById("teleindicadorTab")?.classList.add("visible");
            }
        });
    });

    // -------- TELEINDICADOR --------

    // Autocompletar Teleindicador
    DOMElements.stationInputTele?.addEventListener('input', function() {
        autocompletarEstacionesTele();
        if (this.value) {
            DOMElements.clearBtnTele.style.display = 'flex';
            this.classList.add('input-con-x');
        } else {
            DOMElements.clearBtnTele.style.display = 'none';
            this.classList.remove('input-con-x');
        }
    });
    DOMElements.stationInputTele?.addEventListener('focus', autocompletarEstacionesTele);

    // Limpiar input Teleindicador
    DOMElements.clearBtnTele?.addEventListener('click', () => {
        DOMElements.stationInputTele.value = '';
        DOMElements.clearBtnTele.style.display = 'none';
        DOMElements.stationInputTele.classList.remove('input-con-x');
        DOMElements.stationInputTele.focus();
        DOMElements.sugerenciasTele.innerHTML = '';
        DOMElements.sugerenciasTele.classList.remove('visible');
    });

    // Click fuera para sugerencias (Teleindicador)
    document.addEventListener('click', function(event) {
        if (
            !DOMElements.sugerenciasTele.contains(event.target) &&
            !DOMElements.stationInputTele.contains(event.target) &&
            event.target !== DOMElements.stationInputTele
        ) {
            DOMElements.sugerenciasTele.classList.remove('visible');
        }
    });

    // Mostrar botón X en Estaciones
    const numeroEst = document.getElementById('numeroEst');
    const clearBtn = document.getElementById('clearNumeroEst');
    numeroEst?.addEventListener('input', () => {
        if (numeroEst.value) {
            clearBtn.style.display = 'flex';
            numeroEst.classList.add('input-con-x');
        } else {
            clearBtn.style.display = 'none';
            numeroEst.classList.remove('input-con-x');
        }
    });
    clearBtn?.addEventListener('click', () => {
        numeroEst.value = '';
        clearBtn.style.display = 'none';
        numeroEst.classList.remove('input-con-x');
        numeroEst.focus();
    });

    // Buscar en Teleindicador por botón o Enter
    DOMElements.searchButtonTele?.addEventListener('click', searchTeleindicador);
    DOMElements.stationInputTele?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchTeleindicador();
        }
    });

    // Botones de Salidas/Llegadas Teleindicador
    DOMElements.departureTele?.addEventListener('click', function() {
        this.classList.add('selected');
        DOMElements.arrivalTele.classList.remove('selected');
    });
    DOMElements.arrivalTele?.addEventListener('click', function() {
        this.classList.add('selected');
        DOMElements.departureTele.classList.remove('selected');
    });
}

// --- Función principal búsqueda Teleindicador ---
function searchTeleindicador() {
    const input = DOMElements.stationInputTele;
    const stationCode = input.dataset.codigo;
    const tipo = DOMElements.departureTele.classList.contains('selected') ? 'salidas'
                : DOMElements.arrivalTele.classList.contains('selected') ? 'llegadas'
                : 'salidas';
    const tipoTren = document.getElementById('trainTypeTele').value;

    if (!stationCode) {
        DOMElements.telePanel.innerHTML = '<div>Selecciona una estación de la lista</div>';
        return;
    }

    buscarEstacion(stationCode, tipo, tipoTren)
        .then(data => {
            if (data && Array.isArray(data.commercialPaths)) {
                renderTeleindicadorResults(data.commercialPaths);
            } else if (Array.isArray(data)) {
                renderTeleindicadorResults(data);
            } else {
                renderTeleindicadorResults([]);
            }
        })
        .catch(() => {
            DOMElements.telePanel.innerHTML = '<div>Error al obtener los datos</div>';
        });
}

// --- Render tipo teleindicador (ajusta nombres según tu API si es necesario) ---
function renderTeleindicadorResults(trenes) {
    const panel = DOMElements.telePanel;
    panel.innerHTML = '';
    if (!trenes || !Array.isArray(trenes) || trenes.length === 0) {
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

// --- Inicialización general ---
async function init() {
    initTheme();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => console.log('Service Worker registrado con éxito.'))
            .catch(error => console.log('Fallo al registrar Service Worker:', error));
    }
    setupEventListeners();
    await verificarSesionGuardada();
}

window.addEventListener('load', init);
