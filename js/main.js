import { initTheme, toggleTheme } from './theme.js';
import {
  login,
  cerrarSesion,
  verificarSesionGuardada,
  getEstaciones,
  getOperadores
} from './auth.js';
import {
  buscarTren,
  clearResultados,
  buscarEstacion,
  cargarMas,
  getUltimaBusquedaTeleindicador,
  getTipoPanel,
  getTrenes
} from './api.js';
import {
  mostrarTrenAnterior,
  mostrarTrenSiguiente,
  mostrarEstacion,
  autocompletarEstaciones,
  toggleFavoritoEstacion,
  mostrarFavoritoEstrella,
  toggleFavoritoTren,
  mostrarFavoritoEstrellaTren,
  mostrarFavoritosTren,
  iniciarIntervalosUI,
  descargarMarchaXLSX,
  descargarMarchaPDF,
  descargarPanelXLSX,
  descargarPanelPDF,
  limpiarIntervalosUI,
  upperCamelCase
} from './ui.js';

const DOMElements = {
  // — Global UI
  loginButton: document.getElementById("loginButton"),
  toggleThemeBtn: document.getElementById("toggleThemeBtn"),
  cerrarSesionButton: document.getElementById("cerrarSesionButton"),
  clearResultadosButton: document.getElementById("clearResultadosButton"),

  // — Tren
  buscarTrenButton: document.getElementById("buscarTrenButton"),
  trenInput: document.getElementById("numeroTren"),
  clearTrenBtn: document.getElementById("clearNumeroTren"),
  estrellaTrenBtn: document.getElementById("estrellaFavoritoNumero"),
  trenFavoritosDiv: document.getElementById("favoritos"),
  btnAnterior: document.getElementById("btnAnterior"),
  btnSiguiente: document.getElementById("btnSiguiente"),
  descargarMarchaBtn: document.getElementById("descargarMarchaBtn"),
  descargarMarchaPDFBtn: document.getElementById("descargarMarchaPDFBtn"),

  // — Estación
  estacionInput: document.getElementById("numeroEst"),
  buscarEstButton: document.getElementById("buscarEstButton"),
  sugerenciasDiv: document.getElementById("sugerencias"),
  clearEstBtn: document.getElementById("clearNumeroEst"),
  estrellaEstBtn: document.getElementById("estrellaFavoritoEst"),
  cargarMas: document.getElementById("cargarMas"),
  toggle: document.getElementById('toggleVistaEstacion'),
  toggleMegafonia: document.getElementById('toggleMegafonia'),
  resultadoEstacion: document.getElementById("resultadoEstacion"),
  horaCabeceraTele: document.getElementById("hora-cabecera-tele"),
  tablaTeleindicador: document.getElementById("tablaTeleindicador"),
  btnFullScreenTele: document.getElementById("btnFullScreenTele"),
  descargarPanelBtn: document.getElementById("descargarPanelBtn"),
  descargarPanelPDFBtn: document.getElementById("descargarPanelPDFBtn"),

  // — Teleindicador
  stationInputTele: document.getElementById("stationInputTele"),
  sugerenciasTele: document.getElementById("sugerenciasTele"),
  buscarTeleButton: document.getElementById("buscarTeleButton"),
  clearNumeroTele: document.getElementById("clearNumeroTele"),
  estrellaTeleBtn: document.getElementById("estrellaFavoritoTele"),
  teleindicadorFullContainer: document.getElementById("teleindicadorFullContainer"),

  // — Pestañas
  tabButtons: document.querySelectorAll(".tab-button"),
  consultaTab: document.getElementById("consulta"),
  estacionTab: document.getElementById("estacion"),
  teleindicadorTab: document.getElementById("teleindicadorTab"),

  // — Selectores personalizados
  customSelects: document.querySelectorAll('.custom-select')
};

let teleindicadorInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const toggle = DOMElements.toggle;
  if (!toggle) return;
  const saved = localStorage.getItem('vistaEstacion');
  if (saved !== null) {
    toggle.checked = saved === 'teleindicador';
  }
});

export function actualizarControlesInput(input, clearBtn, favBtn) {
  const hay = !!input.value;
  clearBtn.classList.toggle('visible', hay);
  favBtn.classList.toggle('visible', hay);
  input.classList.toggle('input-con-x', hay);
}

export function poblarFiltroOperadores() {
    const operadores = getOperadores(); // Obtiene los operadores cargados desde operadores.json en auth.js
    const selectContainer = document.getElementById('customOperador');
    const selectedDisplay = selectContainer.querySelector('.custom-select-selected');
    const optionsContainer = selectContainer.querySelector('.custom-select-options');
    const hiddenInput = document.getElementById('operadorCustom');

    // Limpiar opciones existentes
    optionsContainer.innerHTML = '';

    // Opción "Todos"
    const todosOpt = document.createElement('div');
    todosOpt.dataset.value = 'ALL';
    todosOpt.textContent = 'Todos';
    todosOpt.classList.add('selected'); // "Todos" por defecto
    optionsContainer.appendChild(todosOpt);

    // Opciones para cada operador
    for (const [codigo, nombre] of Object.entries(operadores)) {
        const opt = document.createElement('div');
        opt.dataset.value = codigo;
        opt.textContent = nombre;
        optionsContainer.appendChild(opt);
    }

    // Añadir listeners a las nuevas opciones
    optionsContainer.querySelectorAll('div').forEach(option => {
        option.addEventListener('click', () => {
            optionsContainer.querySelectorAll('div').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedDisplay.textContent = option.textContent;
            hiddenInput.value = option.dataset.value;
            selectContainer.classList.remove('open');
            selectedDisplay.classList.remove('active');
        });
    });
}

function setupEventListeners() {

  // — Theme & Auth
  DOMElements.toggleThemeBtn.addEventListener("click", toggleTheme);
  DOMElements.loginButton.addEventListener("click", login);
  DOMElements.cerrarSesionButton.addEventListener("click", cerrarSesion);

  // — Clear resultados (Tren)  
  DOMElements.clearResultadosButton.addEventListener("click", clearResultados);

  // — Tren
  DOMElements.buscarTrenButton.addEventListener("click", buscarTren);
  DOMElements.descargarMarchaBtn.addEventListener('click', descargarMarchaXLSX);
  DOMElements.descargarMarchaPDFBtn.addEventListener('click', descargarMarchaPDF);
  DOMElements.descargarPanelBtn.addEventListener('click', descargarPanelXLSX);
  DOMElements.descargarPanelPDFBtn.addEventListener('click', descargarPanelPDF);
  DOMElements.trenInput.addEventListener('input', () => {
    actualizarControlesInput(
      DOMElements.trenInput,
      DOMElements.clearTrenBtn,
      DOMElements.estrellaTrenBtn
    );
    mostrarFavoritosTren();
    mostrarFavoritoEstrellaTren();
  });
  DOMElements.trenInput.addEventListener('focus', () => {
    mostrarFavoritosTren();
    mostrarFavoritoEstrellaTren();
  });
  DOMElements.trenInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') buscarTren();
  });
  DOMElements.clearTrenBtn.addEventListener('click', e => {
    e.stopPropagation();
    DOMElements.trenInput.value = '';
    DOMElements.trenInput.focus();
    actualizarControlesInput(
      DOMElements.trenInput,
      DOMElements.clearTrenBtn,
      DOMElements.estrellaTrenBtn
    );
    mostrarFavoritosTren();
    mostrarFavoritoEstrellaTren();
  });
  DOMElements.estrellaTrenBtn.addEventListener('click', () => {
    const num = DOMElements.trenInput.value.trim();
    const origenDestino = obtenerOrigenDestino(num);
    if (num) toggleFavoritoTren(num, origenDestino);
  });
  DOMElements.btnAnterior.addEventListener('click', mostrarTrenAnterior);
  DOMElements.btnSiguiente.addEventListener('click', mostrarTrenSiguiente);

  // — Estación
  DOMElements.btnFullScreenTele.addEventListener('click', function () {
    const tabla = DOMElements.teleindicadorFullContainer;
    if (tabla.requestFullscreen) {
      tabla.requestFullscreen();
    } else if (tabla.webkitRequestFullscreen) { // Safari
      tabla.webkitRequestFullscreen();
    } else if (tabla.msRequestFullscreen) { // IE11
      tabla.msRequestFullscreen();
    }
  });
  DOMElements.estacionInput.addEventListener('input', () => {
    actualizarControlesInput(
      DOMElements.estacionInput,
      DOMElements.clearEstBtn,
      DOMElements.estrellaEstBtn
    );
    autocompletarEstaciones();
    mostrarFavoritoEstrella();
  });
  DOMElements.estacionInput.addEventListener('focus', () => {
    stopActualizar();
    actualizarControlesInput(
      DOMElements.estacionInput,
      DOMElements.clearEstBtn,
      DOMElements.estrellaEstBtn
    );
    autocompletarEstaciones();
    mostrarFavoritoEstrella();
  });
  DOMElements.estacionInput.addEventListener('keyup', e => {
    const esTeleindicador = DOMElements.toggle.checked;
    if (esTeleindicador) {
      if (e.key === 'Enter') buscarEstacion("teleindicador", true);
    } else {
      if (e.key === 'Enter') buscarEstacion("detallado", true);
    }
  });
  DOMElements.clearEstBtn.addEventListener('click', e => {
    stopActualizar();
    e.stopPropagation();
    DOMElements.estacionInput.value = '';
    DOMElements.estacionInput.focus();
    actualizarControlesInput(
      DOMElements.estacionInput,
      DOMElements.clearEstBtn,
      DOMElements.estrellaEstBtn
    );
    autocompletarEstaciones();
    mostrarFavoritoEstrella();
  });
  DOMElements.buscarEstButton.addEventListener("click", () => {
    stopActualizar();
    DOMElements.horaCabeceraTele.classList.remove("parpadeante");
    const esTeleindicador = DOMElements.toggle.checked;
    DOMElements.resultadoEstacion.classList.add("hidden");
    DOMElements.tablaTeleindicador.classList.add("hidden");
    DOMElements.btnFullScreenTele.classList.add("hidden");
    if (esTeleindicador) {
      clearResultados();
      buscarEstacion("teleindicador", true);
      iniciarIntervalosUI();
      DOMElements.tablaTeleindicador.classList.remove("hidden");
      DOMElements.btnFullScreenTele.classList.remove("hidden");
      teleindicadorInterval = setInterval(() => buscarEstacion("teleindicador", false), 30000);
    } else {
      buscarEstacion("detallado", true);
    }
  });
  DOMElements.estrellaEstBtn.addEventListener('click', () => {
    const nombre = DOMElements.estacionInput.value.trim();
    const estaciones = getEstaciones();
    const codigo = Object.keys(estaciones)
      .find(c => estaciones[c].toLowerCase() === nombre.toLowerCase() || c === nombre);
    if (codigo) toggleFavoritoEstacion(codigo);
  });
  DOMElements.cargarMas.addEventListener("click", cargarMas);

  // — Pestañas
  DOMElements.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      stopActualizar();
      const id = btn.dataset.target;
      [DOMElements.consultaTab, DOMElements.estacionTab, DOMElements.teleindicadorTab]
        .forEach(el => el?.classList.toggle("visible", el?.id === id));
      DOMElements.tabButtons.forEach(b => b.classList.toggle("active", b === btn));
    });
  });

  // — Custom selects
  DOMElements.customSelects.forEach(select => {
    const sel = select.querySelector('.custom-select-selected');
    const opts = select.querySelector('.custom-select-options');
    const hid = select.querySelector('input[type="hidden"]');
    sel.addEventListener('click', () => {
      stopActualizar();
      select.classList.toggle('open');
      sel.classList.toggle('active');
    });
    opts.querySelectorAll('div').forEach(o => {
      o.addEventListener('click', () => {
        opts.querySelectorAll('div').forEach(x => x.classList.remove('selected'));
        o.classList.add('selected');
        sel.textContent = o.textContent;
        hid.value = o.dataset.value;
        select.classList.remove('open');
        sel.classList.remove('active');
      });
    });
  });

  // — Cerrar popups al hacer click fuera
  document.addEventListener('click', e => {
    if (!DOMElements.sugerenciasDiv.contains(e.target) &&
      !DOMElements.estacionInput.contains(e.target)) {
      DOMElements.sugerenciasDiv.classList.remove('visible');
    }
    if (!DOMElements.trenFavoritosDiv.contains(e.target) &&
      e.target !== DOMElements.trenInput) {
      DOMElements.trenFavoritosDiv.classList.remove('visible');
    }
    DOMElements.customSelects.forEach(s => {
      if (!s.contains(e.target)) {
        s.classList.remove('open');
        s.querySelector('.custom-select-selected').classList.remove('active');
      }
    });
  });

  if (DOMElements.toggleMegafonia) {
      DOMElements.toggleMegafonia.addEventListener('change', () => {
          localStorage.setItem('megafoniaActivada', DOMElements.toggleMegafonia.checked);
      });
  }
}

if (DOMElements.toggle) {
  DOMElements.toggle.addEventListener('change', () => {
    localStorage.setItem('vistaEstacion', DOMElements.toggle.checked ? 'teleindicador' : 'detallado');

    if (DOMElements.toggle.checked) {
      if (!DOMElements.resultadoEstacion.classList.contains("hidden")) {
        DOMElements.resultadoEstacion.classList.add("hidden");
        DOMElements.horaCabeceraTele.classList.remove("parpadeante");
        iniciarIntervalosUI();
        teleindicadorInterval = setInterval(() => buscarEstacion("teleindicador", false), 30000);
        const titulo = document.getElementById("titulo-cabecera-tele");
        titulo.textContent = upperCamelCase(getTipoPanel());
        document.getElementById("destinoOrigenHeader").textContent = getTipoPanel() === "salidas" ? "Destino" : "Origen";
      }
    } else {
      DOMElements.tablaTeleindicador.classList.add("hidden");
      DOMElements.btnFullScreenTele.classList.add("hidden");
      stopActualizar();
    }

    mostrarEstacion(DOMElements.toggle.checked ? 'teleindicador' : 'detallado');

    let ultimaBusquedaTeleindicador = getUltimaBusquedaTeleindicador();
    // Solo buscar si ha pasado al menos 1 minuto desde la última búsqueda
    if (DOMElements.toggle.checked && !DOMElements.tablaTeleindicador.classList.contains("hidden")) {
      const ahora = Date.now();
      if (ahora - ultimaBusquedaTeleindicador > 60000) {
        buscarEstacion("teleindicador", false);
        ultimaBusquedaTeleindicador = ahora;
      }
    }
  });
}

export function stopActualizar() {
  if (teleindicadorInterval) {
    clearInterval(teleindicadorInterval);
    teleindicadorInterval = null;
    DOMElements.horaCabeceraTele.classList.add("parpadeante");
  }
  limpiarIntervalosUI();
}

async function init() {
  initTheme();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js');
  }
  setupEventListeners();
  await verificarSesionGuardada();

  const megafoniaGuardada = localStorage.getItem('megafoniaActivada') === 'true';
  if (DOMElements.toggleMegafonia) {
    DOMElements.toggleMegafonia.checked = megafoniaGuardada;
  }
}

function obtenerOrigenDestino(numero) {
  // Buscar entre los trenes mostrados actualmente
  const tren = getTrenes().find(t =>
    t?.commercialPathInfo?.commercialPathKey?.commercialCirculationKey?.commercialNumber === numero
  );
  if (tren) {
    const origen = getEstaciones()[tren.commercialPathInfo.commercialPathKey.originStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.originStationCode;
    const destino = getEstaciones()[tren.commercialPathInfo.commercialPathKey.destinationStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.destinationStationCode;
    return `${origen} - ${destino}${'&nbsp;'.repeat(8)}`;
  }

  // Buscar en recientes
  let ultimos = [];
  try {
    ultimos = JSON.parse(localStorage.getItem('ultimosTrenesBuscados') || '[]');
  } catch { }
  const reciente = ultimos.find(t => t.numero === numero);
  if (reciente && reciente.origenDestino) {
    return reciente.origenDestino;
  }

  return '';
}
window.addEventListener('load', init);