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

        // Construcción de URLs
        const EVENTS_URL = `${BASE_URL}&gid=${GID_EVENTOS}&cb=${cacheBuster}`;
        const INFO_URL = `${BASE_URL}&gid=${GID_INFO}&cb=${cacheBuster}`;
        const RUTINA_URL = `${BASE_URL}&gid=${GID_RUTINA}&cb=${cacheBuster}`;
        const INFOC_URL = `${BASE_URL}&gid=${GID_INFOC}&cb=${cacheBuster}`;

        // Peticiones simultáneas
        const [resEvents, resInfo, resRutina, resInfoc] = await Promise.all([
            fetch(EVENTS_URL),
            fetch(INFO_URL),
            fetch(RUTINA_URL),
            fetch(INFOC_URL)
        ]);        

        const dataEvents = await resEvents.text();
        const dataInfo = await resInfo.text();
        const dataRutina = await resRutina.text();
        const dataInfoc = await resInfoc.text();

        const events = parseCSV(dataEvents);
        const infoItems = parseCSV(dataInfo);
        const rutinaItems = parseCSV(dataRutina);
        const InfocItems = parseCSV(dataInfoc);

        console.log(InfocItems)

        // Renderizar todas las secciones
        displayEvents(events);
        displayGeneralInfo(infoItems);
        displayRutina(rutinaItems);
        displayInfoc(InfocItems);

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
        future: document.getElementById('future-events'),
        past: document.getElementById('past-events')
    };

    Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfThisWeek = new Date(today);
    const daysUntilSunday = 7 - (today.getDay() === 0 ? 7 : today.getDay());
    endOfThisWeek.setDate(today.getDate() + daysUntilSunday);
    endOfThisWeek.setHours(23, 59, 59, 999);

    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);

    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    const processedEvents = events.map(event => {
        if(!event.Fecha) return null;
        const parts = event.Fecha.split('-');
        return { ...event, dateObj: new Date(parts[0], parts[1] - 1, parts[2]) };
    }).filter(e => e !== null).sort((a, b) => a.dateObj - b.dateObj);

    let hasToday = false;

    processedEvents.forEach(event => {
        const eTime = event.dateObj.getTime();
        const cardHTML = createCardHTML(event);

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
        else if (eTime > endOfNextWeek.getTime()) {
            containers.future.innerHTML += cardHTML;
        }
    });

    const pastEvents = processedEvents
        .filter(e => e.dateObj < today)
        .sort((a, b) => b.dateObj - a.dateObj)
        .slice(0, 3);

    pastEvents.forEach(event => {
        containers.past.innerHTML += createCardHTML(event);
    });

    const noTodayMsg = document.getElementById('no-today');
    if(noTodayMsg) noTodayMsg.style.display = hasToday ? 'none' : 'block';
}

function createCardHTML(event) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dateSpanish = event.dateObj.toLocaleDateString('es-ES', options);
    dateSpanish = dateSpanish.charAt(0).toUpperCase() + dateSpanish.slice(1);
    const eventTime = event.Hora ? ` | 🕒 ${event.Hora}` : '';

    return `
        <div class="event-card">
            <div class="event-date">${dateSpanish}${eventTime}</div>
            <h3 class="event-title">${event.Titulo || 'Sin título'}</h3>
            <p class="event-desc">${event.Descripcion || ''}</p>
            <div class="event-meta">📍 ${event.Ubicacion || 'No especificada'} | 🏷️ ${event.Tipo || 'General'}</div>
        </div>
    `;
}

function displayGeneralInfo(infoItems) {
    const infoGrid = document.querySelector('.info-grid');
    if(!infoGrid) return;
    infoGrid.innerHTML = ''; 

    infoItems.forEach(item => {
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
        // Si la fila no tiene icono ni contenido, la tratamos como un SEPARADOR
        if (!item.Icono && !item.Contenido && item.Seccion) {
            infoCGrid.innerHTML += `
                <div class="grid-separator">
                    <h3>${item.Seccion}</h3>
                </div>
            `;
        } else {
            // Tarjeta normal
            infoCGrid.innerHTML += `
                <div class="infoc-card">
                    <h3>${item.Icono || 'ℹ️'} ${item.Seccion || 'Aviso'}</h3>
                    <p>${item.Contenido || ''}</p>
                </div>
            `;
        }
    });
}

// NUEVA FUNCIÓN: Mostrar Rutina Semanal
function displayRutina(rutinaItems) {
    const rutinaGrid = document.getElementById('rutina-grid');
    if(!rutinaGrid) return;
    rutinaGrid.innerHTML = ''; 

    rutinaItems.forEach(item => {
        // Usamos Dia, Actividad y Detalle como encabezados sugeridos
        rutinaGrid.innerHTML += `
            <div class="info-card" style="border-left: 5px solid #f39c12;">
                <h3 style="color: #d35400;">${item.Dia || ''}</h3>
                <p><strong>${item.Actividad || ''}</strong></p>
                <p style="font-size: 0.9rem; color: #666;">${item.Detalle || ''}</p>
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
