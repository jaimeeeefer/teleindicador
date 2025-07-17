// js/main.js

import { initTheme, toggleTheme } from './theme.js';
import { login, cerrarSesion, verificarSesionGuardada, } from './auth.js';
import { buscarTren, clearResultados, buscarEstacion, cargarMas } from './api.js';
import { mostrarTrenAnterior, mostrarTrenSiguiente, autocompletarEstaciones, autocompletarEstacionesTele } from './ui.js';

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
const stationInputTele = document.getElementById('stationInputTele');
const clearBtnTele = document.getElementById('clearStationInputTele');
const sugerenciasTele = document.getElementById('sugerenciasTele');

stationInputTele.addEventListener('input', function() {
  autocompletarEstacionesTele();
  if (stationInputTele.value) {
    clearBtnTele.style.display = 'flex';
    stationInputTele.classList.add('input-con-x');
  } else {
    clearBtnTele.style.display = 'none';
    stationInputTele.classList.remove('input-con-x');
  }
});
stationInputTele.addEventListener('focus', autocompletarEstacionesTele);

clearBtnTele.addEventListener('click', () => {
  stationInputTele.value = '';
  clearBtnTele.style.display = 'none';
  stationInputTele.classList.remove('input-con-x');
  stationInputTele.focus();
  sugerenciasTele.innerHTML = '';
  sugerenciasTele.classList.remove('visible');
});

document.addEventListener('click', function(event) {
  if (!sugerenciasTele.contains(event.target) &&
      !stationInputTele.contains(event.target) &&
      event.target !== stationInputTele) {
    sugerenciasTele.classList.remove('visible');
  }
});


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



// Cuando se pulse el botón de buscar en teleindicador
document.getElementById('searchButtonTele').addEventListener('click', function() {
  searchTeleindicador();
});

function searchTeleindicador() {
  const input = document.getElementById('stationInputTele');
  const stationName = input.value.trim();
  const stationCode = input.dataset.codigo;  // <-- ahora usas esto

  const tipo = document.getElementById('departureTele').classList.contains('selected') ? 'salidas'
              : document.getElementById('arrivalTele').classList.contains('selected') ? 'llegadas'
              : 'salidas';
  const tipoTren = document.getElementById('trainTypeTele').value;

  // Si no hay código, muestra mensaje de aviso:
  if (!stationCode) {
    document.getElementById('teleindicadorPanel').innerHTML = '<div>Selecciona una estación de la lista</div>';
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
      document.getElementById('teleindicadorPanel').innerHTML = '<div>Error al obtener los datos</div>';
    });
}

// Botones de llegadas/salidas
document.getElementById('departureTele').addEventListener('click', function() {
  this.classList.add('selected');
  document.getElementById('arrivalTele').classList.remove('selected');
});
document.getElementById('arrivalTele').addEventListener('click', function() {
  this.classList.add('selected');
  document.getElementById('departureTele').classList.remove('selected');
});

// Render tipo teleindicador (ajusta los nombres de campos si es necesario)
function renderTeleindicadorResults(trenes) {
  const panel = document.getElementById('teleindicadorPanel');
  panel.innerHTML = '';
  if (!trenes || !Array.isArray(trenes) || trenes.length === 0) {
    panel.innerHTML = '<div>No hay trenes para mostrar.</div>';
    return;
  }

  // Cabecera tipo ADIF
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
