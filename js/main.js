// js/main.js

// ------------------------
// --- IMPORTS
// ------------------------
import { initTheme, toggleTheme } from './theme.js';
import { login, cerrarSesion, verificarSesionGuardada, getEstaciones } from './auth.js';
import { buscarTren, clearResultados, buscarEstacion, cargarMas } from './api.js';
import {
    mostrarTrenAnterior,
    mostrarTrenSiguiente,
    autocompletarEstaciones,
    toggleFavoritoEstacion,
    mostrarFavoritoEstrella,
    toggleFavoritoTren,
    mostrarFavoritoEstrellaTren,
    mostrarFavoritosTren
} from './ui.js';

// ---------------------------------
// --- ALMACÉN DE ELEMENTOS DEL DOM
// ---------------------------------
const DOMElements = {
    // Botones principales
    loginButton: document.getElementById("loginButton"),
    buscarTrenButton: document.getElementById("buscarTrenButton"),
    clearResultadosButton: document.getElementById("clearResultadosButton"),
    cerrarSesionButton: document.getElementById("cerrarSesionButton"),
    toggleThemeBtn: document.getElementById("toggleThemeBtn"),
    btnAnterior: document.getElementById("btnAnterior"),
    btnSiguiente: document.getElementById("btnSiguiente"),
    buscarEstButton: document.getElementById("buscarEstButton"),
    cargarMas: document.getElementById("cargarMas"),

    // Navegación por pestañas
    tabButtons: document.querySelectorAll(".tab-button"),
    pantallas: document.querySelectorAll(".pantalla"),
    consultaTab: document.getElementById("consulta"),
    estacionTab: document.getElementById("estacion"),

    // Búsqueda de Tren
    trenInput: document.getElementById('numeroTren'),
    clearTrenBtn: document.getElementById('clearNumeroTren'),
    estrellaTrenBtn: document.getElementById('estrellaFavoritoNumero'),
    trenFavoritosDiv: document.getElementById('favoritos'),

    // Búsqueda de Estación
    estacionInput: document.getElementById("numeroEst"),
    sugerenciasDiv: document.getElementById("sugerencias"),
    clearEstBtn: document.getElementById('clearNumeroEst'),
    estrellaEstBtn: document.getElementById('estrellaFavoritoEst'),

    // Selectores personalizados
    customSelects: document.querySelectorAll('.custom-select')
};

// ---------------------------------
// --- FUNCIONES DE AYUDA (UI)
// ---------------------------------

/**
 * Muestra u oculta los botones de limpiar y favorito de un input.
 * @param {HTMLInputElement} input El elemento del input.
 * @param {HTMLElement} clearBtn El botón para limpiar el input.
 * @param {HTMLElement} favBtn El botón para marcar como favorito.
 */
function actualizarControlesInput(input, clearBtn, favBtn) {
    const hayValor = !!input.value;
    clearBtn.classList.toggle('visible', hayValor);
    favBtn.classList.toggle('visible', hayValor);
    input.classList.toggle('input-con-x', hayValor);
}

// ---------------------------------
// --- CONFIGURACIÓN DE EVENTOS
// ---------------------------------
function setupEventListeners() {

    // --- Botones Generales ---
    DOMElements.loginButton.addEventListener("click", login);
    DOMElements.buscarTrenButton.addEventListener("click", buscarTren);
    DOMElements.clearResultadosButton.addEventListener("click", clearResultados);
    DOMElements.cerrarSesionButton.addEventListener("click", cerrarSesion);
    DOMElements.toggleThemeBtn.addEventListener("click", toggleTheme);
    DOMElements.btnAnterior.addEventListener("click", mostrarTrenAnterior);
    DOMElements.btnSiguiente.addEventListener("click", mostrarTrenSiguiente);
    DOMElements.buscarEstButton.addEventListener("click", buscarEstacion);
    DOMElements.cargarMas.addEventListener("click", cargarMas);

    // --- Búsqueda de Tren ---
    DOMElements.trenInput.addEventListener('input', () => {
        actualizarControlesInput(DOMElements.trenInput, DOMElements.clearTrenBtn, DOMElements.estrellaTrenBtn);
        mostrarFavoritosTren();
        mostrarFavoritoEstrellaTren();
    });
    DOMElements.trenInput.addEventListener('focus', () => {
        mostrarFavoritosTren();
        mostrarFavoritoEstrellaTren();
    });
    DOMElements.trenInput.addEventListener('keyup', event => {
        if (event.key === 'Enter') buscarTren();
    });
    DOMElements.clearTrenBtn.addEventListener('click', e => {
        e.stopPropagation();
        DOMElements.trenInput.value = '';
        actualizarControlesInput(DOMElements.trenInput, DOMElements.clearTrenBtn, DOMElements.estrellaTrenBtn);
        DOMElements.trenInput.focus();
        mostrarFavoritosTren();
        mostrarFavoritoEstrellaTren();
    });
    DOMElements.estrellaTrenBtn.addEventListener('click', () => {
        const numero = DOMElements.trenInput.value.trim();
        if (numero) toggleFavoritoTren(numero);
    });

    // --- Búsqueda de Estación ---
    DOMElements.estacionInput.addEventListener('input', () => {
        actualizarControlesInput(DOMElements.estacionInput, DOMElements.clearEstBtn, DOMElements.estrellaEstBtn);
        autocompletarEstaciones();
        mostrarFavoritoEstrella();
    });
    DOMElements.estacionInput.addEventListener('focus', () => {
        actualizarControlesInput(DOMElements.estacionInput, DOMElements.clearEstBtn, DOMElements.estrellaEstBtn);
        autocompletarEstaciones();
        mostrarFavoritoEstrella();
    });
    DOMElements.estacionInput.addEventListener('keyup', event => {
        if (event.key === 'Enter') buscarEstacion();
    });
    DOMElements.estacionInput.addEventListener('change', mostrarFavoritoEstrella);
    DOMElements.clearEstBtn.addEventListener('click', e => {
        e.stopPropagation();
        DOMElements.estacionInput.value = '';
        actualizarControlesInput(DOMElements.estacionInput, DOMElements.clearEstBtn, DOMElements.estrellaEstBtn);
        DOMElements.estacionInput.focus();
        autocompletarEstaciones();
        mostrarFavoritoEstrella();
    });
    DOMElements.estrellaEstBtn.addEventListener('click', () => {
        const estaciones = getEstaciones();
        const nombreEstacion = DOMElements.estacionInput.value.trim();
        const codigo = Object.keys(estaciones).find(cod => (estaciones[cod].toLowerCase() === nombreEstacion.toLowerCase() || cod === nombreEstacion));
        if (codigo) {
            toggleFavoritoEstacion(codigo);
            mostrarFavoritoEstrella();
        }
    });

    // --- Navegación por Pestañas (marcha <-> estación) ---
    DOMElements.tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const destinoID = button.dataset.target;
            DOMElements.tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            DOMElements.consultaTab?.classList.toggle("visible", destinoID === "consulta");
            DOMElements.estacionTab?.classList.toggle("visible", destinoID === "estacion");
        });
    });

    // --- Selectores Personalizados ---
    DOMElements.customSelects.forEach(select => {
        const selected = select.querySelector('.custom-select-selected');
        const options = select.querySelector('.custom-select-options');
        const hiddenInput = select.querySelector('input[type="hidden"]');

        selected.addEventListener('click', () => {
            select.classList.toggle('open');
            selected.classList.toggle('active');
        });

        options.querySelectorAll('div').forEach(option => {
            option.addEventListener('click', () => {
                options.querySelectorAll('div').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                selected.textContent = option.textContent;
                hiddenInput.value = option.getAttribute('data-value');
                select.classList.remove('open');
                selected.classList.remove('active');
            });
        });
    });

    // --- Cierre de Popups/Sugerencias al hacer click fuera ---
    document.addEventListener('click', event => {
        // Cerrar sugerencias de estación
        if (!DOMElements.sugerenciasDiv.contains(event.target) && !DOMElements.estacionInput.contains(event.target)) {
            DOMElements.sugerenciasDiv.classList.remove('visible');
        }
        // Cerrar favoritos de tren
        if (DOMElements.trenFavoritosDiv && !DOMElements.trenFavoritosDiv.contains(event.target) && event.target !== DOMElements.trenInput) {
            DOMElements.trenFavoritosDiv.classList.remove('visible');
        }
        // Cerrar selectores personalizados
        DOMElements.customSelects.forEach(select => {
            if (!select.contains(event.target)) {
                select.classList.remove('open');
                select.querySelector('.custom-select-selected').classList.remove('active');
            }
        });
    });
}

// ------------------------
// --- INICIALIZACIÓN
// ------------------------
async function init() {
    initTheme();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(() => console.log('Service Worker registrado con éxito.'))
            .catch(error => console.log('Fallo al registrar Service Worker:', error));
    }

    setupEventListeners();
    await verificarSesionGuardada();

    // Establecer estado inicial de los controles de los inputs
    actualizarControlesInput(DOMElements.trenInput, DOMElements.clearTrenBtn, DOMElements.estrellaTrenBtn);
    actualizarControlesInput(DOMElements.estacionInput, DOMElements.clearEstBtn, DOMElements.estrellaEstBtn);
}

// Iniciar la aplicación cuando la ventana se haya cargado
window.addEventListener('load', init);


document.getElementById("buscarTeleButton").addEventListener("click", async () => {
  const input = document.getElementById("stationInputTele");
  const codigo = input?.dataset?.codigo || "";
  const tipoPanel = document.getElementById("tipoPanelTele").value;
  const tipoTren = document.getElementById("trainTypeTele").value;
  const tbody = document.getElementById("tablaTeleindicadorBody");

  // Valida que se haya seleccionado una estación
  if (!codigo || !/^\d+$/.test(codigo)) {
    tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Por favor, selecciona una estación válida de la lista.</td></tr>";
    return;
  }

  // 1. Muestra el estado de "Cargando..." dentro de la tabla
  tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Cargando...</td></tr>";
  mostrarTab("teleindicadorTab"); // Asegura que la pestaña sea visible

  try {
    // 2. Convierte la selección del usuario al formato que espera la API
    let tipoTrenApi = "ALL";
    const tipoTrenMapping = {
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
