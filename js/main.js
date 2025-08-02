// js/main-teleindicador.js

// ------------------------
// --- IMPORTS
// ------------------------
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
  buscarEstacionPorCodigoParaTeleindicador
} from './api.js';
import {
  mostrarTrenAnterior,
  mostrarTrenSiguiente,
  autocompletarEstaciones,
  autocompletarEstacionesTele,
  toggleFavoritoEstacion,
  mostrarFavoritoEstrella,
  toggleFavoritoTren,
  mostrarFavoritoEstrellaTren,
  mostrarFavoritosTren,
  mostrarFavoritoEstrellaTele,
  renderizarPanelTeleindicador
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

  // — Estación
  estacionInput:          document.getElementById("numeroEst"),
  buscarEstButton:        document.getElementById("buscarEstButton"),
  sugerenciasDiv:         document.getElementById("sugerencias"),
  clearEstBtn:            document.getElementById("clearNumeroEst"),
  estrellaEstBtn:         document.getElementById("estrellaFavoritoEst"),
  cargarMas:              document.getElementById("cargarMas"),

  // — Teleindicador
  stationInputTele:       document.getElementById("stationInputTele"),
  buscarTeleButton:       document.getElementById("buscarTeleButton"),
  clearNumeroTele:        document.getElementById("clearNumeroTele"),
  estrellaTeleBtn:        document.getElementById("estrellaFavoritoTele"),

  // — Pestañas
  tabButtons:             document.querySelectorAll(".tab-button"),
  consultaTab:            document.getElementById("consulta"),
  estacionTab:            document.getElementById("estacion"),
  teleindicadorTab:       document.getElementById("teleindicadorTab"),

  // — Selectores personalizados
  customSelects:          document.querySelectorAll('.custom-select')
};

function actualizarControlesInput(input, clearBtn, favBtn) {
  const hay = !!input.value;
  clearBtn.classList.toggle('visible', hay);
  favBtn .classList.toggle('visible', hay);
  input .classList.toggle('input-con-x', hay);
}

function setupEventListeners() {
  // — Theme & Auth
  DOMElements.toggleThemeBtn.addEventListener("click", toggleTheme);
  DOMElements.loginButton      .addEventListener("click", login);
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
    actualizarControlesInput(
      DOMElements.estacionInput,
      DOMElements.clearEstBtn,
      DOMElements.estrellaEstBtn
    );
    autocompletarEstaciones();
    mostrarFavoritoEstrella();
  });
  DOMElements.estacionInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') buscarEstacion();
  });
  DOMElements.clearEstBtn.addEventListener('click', e => {
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
  DOMElements.buscarEstButton.addEventListener("click", buscarEstacion);
  DOMElements.estrellaEstBtn.addEventListener('click', () => {
    const nombre   = DOMElements.estacionInput.value.trim();
    const estaciones = getEstaciones();
    const codigo = Object.keys(estaciones)
      .find(c => estaciones[c].toLowerCase() === nombre.toLowerCase() || c === nombre);
    if (codigo) toggleFavoritoEstacion(codigo);
  });
  DOMElements.cargarMas.addEventListener("click", cargarMas);

  // — Teleindicador (incluye clear & favorito)
  DOMElements.stationInputTele.addEventListener("input", () => {
    actualizarControlesInput(
      DOMElements.stationInputTele,
      DOMElements.clearNumeroTele,
      DOMElements.estrellaTeleBtn
    );
    autocompletarEstacionesTele();
    mostrarFavoritoEstrellaTele();
  });
  
  DOMElements.stationInputTele.addEventListener("focus", () => {
    actualizarControlesInput(
      DOMElements.stationInputTele,
      DOMElements.clearNumeroTele,
      DOMElements.estrellaTeleBtn
    );
    autocompletarEstacionesTele();
    mostrarFavoritoEstrellaTele();
  });

  DOMElements.stationInputTele.addEventListener('keyup', e => {
      if (e.key === 'Enter') buscarTeleindicador();
  });

  DOMElements.clearNumeroTele.addEventListener("click", () => {
    DOMElements.stationInputTele.value = "";
    DOMElements.stationInputTele.focus();
    actualizarControlesInput(
      DOMElements.stationInputTele,
      DOMElements.clearNumeroTele,
      DOMElements.estrellaTeleBtn
    );
  });
  DOMElements.estrellaTeleBtn.addEventListener("click", () => {
    const codigo = DOMElements.stationInputTele.dataset.codigo;
    if (codigo) toggleFavoritoEstacion(codigo);
  });

  DOMElements.buscarTeleButton.addEventListener("click", buscarTeleindicador);

  async function buscarTeleindicador() {
    const input = DOMElements.stationInputTele;
    let codigo = input.dataset.codigo || "";

    if (!codigo && input.value) {
        const estaciones = getEstaciones();
        const inputNorm = input.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const foundCode = Object.keys(estaciones).find(c =>
            estaciones[c].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === inputNorm
        );
        if (foundCode) {
            codigo = foundCode; // Asigna el código encontrado
        }
    }

    const tipoPanel = document.getElementById("tipoPanelTele").textContent.toLowerCase();
    const tipoTren = document.getElementById("trainTypeTele").textContent;
    const tbody = document.getElementById("tablaTeleindicadorBody");

    if (!codigo) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">Por favor, selecciona una estación válida.</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">Cargando...</td></tr>`;
    try {
        const mapTipo = {
            Todos: "ALL", Mercancías: "GOODS", AVLDMD: "AVLDMD",
            Cercanías: "CERCANIAS", Viajeros: "TRAVELERS", Otros: "OTHERS"
        };
        const trenes = await buscarEstacionPorCodigoParaTeleindicador(codigo, tipoPanel, mapTipo[tipoTren] || "ALL");
        renderizarPanelTeleindicador(trenes);
    } catch (e) {
        console.error("Error en la búsqueda del teleindicador:", e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">Error al consultar.</td></tr>`;
    }
  }

  // — Pestañas
  DOMElements.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
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

async function init() {
  initTheme();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js');
  }
  setupEventListeners();
  await verificarSesionGuardada();
}

window.addEventListener('load', init);
