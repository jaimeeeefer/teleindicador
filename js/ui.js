// js/ui.js

import { getTrenActual, getTrenes, setTrenActual , getProximosTrenes, getPaginaActual, setPaginaActual, getTipoPanel } from './api.js';
import { getEstaciones, getOperadores } from './auth.js';

let lastDate = null;


// CACHE DE ELEMENTOS DEL DOM PARA LA UI
const uiElements = {
    cargandoScreen: document.getElementById("cargando"),
    verifyInfo: document.getElementById("verifyInfo"),
    loginScreen: document.getElementById("login"),
    consultaScreen: document.getElementById("consulta"),
    resultadoTrenDiv: document.getElementById("resultadoTren"),
    resultadoEstacionDiv: document.getElementById("resultadoEstacion"),
    infoTrenDiv: document.getElementById("infoTren"),
    tablaPasosBody: document.getElementById("tablaPasos").querySelector("tbody"),
    tablaPanelBody: document.getElementById("tablaPanel").querySelector("tbody"),
    resultadoPre: document.getElementById("resultado"),
    btnAnterior: document.getElementById("btnAnterior"),
    btnSiguiente: document.getElementById("btnSiguiente"),
    contadorTrenSpan: document.getElementById("contadorTren"),
    clearResultadosButton: document.getElementById("clearResultadosButton"),
    cerrarSesionButton: document.getElementById("cerrarSesionButton"),
    sugerencias: document.getElementById('sugerencias'),
    cargarMas: document.getElementById("cargarMas")
};

export function clearLastDate() {
    lastDate = null;
}

// --- FUNCIONES DE VISIBILIDAD Y ESTADO ---

export function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => {
        if(p.id !== id) p.classList.remove('visible');
    });
    const destino = document.getElementById(id);
    if (destino) destino.classList.add('visible');
    if (destino.id  === 'login') {
        titulo.classList.add('visible');
        botonesCentro.classList.add('visible');
        uiElements.clearResultadosButton.style.display = 'none';
        uiElements.cerrarSesionButton.style.display = 'none';
    }
    else if (destino.id === 'consulta'){
        titulo.classList.add('visible');
        botonesCentro.classList.add('visible');
        tabs.classList.add('visible');
        uiElements.clearResultadosButton.style.display = 'block';
        uiElements.cerrarSesionButton.style.display = 'block';
    }
}

export function setVerifyingState(isVerifying, message = "Verificando sesión...") {
    if (isVerifying) {
        mostrarPantalla("cargando");
        uiElements.verifyInfo.textContent = message;
    }
}

// --- FUNCIONES DE NÚMERO DE TREN ---

export function mostrarTren() {
    const trenes = getTrenes();
    const trenActual = getTrenActual();
    
    if (trenActual < 0 || trenActual >= trenes.length || !trenes[trenActual]) {
        console.error("Índice de tren inválido o tren no encontrado.");
        return;
    }
    
    const path = trenes[trenActual];
    if (!path) return;
    
    actualizarNavegacion(trenActual, trenes.length);
    renderizarInfoTren(path);
    renderizarTablaPasos(path);
    
    uiElements.resultadoTrenDiv.classList.remove("hidden");
}

function renderizarInfoTren(path) {
    const info = path.commercialPathInfo;
    const estaciones = getEstaciones();
    
    let { ultimaEstacion, esUltimaEstacion, retUltimaEstacion, estadoUltimaEstacion } = getUltimaSituacion(path.passthroughSteps);
    estadoUltimaEstacion = traducirEstado(estadoUltimaEstacion);
    ultimaEstacion = estaciones[ultimaEstacion.replace(/^0+/, '')] || ultimaEstacion;

    const claseEstado = `estado-${estadoUltimaEstacion?.replaceAll(" ", "_")}`;

    uiElements.infoTrenDiv.innerHTML = `
        <div class="infoTablaGlobal">
          <div class= "infoTablaColumna">
              <div><strong class="blanco">Número:</strong><br>${info.commercialPathKey.commercialCirculationKey.commercialNumber}</div>
              <div><strong class="blanco">Fecha:</strong><br>${formatearTimestampFecha(info.commercialPathKey.commercialCirculationKey.launchingDate)}</div>
              <div><strong class="blanco">Origen:</strong><br>${estaciones[info.commercialOriginStationCode.replace(/^0+/, '')] || info.commercialOriginStationCode}</div>
              <div><strong class="blanco">Destino:</strong><br>${estaciones[info.commercialDestinationStationCode.replace(/^0+/, '')] || info.commercialDestinationStationCode}</div>
          </div>
          <div class= "infoTablaColumna">
              <div><strong class="blanco">Tipo:</strong><br>${info.trafficType}</div>
              <div><strong class="blanco">Operador:</strong><br>${info.opeProComPro?.operator} - ${traducirOperador(info.opeProComPro?.operator)}</div>
              <div><strong class="blanco">Producto:</strong><br>${info.opeProComPro?.product || ''}${info.opeProComPro?.commercialProduct?.trim() ? ' - ' : ''}${info.opeProComPro?.commercialProduct?.trim() || ''}</div>
              ${info?.line ? `<div><strong class="blanco">Línea/Núcleo:</strong><br>${info.line} - ${info.core}</div>` : ''}
          </div>
          <div class= "infoTablaColumna">
              <div><strong class="blanco">Estado:</strong><br><span class="${claseEstado}">${estadoUltimaEstacion}</span></div>
              ${ultimaEstacion ? `<div><strong class="blanco">Última situación:</strong><br>${ultimaEstacion}${esUltimaEstacion ? ` (${esUltimaEstacion})` : ''}</div>` : ''}
              ${ultimaEstacion ? `<div><strong class="blanco">Retraso:</strong><br><span class="${getColorClass(retUltimaEstacion)}">${formatoRetraso(retUltimaEstacion)}</span></div>` : ''}
          </div>
        </div>
    `;
}

function renderizarTablaPasos(path) {
    uiElements.tablaPasosBody.innerHTML = '';
    const estaciones = getEstaciones();
    const estadoCirculacion = traducirEstado(path.passthroughSteps[0]?.departurePassthroughStepSides?.circulationState);

    path.passthroughSteps.forEach(paso => {
        const llegada = paso.arrivalPassthroughStepSides;
        const salida = paso.departurePassthroughStepSides;
        const estadoPaso = getEstadoPaso(llegada, salida);

        const fila = document.createElement('tr');
        if (paso.stopType === "COMMERCIAL" || paso.stopType === "TECHNICAL") {
            fila.classList.add('fila-negrita');
        }
        
        if (estadoPaso.clase) fila.classList.add(estadoPaso.clase);

        fila.innerHTML = `
          <td>${estaciones[paso.stationCode.replace(/^0+/, '')] || paso.stationCode}</td>
          <td>${traducirParada(paso.stopType)}</td>
          <td>${llegada ? formatearTimestampHora(llegada.plannedTime) : ''}</td>
          <td>${llegada ? `<span class="${getColorClass(llegada.forecastedOrAuditedDelay)}">${calcularHoraReal(formatearTimestampHora(llegada.plannedTime), llegada.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${llegada ? `<span class="${getColorClass(llegada.forecastedOrAuditedDelay)}">${formatoRetraso(llegada.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${salida ? formatearTimestampHora(salida.plannedTime) : ''}</td>
          <td>${salida ? `<span class="${getColorClass(salida.forecastedOrAuditedDelay)}">${calcularHoraReal(formatearTimestampHora(salida.plannedTime), salida.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${salida ? `<span class="${getColorClass(salida.forecastedOrAuditedDelay)}">${formatoRetraso(salida.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${salida?.plannedPlatform || llegada?.plannedPlatform || ''}</td>
          <td>${traducirVia(salida?.resultantPlatform) || traducirVia(llegada?.resultantPlatform) || ''}</td>
          <td>${estadoPaso.texto}</td>
        `;
        uiElements.tablaPasosBody.appendChild(fila);
        if(traducirEstado(paso.departurePassthroughStepSides?.circulationState || paso.arrivalPassthroughStepSides?.circulationState) === "SUPRIMIDO") fila.classList.add('estado-sup');
    });
    
    if (estadoCirculacion === 'PENDIENTE DE CIRCULAR') {
        ajustarFilasParaEstado(estadoCirculacion);
    }
}

// --- NAVEGACIÓN ENTRE TRENES ---

export function mostrarTrenAnterior() {
    const trenActual = getTrenActual();
    if (trenActual > 0) {
        setTrenActual(trenActual - 1);
        mostrarTren();
    }
}

export function mostrarTrenSiguiente() {
    const trenes = getTrenes();
    const trenActual = getTrenActual();
    if (trenActual < trenes.length - 1) {
        setTrenActual(trenActual + 1);
        mostrarTren();
    }
}

function actualizarNavegacion(indice, total) {
    uiElements.btnAnterior.disabled = indice === 0;
    uiElements.btnSiguiente.disabled = indice === total - 1;
    uiElements.contadorTrenSpan.innerHTML = `Tren <strong>${indice + 1}</strong> de <strong>${total}</strong>`;
}

export function finCargarMas(){
    uiElements.cargarMas.classList.add("hidden");
}

// --- FUNCIONES AUXILIARES DE UI Y FORMATO ---

function getUltimaSituacion(pasos) {
    let ultimaEstacion = '';
    let esUltimaEstacion = '';
    let retUltimaEstacion = '';
    let estadoUltimaEstacion = '';
    pasos.forEach(paso => {
        const llegadaAudited = paso.arrivalPassthroughStepSides?.timeType === 'AUDITED';
        const salidaAudited = paso.departurePassthroughStepSides?.timeType === 'AUDITED';
        if (llegadaAudited || salidaAudited) {
            ultimaEstacion = paso.stationCode;
            esUltimaEstacion = salidaAudited ? 'S' : 'E';
            retUltimaEstacion = salidaAudited ? paso.departurePassthroughStepSides.forecastedOrAuditedDelay : paso.arrivalPassthroughStepSides.forecastedOrAuditedDelay;
            estadoUltimaEstacion = paso.departurePassthroughStepSides?.circulationState;
            if (estadoUltimaEstacion === undefined) estadoUltimaEstacion = paso.arrivalPassthroughStepSides?.circulationState;
        }
    });
    if (estadoUltimaEstacion === '' || estadoUltimaEstacion === undefined) estadoUltimaEstacion = pasos[0].departurePassthroughStepSides?.circulationState;
    return { ultimaEstacion, esUltimaEstacion, retUltimaEstacion, estadoUltimaEstacion };
}

function getEstadoPaso(llegada, salida) {
    const llegadaAudited = llegada?.timeType === 'AUDITED';
    const salidaAudited = salida?.timeType === 'AUDITED';
    if (llegadaAudited && salidaAudited) return { texto: 'E/S', clase: 'estado-es' };
    if (llegadaAudited) return { texto: 'E', clase: 'estado-e' };
    if (salidaAudited) return { texto: 'S', clase: 'estado-s' };
    return { texto: '', clase: '' };
}

function ajustarFilasParaEstado() {
    const filas = Array.from(uiElements.tablaPasosBody.querySelectorAll('tr'));
    for (let i = filas.length - 1; i >= 0; i--) {
        const fila = filas[i];
        if (fila.cells[10]?.textContent.trim() !== '') break;
        // Limpiar tiempos estimados para ambos estados
        fila.cells[3].textContent = '';
        fila.cells[4].textContent = '';
        fila.cells[6].textContent = '';
        fila.cells[7].textContent = '';
    }
}

// FUNCIONES ESTACIÓN

export function autocompletarEstaciones() {
    const estacionesArray = Object.entries(getEstaciones());
    const estacion = document.getElementById("numeroEst");
    const estacionInput = estacion.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const sugerencias = document.getElementById("sugerencias");
    sugerencias.innerHTML = '';

    if (estacionInput.length < 2) return;

    // Dividir en palabras (divisor: espacio o guión)
    const palabras = estacionInput.split(/[\s-]+/).filter(p => p.length > 0);

    const coincidencias = estacionesArray.filter(([codigo, nombre]) => {
        const nombreLower = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); //minúsculas, separar tildes de letras y eliminar tildes
        return palabras.every(palabra => nombreLower.includes(palabra));
    });

    if (coincidencias.length > 0) {
        coincidencias.forEach(([codigo, nombre]) => {
            const item = document.createElement('div');
            item.innerHTML = `
            <span>${nombre}</span>
            <span class="codigo-estacion">${codigo.padStart(5, '0')}</span>
            `;
            item.dataset.codigo = codigo;
            item.addEventListener('click', () => {
                estacion.value = nombre;
                sugerencias.classList.remove('visible');
            });
            sugerencias.appendChild(item);
        });
        sugerencias.classList.add('visible');
    } else {
        const sinCoincidencias = document.createElement("div");
        sinCoincidencias.textContent = "(sin coincidencias)";
        sinCoincidencias.classList.add("sugerencia", "no-click");
        sugerencias.appendChild(sinCoincidencias);
        return;
    }
}

export function autocompletarEstacionesTele() {
    const estacionesArray = Object.entries(getEstaciones());
    const estacion = document.getElementById("stationInputTele");
    const estacionInput = estacion.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const sugerencias = document.getElementById("sugerenciasTele");
    sugerencias.innerHTML = '';

    if (estacionInput.length < 2) return;

    const palabras = estacionInput.split(/[\s-]+/).filter(p => p.length > 0);

    const coincidencias = estacionesArray.filter(([codigo, nombre]) => {
        const nombreLower = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return palabras.every(palabra => nombreLower.includes(palabra));
    });

    if (coincidencias.length > 0) {
        coincidencias.forEach(([codigo, nombre]) => {
            const item = document.createElement('div');
            item.className = "sugerencia"; // usa misma clase que en estaciones
            item.innerHTML = `
                <span>${nombre}</span>
                <span class="codigo-estacion">${codigo.padStart(5, '0')}</span>
            `;
            item.dataset.codigo = codigo;
            item.addEventListener('click', () => {
                estacion.value = nombre;           // Muestra el nombre en el input
                estacion.dataset.codigo = codigo;  // Guarda el código en un atributo del input
                sugerencias.classList.remove('visible');
            });
            estacion.addEventListener('input', () => {
                estacion.dataset.codigo = ''; // Borra el código al editar manualmente
            });
            sugerencias.appendChild(item);
        });
        sugerencias.classList.add('visible');
    } else {
        const sinCoincidencias = document.createElement("div");
        sinCoincidencias.textContent = "(sin coincidencias)";
        sinCoincidencias.classList.add("sugerencia", "no-click");
        sugerencias.appendChild(sinCoincidencias);
        return;
    }
}


export function mostrarEstacion() {
    const trenes = getProximosTrenes();
    const paginaActual = getPaginaActual();

    if (paginaActual < 0) {
        console.error("Índice de tren inválido o tren no encontrado.");
        return;
    }

    renderizarPanel(trenes);
    uiElements.resultadoEstacionDiv.classList.remove("hidden");
    document.getElementById("salidasLlegadasHeader").textContent = "Próximas "+getTipoPanel()+":";
}

function renderizarPanel(trenes) {
    const estaciones = getEstaciones();

    // Fecha de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    trenes.forEach(tren => {
        const paso = tren.passthroughStep.departurePassthroughStepSides || tren.passthroughStep.arrivalPassthroughStepSides;
        const launchingDate = paso.plannedTime;
        const fecha = launchingDate ? new Date(launchingDate) : null;

        if (fecha) {
            // Normaliza la fecha a las 00:00:00
            fecha.setHours(0, 0, 0, 0);

            // Si la fecha es distinta a la anterior y no es hoy, añade separador
            if ((!lastDate || fecha.getTime() !== lastDate.getTime()) && fecha.getTime() !== hoy.getTime()) {
                const separador = document.createElement('tr');
                separador.className = 'fila-separador-dia';
                separador.innerHTML = `<td colspan="9">↓ ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} ↓</td>`;
                uiElements.tablaPanelBody.appendChild(separador);
                lastDate = fecha;
            }
        }

        const claseEstado = `estado-${traducirEstado(paso.circulationState).replaceAll(" ", "_")}`;
        const estadoTraducido = traducirEstado(paso.circulationState);
        let horaPlanificada = formatearTimestampHora(paso.plannedTime);
        let horaReal = calcularHoraReal(horaPlanificada, paso.forecastedOrAuditedDelay);
        let mostrarHoraReal = (
            estadoTraducido !== 'SUPRIMIDO' &&
            estadoTraducido !== 'PENDIENTE DE CIRCULAR' &&
            horaReal
        );
        const fila = document.createElement('tr');
        // Obtén los nombres de las estaciones
        const origen = estaciones[tren.commercialPathInfo.commercialPathKey.originStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.originStationCode;
        const destino = estaciones[tren.commercialPathInfo.commercialPathKey.destinationStationCode.replace(/^0+/, '')] || tren.commercialPathInfo.commercialPathKey.destinationStationCode;

        let tacharHora = paso.forecastedOrAuditedDelay !== null && (paso.forecastedOrAuditedDelay >= 180 || paso.forecastedOrAuditedDelay < 0) && estadoTraducido !== 'PENDIENTE DE CIRCULAR';

        // Construye la celda según tipoPanel
        let celdaDestinoOrigen = '';
        if (getTipoPanel() === 'salidas') {
            celdaDestinoOrigen = `
                <span>${destino}</span>
                <br>
                <span class="origen-difuminado">ORIGEN: ${origen}</span>
            `;
        } else {
            celdaDestinoOrigen = `
                <span>${origen}</span>
                <br>
                <span class="origen-difuminado">DESTINO: ${destino}</span>
            `;
        }

        fila.innerHTML = `
        <td>
            <span${tacharHora ? ' style="text-decoration: line-through;"' : ''}>${horaPlanificada}</span>
            ${mostrarHoraReal ? `<span class="hora-real ${getColorClass(paso.forecastedOrAuditedDelay)}">${horaReal}</span>` : ''}
        </td>
        <td>
            ${mostrarHoraReal ? `<span class="${getColorClass(paso.forecastedOrAuditedDelay)}">${formatoRetraso(paso.forecastedOrAuditedDelay)}</span>` : ''}
        </td>
        <td>
            ${celdaDestinoOrigen}
        </td>
        <td>
            <span class="numero-tren-clicable" style="cursor:pointer;" onclick="buscarTrenClick(${tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.commercialNumber}, this)" title="Ver marcha">
                ${tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.commercialNumber|| ''}
            </span>
        </td>
        <td>
            ${tren.commercialPathInfo.opeProComPro?.operator || ''}
            - ${traducirOperador(tren.commercialPathInfo.opeProComPro?.operator) || ''}
            <br>
            <span class="origen-difuminado">
                ${tren.commercialPathInfo.opeProComPro?.product || ''}${tren.commercialPathInfo.opeProComPro?.commercialProduct.trim() ? ' - ' + tren.commercialPathInfo.opeProComPro?.commercialProduct : ''}
            </span>
        </td>
        <td>${paso.plannedPlatform || ''}</td>
        <td><span class="${claseEstado}">${estadoTraducido || ''}</span></td>
        `;
        uiElements.tablaPanelBody.appendChild(fila);
    });

    ajustarFilasParaEstadoEstacion();
}

function ajustarFilasParaEstadoEstacion() {
    const filas = Array.from(uiElements.tablaPanelBody.querySelectorAll('tr'));
    for (let i = filas.length - 1; i >= 0; i--) {
        const fila = filas[i];
        const estadoCirculacion = fila.cells[8]?.textContent.trim()
        if (estadoCirculacion === 'SUPRIMIDO') fila.classList.add('estado-sup');
        else if (estadoCirculacion === 'PENDIENTE DE CIRCULAR') fila.classList.add('estado-e');
        if (estadoCirculacion === 'SUPRIMIDO' || estadoCirculacion === 'PENDIENTE DE CIRCULAR'){
            fila.cells[1].textContent = '';
            fila.cells[2].textContent = '';
        }
    }
}

function buscarTrenClick(numero, button) {
    // Cambiar pestaña activa
    document.getElementById("marchasButton").click();
    // Cambiar texto barra de búsqueda
    const barraBusqueda = document.getElementById("numeroTren");
    barraBusqueda.value = numero;

    // Simular pulsación de Enter en el input
    document.getElementById("buscarTrenButton").click();
}
window.buscarTrenClick = buscarTrenClick;

// FUNCIONES GENERALES

function formatearTimestampFecha(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatearTimestampHora(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString('es-ES');
}

function calcularHoraReal(horaTeoricaStr, retrasoSegundos) {
    if (!horaTeoricaStr || retrasoSegundos === null) return '';
    const [horas, minutos, segundos] = horaTeoricaStr.split(':').map(Number);
    let totalSegundos = horas * 3600 + minutos * 60 + segundos + retrasoSegundos;
    totalSegundos = ((totalSegundos % 86400) + 86400) % 86400; // Manejar días y negativos
    
    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSegundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function formatoRetraso(segundosTotales) {
    if (segundosTotales === null) return '';
    const negativo = segundosTotales < 0 ? '-' : '';
    const absSegundos = Math.abs(segundosTotales);
    const h = Math.floor(absSegundos / 3600);
    const m = Math.floor((absSegundos % 3600) / 60);
    const s = absSegundos % 60;
    
    if (h > 0) return `${negativo}${h}h ${m}m ${s}s`;
    if (m > 0) return `${negativo}${m}m ${s}s`;
    return `${negativo}${s}s`;
}

function getColorClass(delay) {
    if (delay === null) return '';
    if (delay < 0) return 'azul';
    if (delay < 180) return 'verde';
    if (delay < 600) return 'amarillo';
    return 'rojo';
}

// --- DICCIONARIOS DE TRADUCCIÓN ---

function traducirEstado(estado) {
    const traducciones = {
        "STOPPED": "DETENIDO", "PENDING_TO_CIRCULATE": "PENDIENTE DE CIRCULAR",
        "TRACKING_LOST": "SEGUIMIENTO PERDIDO", "RUNNING": "EN MARCHA",
        "SUPPRESSED": "SUPRIMIDO", "FINISHED": "FINALIZADO"
    };
    return traducciones[estado] || estado;
}

function traducirVia(estado) {
    const traducciones = {
        "RELIABLE_PLANNED": "PLANIFICADO (PROBABLE)", "PLANNED": "PLANIFICADO",
        "OPERATOR": "OPERADOR"
    };
    return traducciones[estado] || estado;
}

function traducirParada(parada) {
    const traducciones = { "COMMERCIAL": "COMERCIAL", "NO_STOP": "↓", "TECHNICAL": "TÉCNICA" };
    return traducciones[parada] || parada;
}

function traducirOperador(operador) {
    const operadores = getOperadores();
    return operadores[operador] || '';
}

function mostrarTab(tabId) {
    document.querySelectorAll('.pantalla').forEach(div => div.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

function obtenerRutaPictograma(linea) {
    const nombresArchivos = {
        'C1': 'Cercanías_C1_(Rojo).svg',
        'C2': 'Cercanías_C2.svg',
        'C3': 'Cercanías_C3_(Azul).svg',
        'C4': 'Cercanías_C4_(MoradoAM).svg',
        'C5': 'Cercanías_C5.svg',
        'C6': 'Cercanías_C6_(AzulAM).svg',
        'C7': 'Cercanías_C7_(NaranjaAM).svg',
        'C8': 'Cercanías_C8.svg',
        'C9': 'Cercanías_C9.svg',
        'C10': 'Cercanías_C10.svg'
    };
    if (!linea) return null;
    return nombresArchivos[linea] ? `img/${nombresArchivos[linea]}` : `img/${linea}.png`;
}

export function renderizarPanelTeleindicador(datos) {
    const tbody = document.getElementById("tablaTeleindicadorBody");
    const estaciones = getEstaciones();

    if (!tbody) {
        console.error("No se encontró el tbody de la tabla del teleindicador");
        return;
    }

    tbody.innerHTML = "";

    if (!Array.isArray(datos) || datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hay datos disponibles</td></tr>`;
        return;
    }

    datos.forEach((tren) => {
        // Extraer info
        const info = tren.commercialPathInfo || {};
        const infoextra = tren.passthroughStep?.departurePassthroughStepSides || {};
        const estadoTraducido = traducirEstado(infoextra.circulationState || "");

        let tacharHora = infoextra.forecastedOrAuditedDelay !== null
            && (infoextra.forecastedOrAuditedDelay >= 180 || infoextra.forecastedOrAuditedDelay < 0)
            && estadoTraducido !== 'PENDIENTE DE CIRCULAR';

        let horaPlanificada = infoextra?.plannedTime ? formatearTimestampHora(infoextra.plannedTime) : "-";
        let horaMostrada = horaPlanificada;

        if (tacharHora) {
            const horaEstim = calcularHoraReal(horaPlanificada, infoextra.forecastedOrAuditedDelay);
            horaMostrada = `<span style="text-decoration:line-through;color:gray;">${horaPlanificada}</span><br><span class="${getColorClass(infoextra.forecastedOrAuditedDelay)}">${horaEstim}</span>`;
        }

        const linea = info.line ?? "-";
        const destinoCodigo = info.commercialDestinationStationCode ?? "-";
        const destino = estaciones[destinoCodigo.replace(/^0+/, '')] ?? destinoCodigo;
        const operador = traducirOperador(info.opeProComPro?.operator);
        const numeroTren = info.commercialPathKey?.commercialCirculationKey?.commercialNumber ?? "-";
        const via = infoextra.plannedPlatform ?? "-";
        const tipo = info.trainType ?? "-";

        // Saltar filas vacías
        if (horaMostrada === "-" && destino === "-" && numeroTren === "-") return;

        // -- Crear la fila y las celdas:
        const fila = document.createElement("tr");

        // Hora
        const celdaHora = document.createElement("td");
        celdaHora.innerHTML = horaMostrada;
        fila.appendChild(celdaHora);

        // Línea (texto o pictograma extra)
        const celdaLinea = document.createElement("td");
        celdaLinea.textContent = linea;
        fila.appendChild(celdaLinea);

        // Destino (con pastilla)
        const pictograma = obtenerRutaPictograma(linea);
        const celdaDestino = document.createElement("td");
        celdaDestino.className = "destino-con-pastilla";
        celdaDestino.style.display = "flex";
        celdaDestino.style.alignItems = "center";
        celdaDestino.style.gap = "0.5em";

        if (pictograma) {
            const img = document.createElement("img");
            img.src = pictograma;
            img.alt = linea;
            img.className = "pastilla-linea";
            img.style.height = "1.5em";
            celdaDestino.appendChild(img);
        }

        const spanDestino = document.createElement("span");
        spanDestino.textContent = destino ?? "-";
        celdaDestino.appendChild(spanDestino);
        fila.appendChild(celdaDestino);

        // Operador
        const celdaOperador = document.createElement("td");
        celdaOperador.textContent = operador;
        fila.appendChild(celdaOperador);

        // Nº tren
        const celdaNumTren = document.createElement("td");
        celdaNumTren.textContent = numeroTren;
        fila.appendChild(celdaNumTren);

        // Vía
        const celdaVia = document.createElement("td");
        celdaVia.textContent = via;
        fila.appendChild(celdaVia);

        // Tipo
        const celdaTipo = document.createElement("td");
        celdaTipo.textContent = tipo;
        fila.appendChild(celdaTipo);

        // Añadir la fila completa
        tbody.appendChild(fila);
    });
}
