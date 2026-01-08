// PASTE YOUR GOOGLE SHEET CSV LINK HERE
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8AfAtB-eXyuOyoQZJ48kDLOJUiE3MbaxF8XGwN5K9gQD6biT5oNFymac8vVZnBf8N9bwFTj_MBXxf/pub?gid=0&single=true&output=csv'; 

async function fetchSchoolEvents() {
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        const events = parseCSV(data);
        displayEvents(events);
        //console.log(events);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.querySelector('main').innerHTML = '<p style="text-align:center; color:red;">Error loading events. Please try again later.</p>';
    }
}

// Helper: Parse CSV text into an Array of Objects
function parseCSV(csvText) {
    const rows = csvText.split('\n');
    const headers = rows[0].split(',').map(header => header.trim());
    const events = [];

    for (let i = 1; i < rows.length; i++) {
        // Handle potential empty rows
        if (!rows[i].trim()) continue;

        // Simple split by comma (Note: This breaks if your description contains commas. 
        // Ideally, avoid commas in the sheet or use a robust CSV library)
        const values = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
        
        let event = {};
        headers.forEach((header, index) => {
            // Clean up quotes if present
            let val = values[index] ? values[index].trim() : '';
            val = val.replace(/^"|"$/g, ''); 
            event[header] = val;
        });
        events.push(event);
    }
    return events;
}

function displayEvents(events) {
    // Referencias a los contenedores
    const containers = {
        today: document.getElementById('today-events'),
        thisWeek: document.getElementById('this-week-events'),
        nextWeek: document.getElementById('next-week-events'),
        future: document.getElementById('future-events'),
        past: document.getElementById('past-events')
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- CÁLCULO DE RANGOS ---
    
    // Fin de esta semana (Próximo domingo)
    const endOfThisWeek = new Date(today);
    const daysUntilSunday = 7 - (today.getDay() === 0 ? 7 : today.getDay());
    endOfThisWeek.setDate(today.getDate() + daysUntilSunday);
    endOfThisWeek.setHours(23, 59, 59, 999);

    // Inicio y fin de la próxima semana
    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);

    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    // 1. Procesar y ordenar
    const processedEvents = events.map(event => {
        const parts = event.Date.split('-');
        return { ...event, dateObj: new Date(parts[0], parts[1] - 1, parts[2]) };
    }).sort((a, b) => a.dateObj - b.dateObj);

    let hasToday = false;

    // 2. Clasificar
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

    // 3. Pasados (Límite 3)
    const pastEvents = processedEvents
        .filter(e => e.dateObj < today)
        .sort((a, b) => b.dateObj - a.dateObj)
        .slice(0, 3);

    pastEvents.forEach(event => {
        containers.past.innerHTML += createCardHTML(event);
    });

    document.getElementById('no-today').style.display = hasToday ? 'none' : 'block';
}

// Función auxiliar para no repetir código de creación de tarjeta
function createCardHTML(event) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dateSpanish = event.dateObj.toLocaleDateString('es-ES', options);
    dateSpanish = dateSpanish.charAt(0).toUpperCase() + dateSpanish.slice(1);

    // Capturamos la hora, si no hay nada en el Excel ponemos un texto vacío
    const eventTime = event.Time ? ` | 🕒 ${event.Time}` : '';

    return `
        <div class="event-card">
            <div class="event-date">${dateSpanish}${eventTime}</div>
            <h3 class="event-title">${event.Title}</h3>
            <p class="event-desc">${event.Description}</p>
            <div class="event-meta">📍 ${event.Location} | 🏷️ ${event.Type}</div>
        </div>
    `;
}

// Run on load

document.addEventListener('DOMContentLoaded', fetchSchoolEvents);
