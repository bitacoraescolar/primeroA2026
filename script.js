// 1. URL base (sin el ID de la hoja al final para poder elegir pestañas)
const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTP-skmtlp8jQxladB-ZebiaxZ9rBQhG6dhCRFplxuZow-YZtj5llFqyoMmeL4cUuPjR2xdaT0O_Woj/pub?output=csv'; 

async function fetchData() {
    try {
        // Creamos un sello de tiempo único para evitar la caché
        const cacheBuster = new Date().getTime();

        // GIDs de las pestañas
        const GID_EVENTOS = '2029076722';
        const GID_INFO = '1489000987';
        const GID_RUTINA = '919577104';
        const GID_INFOC = '837205501';
        const GID_MATERIAL = '933095076'; // Reemplaza con el GID real de la hoja materialEscolar

        // Construcción de URLs
        const EVENTS_URL = `${BASE_URL}&gid=${GID_EVENTOS}&cb=${cacheBuster}`;
        const INFO_URL = `${BASE_URL}&gid=${GID_INFO}&cb=${cacheBuster}`;
        const RUTINA_URL = `${BASE_URL}&gid=${GID_RUTINA}&cb=${cacheBuster}`;
        const INFOC_URL = `${BASE_URL}&gid=${GID_INFOC}&cb=${cacheBuster}`;
        const MATERIAL_URL = `${BASE_URL}&gid=${GID_MATERIAL}&cb=${cacheBuster}`;

        // Peticiones simultáneas
        const [resEvents, resInfo, resRutina, resInfoc, resMaterial] = await Promise.all([
            fetch(EVENTS_URL),
            fetch(INFO_URL),
            fetch(RUTINA_URL),
            fetch(INFOC_URL),
            fetch(MATERIAL_URL)
        ]);        

        const dataEvents = await resEvents.text();
        const dataInfo = await resInfo.text();
        const dataRutina = await resRutina.text();
        const dataInfoc = await resInfoc.text();
        const dataMaterial = await resMaterial.text();

        const events = parseCSV(dataEvents);
        const infoItems = parseCSV(dataInfo);
        const rutinaItems = parseCSV(dataRutina);
        const InfocItems = parseCSV(dataInfoc);
        const materialItems = parseCSV(dataMaterial);

        //console.log(infoItems)

        // Renderizar todas las secciones
        displayEvents(events);
        displayGeneralInfo(infoItems);
        displayRutina(rutinaItems);
        displayInfoc(InfocItems);
        displayMaterial(materialItems);

    } catch (error) {
        console.error('Error fetching data:', error);
        document.querySelector('main').innerHTML = '<p style="text-align:center; color:red;">Error al cargar los datos. Intente más tarde.</p>';
    }
}

// Helper: Parse CSV
function parseCSV(csvText) {
    const rows = csvText.split('\n');
    if (rows.length < 1) return [];
    
    const headers = rows[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const values = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
        
        let obj = {};
        headers.forEach((header, index) => {
            let val = values[index] ? values[index].trim() : '';
            val = val.replace(/^"|"$/g, ''); 
            obj[header] = val;
        });
        data.push(obj);
    }
    return data;
}

function displayEvents(events) {
    const containers = {
        today: document.getElementById('today-events'),
        thisWeek: document.getElementById('this-week-events'),
        nextWeek: document.getElementById('next-week-events'),
        thisMonth: document.getElementById('this-month-events'),
        nextMonth: document.getElementById('next-month-events'),
        future: document.getElementById('future-events'),
        past: document.getElementById('past-events')
    };

    
    // Limpiar todos los contenedores antes de llenar
    Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- CÁLCULO DE RANGOS TEMPORALES ---

    // 1. Fin de esta semana (domingo a las 23:59)
    const endOfThisWeek = new Date(today);
    const daysUntilSunday = 7 - (today.getDay() === 0 ? 7 : today.getDay());
    endOfThisWeek.setDate(today.getDate() + daysUntilSunday);
    endOfThisWeek.setHours(23, 59, 59, 999);

    // 2. Próxima semana (lunes a domingo)
    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);

    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    // 3. Fin de este mes
    const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // 4. Rango del próximo mes
    const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1, 0, 0, 0, 0);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);

    // --- PROCESAMIENTO DE DATOS ---
    const processedEvents = events.map(event => {
        if(!event.Fecha) return null;
        const parts = event.Fecha.split('-');
        // Crear objeto de fecha asegurando que sea local
        return { ...event, dateObj: new Date(parts[0], parts[1] - 1, parts[2]) };
    }).filter(e => e !== null).sort((a, b) => a.dateObj - b.dateObj);

    let hasToday = false;

    processedEvents.forEach(event => {
        const eTime = event.dateObj.getTime();
        const cardHTML = createCardHTML(event);

        // Clasificación por prioridad
        if (eTime === today.getTime()) {
            containers.today.innerHTML += cardHTML;
            hasToday = true;
        } 
        else if (eTime > today.getTime() && eTime <= endOfThisWeek.getTime()) {
            containers.thisWeek.innerHTML += cardHTML;
        } 
        else if (eTime >= startOfNextWeek.getTime() && eTime <= endOfNextWeek.getTime()) {
            containers.nextWeek.innerHTML += cardHTML;
        } 
        else if (eTime > endOfNextWeek.getTime() && eTime <= endOfThisMonth.getTime()) {
            // Eventos que quedan de este mes después de la próxima semana
            if(containers.thisMonth) containers.thisMonth.innerHTML += cardHTML;
        }
        else if (eTime >= startOfNextMonth.getTime() && eTime <= endOfNextMonth.getTime()) {
            if(containers.nextMonth) containers.nextMonth.innerHTML += cardHTML;
        }
        else if (eTime > endOfNextMonth.getTime()) {
            containers.future.innerHTML += cardHTML;
        }
    });

    // --- ACTIVIDADES ANTERIORES (Historial reciente) ---
    const pastEvents = processedEvents
        .filter(e => e.dateObj < today)
        .sort((a, b) => b.dateObj - a.dateObj) // Orden inverso (más reciente primero)
        .slice(0, 3);

    pastEvents.forEach(event => {
        if(containers.past) containers.past.innerHTML += createCardHTML(event);
    });

    // Control del mensaje "No hay eventos para hoy"
    const noTodayMsg = document.getElementById('no-today');
    if(noTodayMsg) noTodayMsg.style.display = hasToday ? 'none' : 'block';
}

function createCardHTML(event) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dateSpanish = event.dateObj.toLocaleDateString('es-ES', options);
    dateSpanish = dateSpanish.charAt(0).toUpperCase() + dateSpanish.slice(1);
    
    const eventTime = event.Hora ? ` | 🕒 ${event.Hora}` : '';
    
    // 1. LIMPIEZA DEL TÍTULO (Elimina iconos para WhatsApp)
    const tituloSinIcono = (event.Titulo || 'EVENTO')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim()
        .toUpperCase();

    // 2. LIMPIEZA DE LA DESCRIPCIÓN (Elimina etiquetas HTML como <b>, <br>, etc)
    const descripcionLimpia = (event.Descripcion || '')
        .replace(/<[^>]*>?/gm, '') 
        .trim();

    // --- LÓGICA DEL MENSAJE DE WHATSAPP ---
    const textoWA = `*RECORDATORIO: ${tituloSinIcono}*\n\n` +
                    `*Fecha:* ${dateSpanish}\n` +
                    `*Hora:* ${event.Hora || 'No especificada'}\n` +
                    `*Lugar:* ${event.Ubicacion || 'No especificada'}\n` +
                    `*Detalle:* ${descripcionLimpia}`; 
    const linkWhatsApp = `https://wa.me/?text=${encodeURIComponent(textoWA)}`;

    return `
        <div class="event-card">
            <div class="event-date">${dateSpanish}${eventTime}</div>
            <h3 class="event-title">${event.Titulo || 'Sin título'}</h3>
            <p class="event-desc">${event.Descripcion || ''}</p>
            <div class="event-meta">📍 ${event.Ubicacion || 'No especificada'}</div>
            <div class="event-tipo">🏷️${event.Tipo || 'No especificada'}</div>
            
            <a href="${linkWhatsApp}" target="_blank" class="btn-wa-circle" title="Compartir en WhatsApp">
                <i class="fab fa-whatsapp"></i>
            </a>
        </div>
    `;
}

function displayGeneralInfo(infoItems) {
    const infoGrid = document.querySelector('.info-grid');
    const noteText = document.getElementById('note-text');
    const noteContainer = document.getElementById('floating-note');
    
    if(!infoGrid) return;

    // --- CAMBIO AQUÍ: Usamos filter para obtener TODAS las urgentes ---
    const avisosUrgentes = infoItems.filter(item => item.Seccion === 'AVISO');
    
    if (avisosUrgentes.length > 0 && noteText) {
        // Unimos todas las noticias con un separador o un salto de línea <br>
        noteText.innerHTML = avisosUrgentes.map(aviso => 
            `<strong>${aviso.Seccion}:</strong> ${aviso.Contenido}`
        ).join('<br><hr style="border:0; border-top:1px solid #ffcccc; margin:5px 0;">');
        
        noteContainer.style.display = 'block';
    } else if (noteContainer) {
        noteContainer.style.display = 'none';
    }

 // 2. Lógica para las tarjetas (Filtra para EXCLUIR el urgente)
    infoGrid.innerHTML = ''; 

    // Usamos .filter() para crear una lista que no tenga 'URGENTE'
    const itemsParaTarjetas = infoItems.filter(item => item.Seccion !== 'AVISO');

    itemsParaTarjetas.forEach(item => {
        infoGrid.innerHTML += `
            <div class="info-card">
                <h3>${item.Icono || 'ℹ️'} ${item.Seccion || 'Aviso'}</h3>
                <p>${item.Contenido || ''}</p>
            </div>
        `;
    });
}

function displayInfoc(infocItems) {
    const infoCGrid = document.querySelector('.infoc-grid');    
    if(!infoCGrid) return;
    infoCGrid.innerHTML = ''; 

    infocItems.forEach(item => {
        if (!item.Icono && !item.Contenido && item.Seccion) {
            infoCGrid.innerHTML += `
                <div class="grid-separator">
                    <h3>${item.Seccion}</h3>
                </div>
            `;
        } else {
            infoCGrid.innerHTML += `
                <div class="infoc-card">
                    <h3>${item.Icono || 'ℹ️'} ${item.Seccion || 'Aviso'}</h3>
                    <p>${item.Contenido || ''}</p>
                </div>
            `;
        }
    });
}

function displayRutina(rutinaItems) {
    const rutinaGrid = document.getElementById('rutina-grid');
    if(!rutinaGrid) return;
    rutinaGrid.innerHTML = ''; 

    rutinaItems.forEach(item => {
        rutinaGrid.innerHTML += `
            <div class="info-card" style="border-left: 5px solid #f39c12;">
                <h3 style="color: #d35400;">${item.Dia || ''}</h3>
                <p><strong>${item.Actividad || ''}</strong></p>
                <p style="font-size: 0.9rem; color: #666;">${item.Detalle || ''}</p>
            </div>
        `;
    });
}

// NUEVA FUNCIÓN: Mostrar Material Escolar
function displayMaterial(materialItems) {
    const materialGrid = document.getElementById('lista-material');
    if(!materialGrid) return;
    materialGrid.innerHTML = '';

    // Filtrar los que tienen 'activo' en 1 (o "1")
    const materialesActivos = materialItems.filter(item => item.ACTIVO == '1');

    //console.log(materialesActivos)

    if (materialesActivos.length === 0) {
        materialGrid.innerHTML = '<p class="empty-message">No hay material cargado actualmente.</p>';
        return;
    }

    materialesActivos.forEach(item => {
        materialGrid.innerHTML += `
            <div class="info-card" style="border-left: 5px solid #e74c3c;">
                <h3 style="color: #c0392b;"><i class="fas fa-file-pdf"></i> ${item.TITULO || 'Material'}</h3>
                <div style="margin-top: 10px;">
                    <a href="${item.URL}" target="_blank" class="btn-download" style="background-color: #e74c3c; color: white; padding: 5px 15px; text-decoration: none; border-radius: 4px; font-size: 0.85rem; display: inline-block;">
                        <i class="fas fa-download"></i> Descargar PDF
                    </a>
                </div>
            </div>
        `;
    });
}

function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
        tabcontent[i].classList.remove("active");
    }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

document.addEventListener('DOMContentLoaded', fetchData);

function closeNote() {
    const note = document.getElementById('floating-note');
    if (note) {
        note.style.display = 'none';
    }
}
