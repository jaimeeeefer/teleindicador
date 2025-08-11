// js/api.js

import { stopActualizar } from './main.js';
import { getAuthHeader, procesarCSV, setEstaciones, getEstaciones } from './auth.js';
import { mostrarPantalla, mostrarTren, mostrarEstacion, finCargarMas, clearLastDate, upperCamelCase } from './ui.js';

const API_BASE_URL = "https://adif-api.onrender.com";
let trenes = [];
let trenActual = 0;

let proximosTrenes = [];
let numeroEstacion;
let paginaActual = 0;
let tipoTren;
let tipoPanel;
let estacionActual;

// --- EXPORTACIÓN DE ESTADO ---
export const getTrenes = () => trenes;
export const getProximosTrenes = () => proximosTrenes;
export const getTrenActual = () => trenActual;
export const getPaginaActual = () => paginaActual;
export const setTrenActual = (index) => { trenActual = index; };
export const setPaginaActual = (index) => { paginaActual = index; };
export const getTipoPanel = () => tipoPanel;

// --- FUNCIONES DE BÚSQUEDA ---

export async function buscarTren() {
    clearMarcha();
    const numeroTrenInput = document.getElementById("numeroTren");
    const resultadoPre = document.getElementById("resultado");
    let numero = numeroTrenInput.value.trim();
    const estaciones = getEstaciones();

    try {
        if (!/^\d+$/.test(numero)) throw new Error("Introduce un número de tren válido.");
        numero = numero.padStart(5, '0');
        
        resultadoPre.textContent = "Consultando...";
        
        const response = await fetch(`${API_BASE_URL}/buscar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": getAuthHeader()
            },
            body: JSON.stringify({ numero })
        });

        if (!response.ok) throw new Error("Error en la consulta. Revisa el número o la sesión.");
        
        const data = await response.json();
        if (data.error === "La respuesta no es un JSON válido.") throw new Error("El número de tren no existe.");
        
        trenes = data.commercialPaths || [];
        if (trenes.length === 0) throw new Error("No se encontraron trenes con ese número.");

        trenActual = 0;
        resultadoPre.innerHTML = `Se ha(n) encontrado <strong>${trenes.length}</strong> tren(es) con el número <strong>${numero}</strong>.`;
        mostrarTren();

    } catch (error) {
        resultadoPre.textContent = "Error: " + error.message;
        
    }
}

export async function buscarEstacion(tipo, nuevaBusqueda = true){
    if (nuevaBusqueda || !estacionActual || !tipoTren || !tipoPanel) {
        estacionActual = document.getElementById("numeroEst").value.toLowerCase().trim();
        tipoTren = document.getElementById('tipoTrenCustom').value;
        tipoPanel = document.getElementById('tipoPanelCustom').value;
    }
    try{
        const tbody = document.getElementById("tablaTeleindicadorBody");
        const estacionesArray = Object.entries(getEstaciones());
        const estacionInput = estacionActual;

        if (/^\d{1,5}$/.test(estacionInput) || /^[BCZbcz]\d{4}$/.test(estacionInput)){
            getSalidas(estacionInput, tipo, nuevaBusqueda);
        } else {
            const coincidencia = estacionesArray.find(([codigo, nombre]) =>
                nombre.toLowerCase() === estacionInput
            );
            if (coincidencia) {
                getSalidas(coincidencia[0], tipo, nuevaBusqueda);
            } else {
                if (tipo === "teleindicador") {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">Por favor, selecciona una estación válida.</td></tr>`;
                }
                throw new Error("No se encontró ninguna estación con ese nombre exacto.");
            }
        }
    } catch (error) {
        resultadoEst.textContent = "Error: " + error.message;
    }
}

async function getSalidas(numero, detallTel, nuevaBusqueda = true) {
    if (nuevaBusqueda) clearEstacion();
    else {
        proximosTrenes = [];
        paginaActual = 0;
    }
    const tablaPanelBody = document.getElementById("tablaPanel").querySelector("tbody");
    const tipoPanelSeleccionado = tipoPanel || document.getElementById('tipoPanelCustom').value;
    const tipo = tipoTren || document.getElementById('tipoTrenCustom').value;

    if (detallTel === "teleindicador") {
        const titulo = document.getElementById("titulo-cabecera-tele");
        titulo.textContent = upperCamelCase(getTipoPanel());
        document.getElementById("destinoOrigenHeader").textContent = getTipoPanel() === "salidas" ? "Destino" : "Origen";
    }

    tablaPanelBody.innerHTML = '';
    numero = numero.toUpperCase().padStart(5, '0');
    const resultadoEst = document.getElementById("resultadoEst");
    const estaciones = getEstaciones();
    const pagina = 0;
    paginaActual = pagina;
    const viajeros = "BOTH";
    const parada = "BOTH";
    try{
        const tbody = document.getElementById("tablaTeleindicadorBody");
        if (nuevaBusqueda) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">Buscando trenes...</td></tr>`;
            resultadoEst.textContent = "Consultando...";
        }
        else{
            resultadoEst.innerHTML += " - Buscando";
        }
    
        const response = await fetch(`${API_BASE_URL}/${tipoPanelSeleccionado}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": getAuthHeader()
            },
            body: JSON.stringify({ numero, pagina, viajeros, parada, tipo })
        });

        if (!response.ok) throw new Error("Error en la consulta. Revisa el número o la sesión.");

        const data = await response.json();
        if (data.error === "La respuesta no es un JSON válido.") throw new Error(`No hay ${tipoPanelSeleccionado} para la estación seleccionada.`);

        proximosTrenes = data.commercialPaths || [];
        if (proximosTrenes.length === 0) throw new Error(`No hay ${tipoPanelSeleccionado} para la estación seleccionada.`);

        numeroEstacion = numero;
        document.getElementById("cargarMas").classList.remove("hidden");

        if (proximosTrenes.length < 25){
            resultadoEst.innerHTML = `Estas son todas las ${tipoPanelSeleccionado} disponibles para la estación <strong>${numero.trim()+" - "+estaciones[numero.replace(/^0+/, '')] || numero}</strong>.`;
            finCargarMas();
        } else {
            resultadoEst.innerHTML = `Se ha(n) encontrado <strong>${proximosTrenes.length}</strong> tren(es) en <strong>${numero.trim()+" - "+estaciones[numero.replace(/^0+/, '')] || numero}</strong>.`;
        }
        
        mostrarEstacion(detallTel);

    } catch (error) {
        if (error.message === `No hay ${tipoPanelSeleccionado} para la estación seleccionada.`){
            const tbody = document.getElementById("tablaTeleindicadorBody");
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">Sin ${tipoPanelSeleccionado} para esta estación.</td></tr>`;
        }
        resultadoEst.textContent = "Error: " + error.message;
    }
}

export async function cargarMas(){
    const numero = numeroEstacion.padStart(5, '0');
    const resultadoEst = document.getElementById("resultadoEst");
    const estaciones = getEstaciones();
    const pagina = paginaActual+1;
    paginaActual = pagina;
    const viajeros = "BOTH";
    const parada = "BOTH";
    const tipo = tipoTren || document.getElementById('tipoTrenCustom').value;
    const tipoPanelSeleccionado = tipoPanel || document.getElementById('tipoPanelCustom').value;

    try{
        resultadoEst.textContent = "Consultando...";

        const response = await fetch(`${API_BASE_URL}/${tipoPanelSeleccionado}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": getAuthHeader()
            },
            body: JSON.stringify({ numero, pagina, viajeros, parada, tipo })
        });

        if (!response.ok) throw new Error("Error en la consulta. Revisa el número o la sesión.");

        const data = await response.json();
        if (data.error === "La respuesta no es un JSON válido.") throw new Error("No hay más salidas para la estación seleccionada.");

        proximosTrenes.push(...(data.commercialPaths || []));
        if (proximosTrenes.length === 0) throw new Error(`No hay ${tipoPanelSeleccionado} para la estación seleccionada.`);

        if (data.commercialPaths.length < 25) {
            finCargarMas();
        }

        resultadoEst.innerHTML = `Se ha(n) encontrado otros <strong>${data.commercialPaths.length}</strong> tren(es) en <strong>${numero.trim()+" - "+estaciones[numero.replace(/^0+/, '')] || numero}</strong>.`;
        mostrarEstacion("detallado");

    } catch (error) {
        if (error.message === `No hay más ${tipoPanelSeleccionado} para la estación seleccionada.`){
            resultadoEst.innerHTML = `Estas son todas las ${tipoPanelSeleccionado} disponibles para la estación <strong>${numero.trim()+" - "+estaciones[numero.replace(/^0+/, '')] || numero}</strong>.`;
            finCargarMas();
        } else {
            resultadoEst.textContent = "Error: " + error.message;
        }
    }
}

function clearMarcha() {
    const resultadoTrenDiv = document.getElementById("resultadoTren");
    const tablaPasosBody = document.getElementById("tablaPasos").querySelector("tbody");
    const infoTrenDiv = document.getElementById("infoTren");
    const resultadoPre = document.getElementById("resultado");

    resultadoTrenDiv.classList.add("hidden");
    tablaPasosBody.innerHTML = "";
    infoTrenDiv.innerHTML = "";
    resultadoPre.textContent = "Esperando consulta...";
    trenes = [];
    trenActual = 0;
}

function clearEstacion() {
    clearLastDate();
    const resultadoEstDiv = document.getElementById("resultadoEstacion");
    const tablaPanelBody = document.getElementById("tablaPanel").querySelector("tbody");
    const resultadoPreEst = document.getElementById("resultadoEst");

    resultadoEstDiv.classList.add("hidden");
    tablaPanelBody.innerHTML = "";
    resultadoPreEst.textContent = "Esperando consulta...";
    proximosTrenes = [];
    paginaActual = 0;
}

function clearTeleindicador() {
    const tabla = document.getElementById("tablaTeleindicador");
    const tbody = document.getElementById("tablaTeleindicadorBody");
    const fullscreen = document.getElementById("btnFullScreenTele");
    if (tabla) tabla.classList.add("hidden");
    if (tbody) tbody.innerHTML = "";
    if (fullscreen) fullscreen.classList.add("hidden");
    proximosTrenes = [];
    stopActualizar();
}

// --- FUNCIONALIDAD CLEAR RESULTADOS GLOBAL ---
export function clearResultados() {
    clearMarcha();
    clearEstacion();
    clearTeleindicador();
}

// --- CARGA DE DATOS INICIALES ---

export async function cargarCSV() {
    const csvURL = `${API_BASE_URL}/csv_url`;
    const ENCRYPTION_KEY = getAuthHeader();
    let csvDesencriptado = null;
    const encriptado = localStorage.getItem("estaciones");

    if (encriptado) {
        try {
            const bytes = CryptoJS.AES.decrypt(encriptado, ENCRYPTION_KEY);
            csvDesencriptado = bytes.toString(CryptoJS.enc.Utf8);
            if(csvDesencriptado) {
                setEstaciones(procesarCSV(csvDesencriptado));
                 console.log("CSV de estaciones cargado desde localStorage.");
            } else {
                 throw new Error("Clave de desencriptación incorrecta.");
            }
        } catch (err) {
            console.warn("No se pudo desencriptar el CSV local, se descargará de nuevo.", err);
            localStorage.removeItem("estaciones"); // Eliminar dato corrupto
        }
    }

    try {
        const response = await fetch(csvURL, { headers: { "Authorization": ENCRYPTION_KEY } });
        if (!response.ok) throw new Error('No se pudo obtener la URL del CSV.');

        const data = await response.json();
        const responseCSV = await fetch(data.url);
        if (!responseCSV.ok) throw new Error('No se pudo descargar el CSV remoto.');
        
        const csvRemoto = await responseCSV.text();

        if (csvRemoto !== csvDesencriptado) {
            const cifrado = CryptoJS.AES.encrypt(csvRemoto, ENCRYPTION_KEY).toString();
            localStorage.setItem("estaciones", cifrado);
            setEstaciones(procesarCSV(csvRemoto));
            console.log("CSV de estaciones actualizado desde el servidor.");
        }
    } catch (error) {
        console.error("Error crítico al cargar el CSV de estaciones:", error.message);
        if (!Object.keys(getEstaciones()).length) {
             // Si no hay estaciones, la app es inútil. Mostrar error.
             document.getElementById("resultado").textContent = "Error fatal: No se pudieron cargar las estaciones.";
        }
    }
}