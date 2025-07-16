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
  document.getElementById("buscarTele")?.addEventListener("click", buscarTeleindicador);
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

    // Manejar tabs de navegación
    DOMElements.tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const destinoID = button.dataset.target;

            // Cambiar pestaña activa
            DOMElements.tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            // Ocultar todas las pantallas y luego mostrar la deseada
            DOMElements.pantallas.forEach(pantalla => {
                // Excluye las pantallas que deben estar siempre visibles (cargando, titulo, login, tabs, botonesCentro)
                // Ajusta los IDs según tus necesidades.
                if (!['cargando', 'titulo', 'login', 'tabs', 'botonesCentro'].includes(pantalla.id)) {
                    pantalla.classList.remove("visible");
                }
            });

            // Mostrar la pantalla correspondiente
            const targetScreen = document.getElementById(destinoID);
            if (targetScreen) {
                targetScreen.classList.add("visible");
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

    // --- IMPORTANTE: Inicializar la visibilidad de las pantallas al cargar ---
    // Ocultar todas las pantallas de contenido principal
    DOMElements.pantallas.forEach(pantalla => {
        // Asegúrate de que esta lista de IDs coincide con las pantallas que NO quieres ocultar
        // como las de carga, título, login y los botones de control principales.
        if (!['cargando', 'titulo', 'login', 'tabs', 'botonesCentro'].includes(pantalla.id)) {
            pantalla.classList.remove("visible");
        }
    });

    // Mostrar la pantalla de la pestaña activa por defecto (la que tiene 'active' en el botón)
    const activeTabButton = document.querySelector('.tab-button.active');
    if (activeTabButton) {
        const targetScreenId = activeTabButton.dataset.target;
        const targetScreen = document.getElementById(targetScreenId);
        if (targetScreen) {
            targetScreen.classList.add('visible');
        }
    }
    // Si necesitas que los botones de centro se muestren siempre con las pestañas de contenido:
    document.getElementById('botonesCentro').classList.add('visible');
    // --- FIN IMPORTANTE ---
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

// Added a clear button for the teleindicador input
const numeroTeleEst = document.getElementById('numeroTeleEst');
const clearTeleBtn = document.getElementById('clearNumeroTeleEst');

numeroTeleEst.addEventListener('input', () => {
  if (numeroTeleEst.value) {
    clearTeleBtn.style.display = 'flex';
    numeroTeleEst.classList.add('input-con-x');
  } else {
    clearTeleBtn.style.display = 'none';
    numeroTeleEst.classList.remove('input-con-x');
  }
});

clearTeleBtn.addEventListener('click', () => {
  numeroTeleEst.value = '';
  clearTeleBtn.style.display = 'none';
  numeroTeleEst.classList.remove('input-con-x');
  numeroTeleEst.focus();
});


export async function buscarTeleindicador() {
  const input = document.getElementById("numeroTeleEst");
  const resultado = document.getElementById("resultadoTele");
  const modo = document.querySelector(".modo-btn.selected")?.dataset.modo || "salidas";
  const tipo = document.getElementById("tipoTele").value;
  const numero = input.value.trim().padStart(5, '0');
  const pagina = 0;
  const viajeros = "BOTH";
  const parada = "BOTH";

  if (!numero) {
    resultado.textContent = "Introduce una estación válida.";
    return;
  }

  resultado.innerHTML = "Consultando…";

  try {
    const response = await fetch(`https://adif-api.onrender.com/${modo}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": getAuthHeader()
      },
      body: JSON.stringify({ numero, pagina, viajeros, parada, tipo })
    });

    if (!response.ok) throw new Error("Error en la consulta");

    const data = await response.json();
    const trenes = data.commercialPaths || [];

    if (!trenes.length) {
      resultado.innerHTML = "No hay resultados para la estación indicada.";
      return;
    }

    resultado.innerHTML = trenes.map(tren => {
      const info = tren.commercialPathInfo || {};
      const paso = tren.passthroughStep || {};
      const hora = new Date(paso.plannedTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const destino = info.destinationStationName || "¿?";
      const linea = info.circulationLineId || "";
      const via = paso.plannedPlatform || "-";
      const operador = tren.operatorName || "Renfe";
      const numeroTren = tren.trainNumber || "—";

      return `
        <div class="tele-row">
          <span class="tele-hora">${hora}</span>
          <span class="tele-linea">${linea}</span>
          <span class="tele-destino">${destino}</span>
          <span class="tele-operador">${operador}</span>
          <span class="tele-numero">${numeroTren}</span>
          <span class="tele-via">${via}</span>
        </div>
      `;
    }).join("");

  } catch (error) {
    resultado.textContent = "Error: " + error.message;
  }
}