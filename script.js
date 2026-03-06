// 1. URL base (sin el ID de la hoja al final para poder elegir pestañas)
const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTP-skmtlp8jQxladB-ZebiaxZ9rBQhG6dhCRFplxuZow-YZtj5llFqyoMmeL4cUuPjR2xdaT0O_Woj/pub?output=csv'; 

async function fetchData() {
    try {
        // Cargamos ambas hojas usando el parámetro &gid o el nombre si fuera API, 
        // pero con 'pub?output=csv' lo más seguro es usar el ID de la pestaña (gid).
        // Si tu pestaña "Informacion" tiene otro gid, cámbialo aquí:
        const EVENTS_URL = `${BASE_URL}&gid=2029076722`; // Tu gid actual
        const INFO_URL = `${BASE_URL}&gid=1489000987`; // Reemplaza esto

        const [resEvents, resInfo] = await Promise.all([
            fetch(EVENTS_URL),
            fetch(INFO_URL)
        ]);

        const dataEvents = await resEvents.text();
        const dataInfo = await resInfo.text();

        const events = parseCSV(dataEvents);
        const infoItems = parseCSV(dataInfo);

        displayEvents(events);
        displayGeneralInfo(infoItems);

    } catch (error) {
        console.error('Error fetching data:', error);
        document.querySelector('main').innerHTML = '<p style="text-align:center; color:red;">Error al cargar los datos. Intente más tarde.</p>';
    }
}

// Helper: Parse CSV (Tu lógica actual mejorada)
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

    // Limpiar contenedores antes de llenar
    Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cálculos de rangos
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

    // Procesar (Asegúrate que en el Excel la columna se llame "Fecha")
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

// Nueva función para mostrar Información General
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

// Al cargar, ejecutamos la petición
document.addEventListener('DOMContentLoaded', fetchData);
