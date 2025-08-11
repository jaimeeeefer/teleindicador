import { initTheme, toggleTheme } from './theme.js';
import {
  login,
  cerrarSesion,
  verificarSesionGuardada,
  getEstaciones
} from './auth.js';
import {
  buscarTren,
  clearResultados,
  buscarEstacion,
  cargarMas,
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
  limpiarIntervalosUI,
  descargarMarchaCSV
} from './ui.js';

const DOMElements = {
  // — Global UI
  loginButton:            document.getElementById("loginButton"),
  toggleThemeBtn:         document.getElementById("toggleThemeBtn"),
  cerrarSesionButton:     document.getElementById("cerrarSesionButton"),
  clearResultadosButton:  document.getElementById("clearResultadosButton"),

  // — Tren
  buscarTrenButton:       document.getElementById("buscarTrenButton"),
  trenInput:              document.getElementById("numeroTren"),
  clearTrenBtn:           document.getElementById("clearNumeroTren"),
  estrellaTrenBtn:        document.getElementById("estrellaFavoritoNumero"),
  trenFavoritosDiv:       document.getElementById("favoritos"),
  btnAnterior:            document.getElementById("btnAnterior"),
  btnSiguiente:           document.getElementById("btnSiguiente"),
  descargarMarchaBtn:     document.getElementById("descargarMarchaBtn"), // <-- AÑADE ESTA LÍNEA

  // — Estación
  estacionInput:          document.getElementById("numeroEst"),
  buscarEstButton:        document.getElementById("buscarEstButton"),
  sugerenciasDiv:         document.getElementById("sugerencias"),
  clearEstBtn:            document.getElementById("clearNumeroEst"),
  estrellaEstBtn:         document.getElementById("estrellaFavoritoEst"),
  cargarMas:              document.getElementById("cargarMas"),
  toggle:                 document.getElementById('toggleVistaEstacion'),
  resultadoEstacion:      document.getElementById("resultadoEstacion"),
  horaCabeceraTele:       document.getElementById("hora-cabecera-tele"),
  tablaTeleindicador:     document.getElementById("tablaTeleindicador"),
  btnFullScreenTele:      document.getElementById("btnFullScreenTele"),

  // — Teleindicador
  stationInputTele:       document.getElementById("stationInputTele"),
  sugerenciasTele:        document.getElementById("sugerenciasTele"),
  buscarTeleButton:       document.getElementById("buscarTeleButton"),
  clearNumeroTele:        document.getElementById("clearNumeroTele"),
  estrellaTeleBtn:        document.getElementById("estrellaFavoritoTele"),
  teleindicadorFullContainer: document.getElementById("teleindicadorFullContainer"),

  // — Pestañas
  tabButtons:             document.querySelectorAll(".tab-button"),
  consultaTab:            document.getElementById("consulta"),
  estacionTab:            document.getElementById("estacion"),
  teleindicadorTab:       document.getElementById("teleindicadorTab"),

  // — Selectores personalizados
  customSelects:          document.querySelectorAll('.custom-select')
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

function setupEventListeners() {

  // — Theme & Auth
  DOMElements.toggleThemeBtn.addEventListener("click", toggleTheme);
  DOMElements.loginButton.addEventListener("click", login);
  DOMElements.cerrarSesionButton.addEventListener("click", cerrarSesion);

    // — Clear resultados (Tren)  
  DOMElements.clearResultadosButton.addEventListener("click", clearResultados);

  // — Tren
  DOMElements.buscarTrenButton.addEventListener("click", buscarTren);
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
    if (num) toggleFavoritoTren(num);
  });
  DOMElements.btnAnterior.addEventListener('click', mostrarTrenAnterior);
  DOMElements.btnSiguiente.addEventListener('click', mostrarTrenSiguiente);

  // — Estación
  DOMElements.btnFullScreenTele.addEventListener('click', function() {
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
    const nombre   = DOMElements.estacionInput.value.trim();
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
    const opts= select.querySelector('.custom-select-options');
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
        hid.value       = o.dataset.value;
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
          }
        } else {
          DOMElements.tablaTeleindicador.classList.add("hidden");
          DOMElements.btnFullScreenTele.classList.add("hidden");
          stopActualizar();
        }

        mostrarEstacion(DOMElements.toggle.checked ? 'teleindicador' : 'detallado');

        if (DOMElements.toggle.checked && !DOMElements.tablaTeleindicador.classList.contains("hidden")) {
            buscarEstacion("teleindicador", false);
        }
    });
}

export function stopActualizar(){
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
}

window.addEventListener('load', init);
