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
              <div><strong class="blanco">Origen:</strong><br>${estaciones[info.commercialPathKey.originStationCode.replace(/^0+/, '')] || info.commercialPathKey.commercialCirculationKey.originStationCode}</div>
              <div><strong class="blanco">Destino:</strong><br>${estaciones[info.commercialPathKey.destinationStationCode.replace(/^0+/, '')] || info.commercialPathKey.commercialCirculationKey.destinationStationCode}</div>
          </div>
          <div class= "infoTablaColumna">
              <div><strong class="blanco">Tipo:</strong><br>${info.trafficType}</div>
              <div><strong class="blanco">Operador:</strong><br>
                    ${info.opeProComPro?.operator || ''}
                    ${
                        traducirOperador(info.opeProComPro?.operator)
                            ? ' - ' + traducirOperador(info.opeProComPro?.operator)
                            : ''
                    }
                </div>
              <div><strong class="blanco">Producto:</strong><br>${info.opeProComPro?.product || ''}${info.opeProComPro?.commercialProduct?.trim() ? ' - ' : ''}${info.opeProComPro?.commercialProduct?.trim() || ''}</div>
              ${info?.line ? `<div><strong class="blanco">Línea/Núcleo:</strong><br>${info.line} - ${info.core}</div>` : ''}
          </div>
          <div class= "infoTablaColumna">
              <div><strong class="blanco">Estado:</strong><br><span class="${claseEstado}">${estadoUltimaEstacion}</span></div>
              ${ultimaEstacion ? `<div><strong class="blanco">Última situación:</strong><br>${ultimaEstacion}${esUltimaEstacion ? ` (${esUltimaEstacion})` : ''}</div>` : ''}
              ${ultimaEstacion ? `<div><strong class="blanco">Retraso:</strong><br><span class="${getColorClass(retUltimaEstacion)}">${formatoRetraso(retUltimaEstacion)}</span></div>` : ''}
          </div>
        </div>
        <div class="infoTablaGlobal">
            <div class= "infoTablaColumna">
                ${info?.observation ? `<div><strong class="blanco">Observaciones:</strong><br>${info.observation}</div>` : ''}
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

        const viaInfo = obtenerVia(salida, llegada);

        fila.innerHTML = `
          <td>${estaciones[paso.stationCode.replace(/^0+/, '')] || paso.stationCode}</td>
          <td>${traducirParada(paso.stopType)}</td>
          <td>${llegada ? formatearTimestampHora(llegada.plannedTime) : ''}</td>
          <td>${llegada ? `<span class="${getColorClass(llegada.forecastedOrAuditedDelay)}">${calcularHoraReal(formatearTimestampHora(llegada.plannedTime), llegada.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${llegada ? `<span class="${getColorClass(llegada.forecastedOrAuditedDelay)}">${formatoRetraso(llegada.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${salida ? formatearTimestampHora(salida.plannedTime) : ''}</td>
          <td>${salida ? `<span class="${getColorClass(salida.forecastedOrAuditedDelay)}">${calcularHoraReal(formatearTimestampHora(salida.plannedTime), salida.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${salida ? `<span class="${getColorClass(salida.forecastedOrAuditedDelay)}">${formatoRetraso(salida.forecastedOrAuditedDelay)}</span>` : ''}</td>
          <td>${viaInfo.plataforma}</td>
          <td>${traducirVia(viaInfo.estado) || ''}</td>
          <td>${estadoPaso.texto}</td>
        `;
        uiElements.tablaPasosBody.appendChild(fila);
        if(paso.departurePassthroughStepSides?.supressed || paso.arrivalPassthroughStepSides?.supressed){
            fila.classList.add('estado-sup');
        }
    });
    
    if (estadoCirculacion === 'PENDIENTE DE CIRCULAR') {
        ajustarFilasParaEstado(estadoCirculacion);
    }
}

function obtenerVia(salida, llegada) {
    // Prioridad: CTC > SITRA > OPERATOR > PLANNED/RELIABLE_PLANNED
    const prioridad = ['CTC', 'SITRA', 'OPERATOR'];
    for (const tipo of prioridad) {
        if (salida?.resultantPlatform === tipo && salida?.[`${tipo.toLowerCase()}Platform`]) {
            return { plataforma: salida[`${tipo.toLowerCase()}Platform`], estado: tipo };
        }
        if (llegada?.resultantPlatform === tipo && llegada?.[`${tipo.toLowerCase()}Platform`]) {
            return { plataforma: llegada[`${tipo.toLowerCase()}Platform`], estado: tipo };
        }
    }
    // Si ambos son PLANNED o RELIABLE_PLANNED, mostrar plannedPlatform
    if (
        (['PLANNED', 'RELIABLE_PLANNED'].includes(salida?.resultantPlatform) || !salida?.resultantPlatform) &&
        (['PLANNED', 'RELIABLE_PLANNED'].includes(llegada?.resultantPlatform) || !llegada?.resultantPlatform)
    ) {
        return { 
            plataforma: salida?.plannedPlatform || llegada?.plannedPlatform || '', 
            estado: salida?.resultantPlatform || llegada?.resultantPlatform || '' 
        };
    }
    // Si solo uno es PLANNED/RELIABLE_PLANNED y el otro es null, mostrar plannedPlatform
    return { 
        plataforma: salida?.plannedPlatform || llegada?.plannedPlatform || '', 
        estado: salida?.resultantPlatform || llegada?.resultantPlatform || '' 
    };
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

    // Limpia el atributo data-codigo si el usuario edita el input
    estacion.removeAttribute('data-codigo');

    if (estacionInput.length < 2) {
        // Mostrar favoritos
        const favs = getFavoritosEstaciones();
        if (favs.length > 0) {
            const estaciones = getEstaciones();
            const titulo = document.createElement('div');
            titulo.textContent = "Favoritos";
            titulo.classList.add("sugerencias-titulo");
            sugerencias.appendChild(titulo);

            favs.forEach(codigo => {
                const nombre = estaciones[codigo];
                if (!nombre) return;
                const item = document.createElement('div');
                item.innerHTML = `
                    <span class="nombre-estacion-wrap">${nombre}</span>
                    <span class="codigo-estacion">${codigo.padStart(5, '0')}</span>
                `;
                item.dataset.codigo = codigo;
                item.addEventListener('click', () => {
                    estacion.value = nombre;
                    estacion.setAttribute('data-codigo', codigo);
                    sugerencias.classList.remove('visible');
                    mostrarFavoritoEstrella();
                    document.getElementById('clearNumeroEst').classList.add('visible');
                    document.getElementById('estrellaFavoritoEst').classList.add('visible');
                    estacion.classList.add('input-con-x');
                });
                sugerencias.appendChild(item);
            });
            sugerencias.classList.add('visible');
        } else sugerencias.classList.remove('visible');
        return;
    }

    // Dividir en palabras (divisor: espacio o guión)
    const palabras = estacionInput.split(/[\s-]+/).filter(p => p.length > 0);

    // Si el input es numérico, buscar también por código
    const esNumerico = /^\d+$/.test(estacionInput);

    const coincidencias = estacionesArray.filter(([codigo, nombre]) => {
        const nombreLower = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const coincideNombre = palabras.every(palabra => nombreLower.includes(palabra));
        const coincideCodigo = esNumerico && codigo.padStart(5, '0').includes(estacionInput);
        return coincideNombre || coincideCodigo;
    });

    // Añadir título de sugerencias
    const titulo = document.createElement('div');
    titulo.textContent = "Sugerencias";
    titulo.classList.add("sugerencias-titulo");
    sugerencias.appendChild(titulo);

    if (coincidencias.length > 0) {
        coincidencias.forEach(([codigo, nombre]) => {
            const item = document.createElement('div');
            item.innerHTML = `
            <span class="nombre-estacion-wrap">${nombre}</span>
            <span class="codigo-estacion">${codigo.padStart(5, '0')}</span>
            `;
            item.dataset.codigo = codigo;
            item.addEventListener('click', () => {
                estacion.value = nombre;
                estacion.setAttribute('data-codigo', codigo);
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

    // Ordenar trenes por fecha y hora real (timestamp)
    trenes.sort((a, b) => {
        const pasoA = a.passthroughStep.departurePassthroughStepSides || a.passthroughStep.arrivalPassthroughStepSides;
        const pasoB = b.passthroughStep.departurePassthroughStepSides || b.passthroughStep.arrivalPassthroughStepSides;
        return getTimestampReal(pasoA) - getTimestampReal(pasoB);
    });

    // Fecha de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    //OBSERVACIONES DE ESTACIONES (TODO)
    //document.getElementById("infoEstacion").innerHTML = ``;

    trenes.forEach(tren => {
        const paso = tren.passthroughStep.departurePassthroughStepSides || tren.passthroughStep.arrivalPassthroughStepSides;
        const timestampReal = getTimestampReal(paso);
        const fecha = timestampReal ? new Date(timestampReal) : null;

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

        const numeroTren = tren.commercialPathInfo.commercialPathKey.commercialCirculationKey.commercialNumber || '';

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
            <span class="numero-tren-clicable" style="cursor:pointer;" onclick="buscarTrenClick('${numeroTren}')" title="Ver marcha">
                ${numeroTren}
            </span>
        </td>
        <td>
            ${tren.commercialPathInfo.opeProComPro?.operator || ''}
            ${
                traducirOperador(tren.commercialPathInfo.opeProComPro?.operator)
                    ? ' - ' + traducirOperador(tren.commercialPathInfo.opeProComPro?.operator)
                    : ''
            }
            <br>
            <span class="origen-difuminado">
                ${tren.commercialPathInfo.opeProComPro?.product || ''}
                ${
                    tren.commercialPathInfo.opeProComPro?.commercialProduct.trim()
                        ? ' - ' + tren.commercialPathInfo.opeProComPro?.commercialProduct
                        : ''
                }
            </span>
        </td>
        <td>${obtenerVia(paso,paso).plataforma || ''}</td>
        <td><span class="${claseEstado}">${estadoTraducido || ''}</span></td>
        <td>${traducirParada(tren.passthroughStep.stopType)}</td>
        `;
        uiElements.tablaPanelBody.appendChild(fila);
    });

    ajustarFilasParaEstadoEstacion();
}

function getTimestampReal(paso) {
    if (!paso?.plannedTime) return 0;
    const retraso = paso.forecastedOrAuditedDelay || 0;
    return paso.plannedTime + retraso * 1000;
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

function buscarTrenClick(numero) {
    // Cambiar pestaña activa
    document.getElementById("marchasButton").click();
    // Cambiar texto barra de búsqueda
    const barraBusqueda = document.getElementById("numeroTren");
    barraBusqueda.value = numero;

    // Simular pulsación de Enter en el input
    document.getElementById("buscarTrenButton").click();
}
window.buscarTrenClick = buscarTrenClick;

// FAVORITOS
function getFavoritosEstaciones() {
    return JSON.parse(localStorage.getItem('favoritosEstaciones') || '[]');
}
function setFavoritosEstaciones(favs) {
    localStorage.setItem('favoritosEstaciones', JSON.stringify(favs));
}
export function toggleFavoritoEstacion(codigo) {
    let favs = getFavoritosEstaciones();
    if (favs.includes(codigo)) {
        favs = favs.filter(c => c !== codigo);
    } else {
        favs.push(codigo);
    }
    setFavoritosEstaciones(favs);
    mostrarFavoritoEstrella();
    mostrarFavoritoEstrellaTele();
}

export function mostrarFavoritoEstrella() {
  const estacionInput = document.getElementById("numeroEst");
  const estrella = document.getElementById("estrellaFavoritoEst");
  const estaciones = getEstaciones();
  let codigo = null;
  const inputNorm = estacionInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();

  // Si el input es numérico, buscar por código también
  const esNumerico = /^\d+$/.test(estacionInput.value.trim());

  for (const [cod, nombre] of Object.entries(estaciones)) {
    const nombreNorm = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();

    // Coincidencia por nombre normalizado
    if (nombreNorm === inputNorm) {
      codigo = cod;
      break;
    }

    // Coincidencia por código (rellenado a 5 dígitos)
    if (esNumerico && (cod === estacionInput.value.trim() || cod.padStart(5, '0') === estacionInput.value.trim())) {
      codigo = cod;
      break;
    }
  }

  if (!codigo) {
    estrella.classList.remove('favorito-activo');
    return;
  }
  const favs = getFavoritosEstaciones();
  if (favs.includes(codigo)) {
    estrella.classList.add('favorito-activo');
  } else {
    estrella.classList.remove('favorito-activo');
  }
}

// FAVORITOS TELEINDICADOR

export function mostrarFavoritoEstrellaTele() {
  const estacionInput = document.getElementById("stationInputTele");
  const estrella = document.getElementById("estrellaFavoritoTele");
  const estaciones = getEstaciones();
  let codigo = null;
  const inputNorm = estacionInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();

  // Si el input es numérico, buscar por código también
  const esNumerico = /^\d+$/.test(estacionInput.value.trim());

  for (const [cod, nombre] of Object.entries(estaciones)) {
    const nombreNorm = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();

    // Coincidencia por nombre normalizado
    if (nombreNorm === inputNorm) {
      codigo = cod;
      break;
    }

    // Coincidencia por código (rellenado a 5 dígitos)
    if (esNumerico && (cod === estacionInput.value.trim() || cod.padStart(5, '0') === estacionInput.value.trim())) {
      codigo = cod;
      break;
    }
  }

  if (!codigo) {
    estrella.classList.remove('favorito-activo');
    return;
  }
  const favs = getFavoritosEstaciones();
  if (favs.includes(codigo)) {
    estrella.classList.add('favorito-activo');
  } else {
    estrella.classList.remove('favorito-activo');
  }
}

// FAVORITOS TRENES
function getFavoritosTrenes() {
    return JSON.parse(localStorage.getItem('favoritosTrenes') || '[]');
}
function setFavoritosTrenes(favs) {
    localStorage.setItem('favoritosTrenes', JSON.stringify(favs));
}
export function toggleFavoritoTren(numero) {
    let favs = getFavoritosTrenes();
    if (favs.includes(numero)) {
        favs = favs.filter(n => n !== numero);
    } else {
        favs.push(numero);
    }
    setFavoritosTrenes(favs);
    mostrarFavoritoEstrellaTren();
}
export function mostrarFavoritoEstrellaTren() {
    const input = document.getElementById("numeroTren");
    const estrella = document.getElementById("estrellaFavoritoNumero");
    const numero = input.value.trim();
    const favs = getFavoritosTrenes();
    if (favs.includes(numero)) {
        estrella.classList.add('favorito-activo');
    } else {
        estrella.classList.remove('favorito-activo');
    }
}
export function mostrarFavoritosTren() {
    const input = document.getElementById("numeroTren");
    const favoritosDiv = document.getElementById("favoritos");
    favoritosDiv.innerHTML = '';

    if (input.value.trim().length < 2) {
        const favs = getFavoritosTrenes();
        const titulo = document.createElement('div');
        titulo.textContent = "Favoritos";
        titulo.classList.add("sugerencias-titulo");
        favoritosDiv.appendChild(titulo);

        if (favs.length > 0) {
            favs.forEach(numero => {
                const item = document.createElement('div');
                item.textContent = numero;
                item.classList.add("sugerencia");
                item.addEventListener('click', () => {
                    input.value = numero;
                    favoritosDiv.innerHTML = '';
                    mostrarFavoritoEstrellaTren();
                    // Mostrar la X y la estrella aunque se pierda el foco
                    document.getElementById('clearNumeroTren').classList.add('visible');
                    document.getElementById('estrellaFavoritoNumero').classList.add('visible');
                    input.classList.add('input-con-x');
                });
                favoritosDiv.appendChild(item);
            });
            favoritosDiv.classList.add('visible');
        } else {
            favoritosDiv.classList.remove('visible');
        }
    } else {
        favoritosDiv.classList.remove('visible');
        favoritosDiv.innerHTML = '';
    }
}

// FUNCIONES GENERALES

function formatearTimestampFecha(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatearTimestampHora(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString('es-ES');
}

function formatearTimestampHoraTele(timestamp) {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); // SIN segundos
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

function calcularHoraRealTele(horaTeoricaStr, retrasoSegundos) {
    if (!horaTeoricaStr || retrasoSegundos === null) return '';
    // Permitir hora con o sin segundos
    let [horas, minutos, segundos] = horaTeoricaStr.split(':').map(Number);
    if (segundos === undefined || isNaN(segundos)) segundos = 0;
    let totalSegundos = horas * 3600 + minutos * 60 + segundos + retrasoSegundos;
    totalSegundos = ((totalSegundos % 86400) + 86400) % 86400; // Manejar días y negativos
    
    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSegundos % 60).toString().padStart(2, '0');
    return `${h}:${m}`; // si quieres mostrar sin segundos
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


function obtenerRutaPictograma(linea, core) {
    const pictogramasCercanias = {
        MADRID: {
            C1: 'C1AZUL.svg',
            C2: 'C2VERDE.svg',
            C3: 'C3MORADO.svg',
            C4: 'C4AZUL.svg',
            C4a: 'C4AAZUL.svg',
            C4b: 'C4BAZUL.svg',
            C5: 'C5AMARILLO.svg',
            C7: 'C7ROJA.svg',
            C8: 'C8GRIS.svg',
            C8a: 'C8AGRIS.svg',
            C8b: 'C8BGRIS.svg',
            C9: 'C9NARANJA.svg',
            C10: 'C10VERDE.svg'
        },
        BILBAO: {
            C1: 'C1ROJA.svg',
            C2: 'C2VERDE.svg',
            C3: 'C3AZUL.svg',
            C4: 'C4MORADO.svg',
            C5: 'C5AZUL.svg'
        },
        SANTANDER: {
            C1: 'C1ROJA.svg',
            C2: 'C2VERDE.svg',
            C3: 'C3AZULOSCURO.svg'
        },
        ASTURIAS: {
            C1: 'C1ROJA.svg',
            C2: 'C2VERDE.svg',
            C3: 'C3AZULOSCURO.svg',
            C4: 'C4MORADO.svg',
            C5: 'C5VERDE.svg',
            C6: 'C6AZUL.svg',
            C7: 'C7NARANJA.svg',
            C8: 'C8AMARILLO.svg'
        },
        "SAN SEBASTIAN": {
            C1: 'C1ROJA.svg'
        },
        FERROL: {
            C1: 'C1ROJA.svg'
        },
        LEON: {
            C1: 'C1ROJA.svg'
        },
        ZARAGOZA: {
            C1: 'C1ROJA.svg'
        },
        VALENCIA: {
            C1: 'C1AZUL.svg',
            C2: 'C2AMARILLO.svg',
            C3: 'C3MORADO.svg',
            C5: 'C5VERDE.svg',
            C6: 'C6AZULOSCURO.svg'
        },
        MURCIA: {
            C1: 'C1AZUL.svg',
            C2: 'C2VERDE.svg',
            C3: 'C3MORADO.svg'
        },
        MALAGA: {
            C1: 'C1AZUL.svg',
            C2: 'C2VERDE.svg'
        },
        CADIZ: {
            C1: 'C1ROJA.svg',
            C1a: 'C1AROJA.svg',
            T1: 'T1VERDE.svg'
        },
        SEVILLA: {
            C1: 'C1ROJA.svg',
            C2: 'C2VERDE.svg',
            C3: 'C3AZUL.svg',
            C4: 'C4MORADO.svg'
        }
        // ... añade otros núcleos si los necesitas
    };
    if (!linea || !core) return null;
    const imgsNucleo = pictogramasCercanias[core.toUpperCase()];
    if (!imgsNucleo) return null;
    return imgsNucleo[linea] ? `img/${imgsNucleo[linea]}` : null;
}

function obtenerRutaIconoADIF(adif) {
  const reglas = {
    AVLDMD: {
      commercialProduct: {
        "AVANT": 'AVANT.png',
        "ALVIA": 'ALVIA.png',
        "MD": 'MD.png',
        "REGIONAL": 'REG.png',
        "REGIONAL EXPRES": 'REX.png',
        "INTERCITY": 'ICITY.png',
        "AVE": 'AVE.png',
        "AVLO": 'AVLO.png',
        "OUIGO": 'OUIGO.png',
        "IRYO": 'IRYO.png',
        "Material Vacio": 'SSERV.png',
        "REGIONAL RAM": 'FEVE.png',
        "RODALIES-R17": 'REXCAT.png',
        "RODALIES-R16": 'REXCAT.png',
        "RODALIES-R15": 'REGCAT.png',
        "RODALIES-R14": 'REGCAT.png',
        "RODALIES-R13": 'REGCAT.png',
        "RODALIES-R12": 'REGCAT.png'
      },
      default: 'RENFE.png'
    },
    GOODS: {
      operator: {
        "CM": 'CAPTRAIN.png',
        "MW": 'MEDWAY.png',
        "CF": 'CEFSA.png',
        "CT": 'CONTI.png',
        "RM": 'RM.png',
        "AD": 'ADIF.png',
        "GT": 'GO.png',
        "LC": 'LCR.png',
        "TT": 'TRANSFESA.png',
        "LG": 'LOGITREN.png',
        "AL": 'ALSA.png',
        "RX": 'ATHOS.png',
        "TR": 'TRACCION.png'
      },
      default: ''
    },
    CERCANIAS: {
      commercialProduct: {
        "CERCANIAS": 'CERCAN.png',
        "CERCANIAS RAM": 'FEVE.png',
        "RODALIES": 'RODCAT.png'
      },
      default: 'CERCAN.png'
    },
    OTHER: {
      commercialProduct: {
        "Material Vacio": 'SSERV.png',
        "Servicio Interno": 'SSERV.png',
      },
      operator: {
        "CM": 'CAPTRAIN.png',
        "MW": 'MEDWAY.png',
        "CF": 'CEFSA.png',
        "CT": 'CONTI.png',
        "RM": 'RM.png',
        "RF": 'RENFE.png',
        "AD": 'ADIF.png',
        "GT": 'GO.png',
        "LC": 'LCR.png',
        "TT": 'TRANSFESA.png',
        "LG": 'LOGITREN.png',
        "AL": 'ALSA.png',
        "RX": 'ATHOS.png',
        "TR": 'TRACCION.png'
      },
      default: 'SSERV.png'
    },
  };

  const { trafficType, opeProComPro = {} } = adif;
  const regla = reglas[trafficType];
  if (!regla) return '';  // sin regla → nada

  // 1) commercialProduct si existe en la regla
  if (regla.commercialProduct) {
    const prod = opeProComPro.commercialProduct;
    if (prod && regla.commercialProduct[prod]) {
      return `img/${regla.commercialProduct[prod]}`;
    }
  }

  // 2) operator si existe en la regla
  if (regla.operator) {
    const op = opeProComPro.operator;
    if (op && regla.operator[op]) {
      return `img/${regla.operator[op]}`;
    }
  }

  // 3) default de este trafficType, si lo hay
  if (regla.default) {
    return `img/${regla.default}`;
  }

  // 4) sin default → nada
  return '';
}

export function renderizarPanelTeleindicador(datos) {
  const tbody             = document.getElementById("tablaTeleindicadorBody");
  const estaciones        = getEstaciones();
  const tipoPanelSelect   = document.getElementById("tipoPanelTele");
  const tipo              = tipoPanelSelect?.textContent.toLowerCase();

  // Actualiza el título
  if (tipoPanelSelect) {
    const titulo = document.getElementById("titulo-cabecera-tele");
    if (titulo) titulo.textContent = tipoPanelSelect.textContent.toUpperCase();
  }

  if (!tbody) {
    console.error("No se encontró el tbody de la tabla del teleindicador");
    return;
  }

  tbody.innerHTML = "";
  if (!Array.isArray(datos) || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay datos disponibles</td></tr>`;
    return;
  }

  datos.forEach((tren) => {
    // ── 1) Extraer info ───────────────────────────────────────────────────────────
    const info      = tren.commercialPathInfo || {};
    const infoextra = tipo === 'llegadas'
      ? tren.passthroughStep?.arrivalPassthroughStepSides   || {}
      : tren.passthroughStep?.departurePassthroughStepSides || {};
    const estadoTrad = traducirEstado(infoextra.circulationState || "");

    const delaySec  = infoextra.forecastedOrAuditedDelay || 0;
    const tacharHora = delaySec !== null
      && (delaySec >= 60 || delaySec < 0)
      && estadoTrad !== 'PENDIENTE DE CIRCULAR';

    const plannedMs = infoextra.plannedTime || 0;
    const horaPlan  = plannedMs
      ? formatearTimestampHoraTele(plannedMs)
      : "-";
    let horaMostrada = horaPlan;

    // cálculo hora estimada (ms)
    const horaEstimMs = plannedMs
      ? plannedMs + delaySec * 1000
      : null;

    if (tacharHora) {
      const horaEstimStr = calcularHoraRealTele(horaPlan, delaySec);
      horaMostrada = `
        <span style="text-decoration:line-through;color:gray;">${horaPlan}</span><br>
        <span class="${getColorClass(delaySec)}">${horaEstimStr}</span>
      `;
    }

    // estación origen/destino
    const oriCode = info.commercialOriginStationCode
    const desCode = info.commercialDestinationStationCode
    const origen  = oriCode
      ? estaciones[oriCode.replace(/^0+/, '')] || oriCode
      : "-";
    const destino = desCode
      ? estaciones[desCode.replace(/^0+/, '')] || desCode
      : "-";

    // pictograma de línea
    const pictograma = obtenerRutaPictograma(info.line, info.core);

    // operador
    const opCode = info.opeProComPro?.operator || "";
    const opName = traducirOperador(opCode);

    // producto comercial / product
    const commProd = info.opeProComPro?.commercialProduct?.trim() || "";
    const prod    = info.opeProComPro?.product || "";

    // número de tren
    const numeroTren = info.commercialPathKey?.commercialCirculationKey?.commercialNumber || "-";

    // vía
    const via = infoextra.plannedPlatform || "-";

    // ── 2) Crea la fila + celdas ─────────────────────────────────────────────────
    const fila = document.createElement("tr");

    // — Celda Hora —
    const tdHora = document.createElement("td");
    tdHora.innerHTML = `<span>${horaMostrada}</span>`;
    // parpadeo 0–5 min
    if (horaEstimMs) {
      const diffMin = (horaEstimMs - Date.now()) / 1000 / 60;
      if (diffMin >= -10 && diffMin <= 5) {
        tdHora.classList.add("parpadeante");
      }
    }
    fila.appendChild(tdHora);

    // — Celda Destino/Origen —
    const tdDest = document.createElement("td");
    const wrapper = document.createElement("div");
    wrapper.className = "destino-con-pastilla";
    if (pictograma) {
      const img = document.createElement("img");
      img.src = pictograma;
      img.alt = info.line || "";
      img.className = "pastilla-linea";
      wrapper.appendChild(img);
    }
    const spanDest = document.createElement("span");
    spanDest.textContent = tipo === 'llegadas' ? origen : destino;
    wrapper.appendChild(spanDest);
    tdDest.appendChild(wrapper);
    fila.appendChild(tdDest);

    // — Celda Operador —
    const tdOp = document.createElement("td");
    const rutaOp = obtenerRutaIconoADIF(info);
    if (rutaOp) {
      const spanOp = document.createElement("span");
      spanOp.innerHTML = `
        <img src="${rutaOp}" 
             alt="${commProd || opCode}" 
             class="icono-operador" />
      `;
      tdOp.appendChild(spanOp);
    }
    fila.appendChild(tdOp);

    // — Celda Nº Tren —
    const tdNum = document.createElement("td");
    const spanNum = document.createElement("span");
    spanNum.className = "numero-tren-clicable";
    spanNum.textContent = numeroTren;
    spanNum.setAttribute("onclick", `buscarTrenClick('${numeroTren}')`);
    tdNum.appendChild(spanNum);
    fila.appendChild(tdNum);

    // — Celda Vía —
    const tdVia = document.createElement("td");
    tdVia.innerHTML = `<span>${via}</span>`;
    fila.appendChild(tdVia);

    // Añade fila
    tbody.appendChild(fila);
  });
}

function actualizarHoraCabeceraTele() {
    const el = document.getElementById("hora-cabecera-tele");
    if (el) {
        const ahora = new Date();
        el.textContent = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}
setInterval(actualizarHoraCabeceraTele, 1000);
actualizarHoraCabeceraTele();

export function autocompletarEstacionesTele() {
    const estacionesArray = Object.entries(getEstaciones());
    const estacion = document.getElementById("stationInputTele");
    const estacionInput = estacion.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const sugerencias = document.getElementById("sugerenciasTele");
    sugerencias.innerHTML = '';

    // Limpia el atributo data-codigo si el usuario edita el input
    estacion.removeAttribute('data-codigo');

    if (estacionInput.length < 2) {
        // Mostrar favoritos
        const favs = getFavoritosEstaciones();
        if (favs.length > 0) {
            const estaciones = getEstaciones();
            const titulo = document.createElement('div');
            titulo.textContent = "Favoritos";
            titulo.classList.add("sugerencias-titulo");
            sugerencias.appendChild(titulo);

            favs.forEach(codigo => {
                const nombre = estaciones[codigo];
                if (!nombre) return;
                const item = document.createElement('div');
                item.innerHTML = `
                    <span class="nombre-estacion-wrap">${nombre}</span>
                    <span class="codigo-estacion">${codigo.padStart(5, '0')}</span>
                `;
                item.dataset.codigo = codigo;
                item.addEventListener('click', () => {
                    estacion.value = nombre;
                    estacion.setAttribute('data-codigo', codigo);
                    sugerencias.classList.remove('visible');
                    mostrarFavoritoEstrella();
                    document.getElementById('clearNumeroTele').classList.add('visible');
                    document.getElementById('estrellaFavoritoTele').classList.add('visible');
                    estacion.classList.add('input-con-x');
                });
                sugerencias.appendChild(item);
            });
            sugerencias.classList.add('visible');
        } else sugerencias.classList.remove('visible');
        return;
    }

    // Dividir en palabras (divisor: espacio o guión)
    const palabras = estacionInput.split(/[\s-]+/).filter(p => p.length > 0);

    // Si el input es numérico, buscar también por código
    const esNumerico = /^\d+$/.test(estacionInput);

    const coincidencias = estacionesArray.filter(([codigo, nombre]) => {
        const nombreLower = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const coincideNombre = palabras.every(palabra => nombreLower.includes(palabra));
        const coincideCodigo = esNumerico && codigo.padStart(5, '0').includes(estacionInput);
        return coincideNombre || coincideCodigo;
    });

    // Añadir título de sugerencias
    const titulo = document.createElement('div');
    titulo.textContent = "Sugerencias";
    titulo.classList.add("sugerencias-titulo");
    sugerencias.appendChild(titulo);

    if (coincidencias.length > 0) {
        coincidencias.forEach(([codigo, nombre]) => {
            const item = document.createElement('div');
            item.innerHTML = `
            <span class="nombre-estacion-wrap">${nombre}</span>
            <span class="codigo-estacion">${codigo.padStart(5, '0')}</span>
            `;
            item.dataset.codigo = codigo;
            item.addEventListener('click', () => {
                estacion.value = nombre;
                estacion.setAttribute('data-codigo', codigo);
                sugerencias.classList.remove('visible');
                actualizarControlesInput(
                    estacion,
                    document.getElementById('clearNumeroTele'),
                    document.getElementById('estrellaFavoritoTele')
                );
                mostrarFavoritoEstrellaTele();
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
