// js/main.js

import { initTheme, toggleTheme } from './theme.js';
import { login, cerrarSesion, verificarSesionGuardada, } from './auth.js';
import { buscarTren, clearResultados, buscarEstacion, cargarMas, buscarEstacionPorCodigoParaTeleindicador } from './api.js';
import { mostrarTrenAnterior, mostrarTrenSiguiente, autocompletarEstaciones, autocompletarEstacionesTele, renderizarPanelTeleindicador } from './ui.js';

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
    document.getElementById("stationInputTele").addEventListener("input", autocompletarEstacionesTele);
    document.getElementById("stationInputTele").addEventListener("focus", autocompletarEstacionesTele);

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

            // Oculta todas las pantallas
            DOMElements.pantallas.forEach(p => p.classList.remove("visible"));

            // Muestra solo la seleccionada
            if (destinoID === "consulta") {
                document.getElementById("consulta")?.classList.add("visible");
            } else if (destinoID === "estacion") {
                document.getElementById("estacion")?.classList.add("visible");
            } else if (destinoID === "teleindicadorTab") {
                document.getElementById("teleindicadorTab")?.classList.add("visible");
            }

            // Actualiza el botón activo
            DOMElements.tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
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

document.getElementById("buscarTeleButton").addEventListener("click", async () => {
  // Asegúrate de que la pestaña teleindicador está activa
  mostrarTab('teleindicadorTab'); // (pon la función mostrarTab si no la tienes)
  
  const input = document.getElementById("stationInputTele");
  const codigo = input?.dataset?.codigo || "";
  const tipoPanel = document.getElementById("tipoPanelTele").value;
  const tipoTren = document.getElementById("trainTypeTele").value;
  const resultadosDiv = document.getElementById("teleindicadorPanel");

  let tipoTrenApi = tipoTren;
  if (tipoTren === "Todos") tipoTrenApi = "ALL";
  if (tipoTren === "Mercancías") tipoTrenApi = "GOODS";
  if (tipoTren === "AVLDMD") tipoTrenApi = "AVLDMD";
  if (tipoTren === "Cercanías") tipoTrenApi = "CERCANIAS";
  if (tipoTren === "Viajeros") tipoTrenApi = "TRAVELERS";
  if (tipoTren === "Otros") tipoTrenApi = "OTHERS";

  if (!codigo || !/^\d+$/.test(codigo)) {
    resultadosDiv.textContent = "Selecciona una estación válida.";
    return;
  }

  resultadosDiv.textContent = "Cargando...";

  try {
    const trenes = await buscarEstacionPorCodigoParaTeleindicador(codigo, tipoPanel, tipoTrenApi);
    if (trenes && trenes.length > 0) {
      renderizarPanelTeleindicador(trenes);
      resultadosDiv.textContent = "";
    } else {
      document.getElementById("tablaTeleindicadorBody").innerHTML = "";
      resultadosDiv.textContent = "No se encontraron trenes.";
    }
  } catch (err) {
    resultadosDiv.textContent = "Error al consultar el servidor.";
    console.error(err);
  }
});
