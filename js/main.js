// js/main.js

import { initTheme, toggleTheme } from './theme.js';
import { login, cerrarSesion, verificarSesionGuardada, } from './auth.js';
import { buscarTren, clearResultados, buscarEstacion, cargarMas } from './api.js';
import { mostrarTrenAnterior, mostrarTrenSiguiente, autocompletarEstaciones } from './ui.js';

// ALMACENAR ELEMENTOS DEL DOM UNA SOLA VEZ
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
    cargarMas: document.getElementById("cargarMas")
};

function setupEventListeners() {
    DOMElements.loginButton.addEventListener("click", login);
    DOMElements.buscarTrenButton.addEventListener("click", buscarTren);
    DOMElements.clearResultadosButton.addEventListener("click", clearResultados);
    DOMElements.cerrarSesionButton.addEventListener("click", cerrarSesion);
    DOMElements.toggleThemeBtn.addEventListener("click", toggleTheme);
    DOMElements.btnAnterior.addEventListener("click", mostrarTrenAnterior);
    DOMElements.btnSiguiente.addEventListener("click", mostrarTrenSiguiente);
    DOMElements.inputEstación.addEventListener("input", autocompletarEstaciones);
    DOMElements.inputEstación.addEventListener("focus", autocompletarEstaciones);
    DOMElements.buscarEstButton.addEventListener("click", buscarEstacion);
    DOMElements.cargarMas.addEventListener("click", cargarMas);

    // Buscar tren con Enter
    document.getElementById('numeroTren').addEventListener('keyup', (event) => {
        if (event.key === 'Enter') buscarTren();
    });
    document.getElementById('numeroEst').addEventListener('keyup', (event) => {
        if (event.key === 'Enter') buscarEstacion();
    });

    document.addEventListener('click', function(event) {
        if (
            !DOMElements.sugerencias.contains(event.target) &&
            !DOMElements.inputEstación.contains(event.target) &&
            event.target !== DOMElements.inputEstación
        ) {
            DOMElements.sugerencias.classList.remove('visible');
        }
    });

    // Manejar tabs de navegación (marcha <-> estación)
    DOMElements.tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const destinoID = button.dataset.target;

            // Cambiar pestaña activa
            DOMElements.tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            // Cambiar pantalla visible
            if (destinoID === "consulta") {
                document.getElementById("estacion")?.classList.remove("visible");
                document.getElementById("consulta")?.classList.add("visible");
            } else if (destinoID === "estacion") {
                document.getElementById("consulta")?.classList.remove("visible");
                document.getElementById("estacion")?.classList.add("visible");
            }
        });
    });
}

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

// Control de select personalizados
document.querySelectorAll('.custom-select').forEach(function(select) {
  const selected = select.querySelector('.custom-select-selected');
  const options = select.querySelector('.custom-select-options');
  const hiddenInput = select.querySelector('input[type="hidden"]');

  selected.addEventListener('click', function(e) {
    select.classList.toggle('open');
    selected.classList.toggle('active');
  });

  options.querySelectorAll('div').forEach(function(option) {
    option.addEventListener('click', function(e) {
      options.querySelectorAll('div').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      selected.textContent = option.textContent;
      hiddenInput.value = option.getAttribute('data-value');
      select.classList.remove('open');
      selected.classList.remove('active');
    });
  });

  // Cerrar si se hace click fuera
  document.addEventListener('click', function(e) {
    if (!select.contains(e.target)) {
      select.classList.remove('open');
      selected.classList.remove('active');
    }
  });
});

const numeroEst = document.getElementById('numeroEst');
const clearBtn = document.getElementById('clearNumeroEst');

numeroEst.addEventListener('input', () => {
  if (numeroEst.value) {
    clearBtn.style.display = 'flex';
    numeroEst.classList.add('input-con-x');
  } else {
    clearBtn.style.display = 'none';
    numeroEst.classList.remove('input-con-x');
  }
});

clearBtn.addEventListener('click', () => {
  numeroEst.value = '';
  clearBtn.style.display = 'none';
  numeroEst.classList.remove('input-con-x');
  numeroEst.focus();
});


// --- TELEINDICADOR ---
import { getEstaciones } from './auth.js';

document.getElementById("buscarTele").addEventListener("click", buscarTeleindicador);
const inputTele = document.getElementById("teleEstacion");
const sugerenciasTele = document.getElementById("sugerenciasTele");

inputTele.addEventListener("input", () => autocompletarEstaciones(inputTele, sugerenciasTele));
inputTele.addEventListener("focus", () => autocompletarEstaciones(inputTele, sugerenciasTele));

async function buscarTeleindicador() {
  const estaciones = getEstaciones();
  const estacionesArray = Object.entries(estaciones);

  const estacionNombre = inputTele.value.trim().toLowerCase();
  const modo = document.getElementById("modoTele").value;
  const tipo = document.getElementById("tipoTele").value;
  const contenedor = document.getElementById("resultadoTeleindicador");
  contenedor.innerHTML = "";

  const coincidencia = estacionesArray.find(([_, nombre]) => nombre.toLowerCase() === estacionNombre);
  if (!coincidencia) {
    contenedor.innerHTML = "<p>Estación no encontrada.</p>";
    return;
  }
  const codigoEstacion = coincidencia[0];

  try {
    const response = await fetch(`https://tu-api-en-render.com/api/adif/estacion/${codigoEstacion}`);
    if (!response.ok) throw new Error("Error al obtener datos de la estación.");
    const data = await response.json();

    const trenes = data.commercialPaths.filter(item => {
      const info = item.commercialPathInfo;
      const paso = item.passthroughStep;
      const esEnEstacion = paso.stationCode === codigoEstacion;
      const cumpleModo = (modo === "salidas" && paso.departurePassthroughStepSides)
                      || (modo === "llegadas" && paso.arrivalPassthroughStepSides);
      const cumpleTipo = tipo === "TODOS" || info.trafficType === tipo;
      return esEnEstacion && cumpleModo && cumpleTipo;
    });

    trenes.sort((a, b) =>
      (a.passthroughStep.departurePassthroughStepSides?.plannedTime || 0) -
      (b.passthroughStep.departurePassthroughStepSides?.plannedTime || 0)
    );

    trenes.forEach(tren => {
      const info = tren.commercialPathInfo;
      const paso = tren.passthroughStep;
      const salida = paso.departurePassthroughStepSides;
      if (!salida) return;

      const hora = new Date(salida.plannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const destino = estaciones[info.commercialDestinationStationCode] || "¿?";
      const linea = info.commercialProduct || "";
      const numero = info.commercialCirculationKey.commercialNumber;
      const via = salida.plannedPlatform || "-";

      const fila = document.createElement("div");
      fila.className = "teleindicador-row";
      fila.innerHTML = `
        <div>${hora}</div>
        <div><span class="linea">${linea}</span></div>
        <div>${destino}</div>
        <div>${numero}</div>
        <div>${via}</div>
      `;
      contenedor.appendChild(fila);
    });

  } catch (error) {
    contenedor.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}
