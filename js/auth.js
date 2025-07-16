// js/auth.js

import { mostrarPantalla, setVerifyingState } from './ui.js';
import { cargarCSV } from './api.js';

const API_BASE_URL = "https://magallanes-api-rqbi.onrender.com";

let authHeader = "";
let estaciones = {};
let operadoresData = {};

// --- EXPORTACIÓN DE ESTADO ---
export const getAuthHeader = () => authHeader;
export const getEstaciones = () => estaciones;
export const getOperadores = () => operadoresData;
export const setEstaciones = (nuevasEstaciones) => { estaciones = nuevasEstaciones; };


// --- FUNCIONES DE AUTENTICACIÓN Y SESIÓN ---

export async function verificarSesionGuardada() {
    setVerifyingState(true);
    authHeader = localStorage.getItem("authHeader") || sessionStorage.getItem("authHeader");

    if (authHeader) {
        await verificarSesion(authHeader);
    } else {
       mostrarPantalla("login");
    }
}

async function verificarSesion(header) {
    const verifyTimeout = setTimeout(() => {
        setVerifyingState(true, "El servidor se está iniciando, puede tardar un tiempo...");
    }, 4000);

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": header },
        });

        if (!response.ok) throw new Error("Sesión inválida");
        
        // Sesión válida
        authHeader = header;
        clearTimeout(verifyTimeout);
        await onLoginSuccess();

    } catch (err) {
        console.warn("Verificación de sesión fallida:", err.message);
        clearTimeout(verifyTimeout);
        onLogout();
    } finally {
        clearTimeout(verifyTimeout);
    }
}

export async function login() {
    const usuario = document.getElementById("usuario").value;
    const clave = document.getElementById("clave").value;
    const recordarme = document.getElementById("recordarme").checked;
    const loginError = document.getElementById("loginError");
    const loginInfo = document.getElementById("loginInfo");

    loginError.textContent = "";
    loginInfo.textContent = "";
    
    const loginTimeout = setTimeout(() => {
        loginInfo.textContent = "El servidor se está iniciando, puede tardar un tiempo...";
    }, 4000);

    const newAuthHeader = "Basic " + btoa(`${usuario}:${clave}`);
    
    try {
        loginError.textContent = "Iniciando sesión...";
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": newAuthHeader },
        });
        
        if (!response.ok) throw new Error("Usuario o contraseña incorrectos");

        authHeader = newAuthHeader;
        const storage = recordarme ? localStorage : sessionStorage;
        storage.setItem("authHeader", authHeader);
        await onLoginSuccess();

    } catch (err) {
        loginError.textContent = err.message;
    } finally {
        clearTimeout(loginTimeout);
        if(loginError.textContent === "Iniciando sesión...") loginError.textContent = "";
        loginInfo.textContent = "";
    }
}

export function cerrarSesion() {
    onLogout();
}

// --- FUNCIONES AUXILIARES DE LOGIN/LOGOUT ---

async function onLoginSuccess() {
    mostrarPantalla("consulta");
    await cargarDatosEsenciales();
}

function onLogout() {
    const theme = localStorage.getItem('tema');
    authHeader = "";
    localStorage.clear();
    sessionStorage.clear();
    if (theme !== null) {
        localStorage.setItem('tema', theme);
    }
    document.getElementById("usuario").value = "";
    document.getElementById("clave").value = "";
    mostrarPantalla("login");
}

async function cargarDatosEsenciales() {
    await cargarOperadores();
    await cargarCSV();
}


// --- CARGA DE DATOS (JSON, CSV) ---

export function procesarCSV(csv) {
    const lineas = csv.trim().split('\n');
    const estacionesProcesadas = {};
    for (let i = 1; i < lineas.length; i++) {
        const [codigo, texto] = lineas[i].split(',');
        if (codigo && texto) {
            estacionesProcesadas[codigo.trim()] = texto.trim().replace(/"/g, '');
        }
    }
    return estacionesProcesadas;
}

async function cargarOperadores() {
    try {
        const response = await fetch('data/operadores.json');
        if (!response.ok) throw new Error('No se pudo cargar operadores.json');
        operadoresData = await response.json();
    } catch (error) {
        console.error("Error al cargar los operadores:", error);
        operadoresData = {}; // Evitar fallos si el archivo no carga
    }
}
