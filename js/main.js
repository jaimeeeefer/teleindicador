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

function mostrarTab(tabId) {
  document.querySelectorAll('.pantalla').forEach(div => div.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
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
  // 1) Recogemos el código (dataset.codigo) tal y como ya lo tenías
    const inputEst = document.getElementById("stationInputTele");
    const codigo = inputEst?.dataset?.codigo ?? "";

    // 2) Ahora leemos el tipo de panel SALIDAS/LLEGADAS
    //    directamente del <input hidden id="tipoPanelTele">
    const tipoPanel = document.getElementById("tipoPanelTele").value;

    // 3) Y el tipo de tren API (ALL, GOODS, AVLDMD…) del <input hidden id="trainTypeTele">
    //    ¡Ya viene en el formato correcto, no hace falta mapping!
    const tipoTrenApi = document.getElementById("trainTypeTele").value;

    const tbody = document.getElementById("tablaTeleindicadorBody");

    // Validación del código de estación
    if (!codigo || !/^\d+$/.test(codigo)) {
      tbody.innerHTML =
        "<tr><td colspan='7' style='text-align:center;'>Por favor, selecciona una estación válida de la lista.</td></tr>";
      return;
    }

    // Mensaje de carga y nos aseguramos de que esté visible la pestaña
    tbody.innerHTML =
      "<tr><td colspan='7' style='text-align:center;'>Cargando...</td></tr>";
    mostrarTab("teleindicadorTab");

    try {
      // Llamada a la API con los tres parámetros siempre definidos
      const trenes = await buscarEstacionPorCodigoParaTeleindicador(
        codigo,
        tipoPanel,
        tipoTrenApi
      );

      // Renderizamos la tabla con los datos
      renderizarPanelTeleindicador(trenes);
    } catch (err) {
      // En caso de error, indicarlo en la tabla y loggear
      tbody.innerHTML =
        "<tr><td colspan='7' style='text-align:center;'>Error al consultar el servidor. Inténtalo de nuevo.</td></tr>";
      console.error("Teleindicador >", err);
    }
  });
