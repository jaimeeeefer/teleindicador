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
            // DOMElements.pantallas.forEach(p => p.classList.remove("visible"));

            const screens = [
              document.getElementById('consulta'),
              document.getElementById('estacion'),
              document.getElementById('teleindicadorTab')
            ];

            screens.forEach(el => el?.classList.remove('visible'));

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
const numeroTele = document.getElementById('stationInputTele');
const clearBtn = document.getElementById('clearNumeroEst');
const clearBtnTele = document.getElementById('clearNumeroTele');

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

numeroTele.addEventListener('input', () => {
  if (numeroTele.value) {
    clearBtnTele.style.display = 'flex';
    numeroTele.classList.add('input-con-x');
  } else {
    clearBtnTele.style.display = 'none';
    numeroTele.classList.remove('input-con-x');
  }
});

clearBtnTele.addEventListener('click', () => {
  numeroTele.value = '';
  clearBtnTele.style.display = 'none';
  numeroTele.classList.remove('input-con-x');
  numeroTele.focus();
});

document.getElementById("buscarTeleButton").addEventListener("click", async () => {
  const input = document.getElementById("stationInputTele");
  const codigo = input?.dataset?.codigo || "";
  const tipoPanel = document.getElementById("tipoPanelTele").textContent.toLowerCase();
  const tipoTren = document.getElementById("trainTypeTele").textContent;
  const tbody = document.getElementById("tablaTeleindicadorBody");

  // Valida que se haya seleccionado una estación
  if (!codigo || !/^\d+$/.test(codigo)) {
    tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Por favor, selecciona una estación válida de la lista.</td></tr>";
    return;
  }

  // 1. Muestra el estado de "Cargando..." dentro de la tabla
  tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Cargando...</td></tr>";

  try {
    // 2. Convierte la selección del usuario al formato que espera la API
    let tipoTrenApi = "ALL";
    const tipoTrenMapping = {
        "Todos": "ALL",
        "Mercancías": "GOODS",
        "AVLDMD": "AVLDMD",
        "Cercanías": "CERCANIAS",
        "Viajeros": "TRAVELERS",
        "Otros": "OTHERS"
    };
    if (tipoTrenMapping[tipoTren]) {
        tipoTrenApi = tipoTrenMapping[tipoTren];
    }
    
    // 3. Llama a la API y espera los resultados
    const trenes = await buscarEstacionPorCodigoParaTeleindicador(codigo, tipoPanel, tipoTrenApi);
    
    // 4. Pasa los datos (o un array vacío) a la función de renderizado
    renderizarPanelTeleindicador(trenes); 

  } catch (err) {
    // 5. Si hay un error en la llamada, muéstralo también dentro de la tabla
    tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Error al consultar el servidor. Inténtalo de nuevo.</td></tr>";
    console.error(err);
  }
});
