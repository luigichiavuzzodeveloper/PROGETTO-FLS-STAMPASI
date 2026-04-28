/* ============================================================================
   EduBot 2.0 - Sistema Centralizzato di Mitigazione del Sovraccarico Informativo
   Autore: [Tuo Nome]
   Data: 2026-04-28
   Architettura: SPA - JSON driven, HTML5/CSS3/JS puro
   ============================================================================ */

/* ============================== VARIABILI GLOBALI ============================== */

let circolariData = [];        // Buffer JSON locale per le comunicazioni
let userProfile = {};          // Ruolo e preferenze utente
let language = "it";           // Localizzazione attiva
let isOnline = true;           // Stato rete per fallback
let favorites = [];            // Circolari preferite

// Elementi DOM principali
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const typingIndicator = document.getElementById("typing-indicator");
const emergencyOverlay = document.getElementById("emergency-overlay");
const emergencyInput = document.getElementById("emergency-input");

/* ============================== INIZIALIZZAZIONE ============================== */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await initializeApp();
    } catch (e) {
        showFallback("Errore durante l'inizializzazione dell'applicazione.", e);
    }
});

/* ============================== SETUP PRINCIPALE ============================== */

async function initializeApp() {
    await loadUserProfile();
    await loadCircolariData();
    registerEventHandlers();
    renderGreeting();
}

/* ============================== CARICAMENTO DATI ============================== */

// Simula caricamento da file JSON o API
async function loadCircolariData() {
    try {
        const res = await fetch("data/circolari.json");
        if (!res.ok) throw new Error("Errore nel caricamento del database JSON");
        const json = await res.json();
        validateJSONSchema(json);
        circolariData = json;
    } catch (e) {
        console.warn("Fallback locale attivato:", e);
        isOnline = false;
        circolariData = getLocalFallbackData();
    }
}

// Profilo utente locale simulato
async function loadUserProfile() {
    userProfile = {
        id: "uuid-12345",
        nome: "Mario Rossi",
        ruolo: "Docente",
        classe: "3B",
        lang: "it",
        favorites: []
    };
}

/* ============================== VALIDAZIONE JSON ============================== */

function validateJSONSchema(json) {
    json.forEach((obj) => {
        if (!obj.id_circolare || !obj.titolo || !obj.priorita) {
            throw new Error("JSON invalido: campi obbligatori mancanti");
        }
    });
}

/* ============================== EVENT HANDLERS ============================== */

function registerEventHandlers() {
    document.getElementById("send-button").addEventListener("click", sendMessage);
    messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Emergenze
    const emergencyTrigger = document.getElementById("emergency-trigger");
    const emergencyCancel = document.getElementById("emergency-cancel");
    emergencyTrigger.onclick = () => (emergencyOverlay.hidden = false);
    emergencyCancel.onclick = () => (emergencyOverlay.hidden = true);

    // Escape per emergenza
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !emergencyOverlay.hidden) {
            emergencyOverlay.hidden = true;
        }
    });
}

/* ============================== CHAT E MESSAGGI ============================== */

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    messageInput.value = "";
    simulateBotResponse(text);
}

function addMessage(text, sender, extras = null) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message message-${sender}`;
    const time = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    messageDiv.innerHTML = `
        <div class="message-avatar" aria-hidden="true">${sender === "bot" ? "🤖" : "🧑"}</div>
        <div class="message-content">
            <div class="message-bubble">${text}</div>
            <span class="message-time">${time}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Elementi extra (suggerimenti, ecc.)
    if (extras && extras.element) chatMessages.appendChild(extras.element);
}

/* ============================== RISPOSTE DEL BOT ============================== */

function simulateBotResponse(input) {
    showTyping(true);
    setTimeout(() => {
        showTyping(false);
        const response = getBotLogic(input.toLowerCase());
        addMessage(response.text, "bot", response.extra);
    }, 1000);
}

function getBotLogic(query) {
    // Pattern matching semplificato
    if (query.includes("circolari")) {
        const filtered = circolariData.slice(0, 3);
        const list = renderCircolari(filtered);
        return { 
            text: "Ecco le ultime circolari ufficiali:", 
            extra: { element: list } 
        };
    }

    if (query.includes("eventi")) {
        return { text: "📅 Prossimi eventi: Gita, Colloqui, Prove INVALSI." };
    }

    if (query.includes("scadenze")) {
        return { text: "⏰ Scadenze: Consegna moduli entro il 3 maggio, tasse entro il 10 maggio." };
    }

    if (query.includes("emergenza")) {
        emergencyOverlay.hidden = false;
        return { text: "🚨 Modalità emergenza attivata." };
    }

    return { text: "Posso aiutarti con circolari, eventi, scadenze o emergenze. Di cosa hai bisogno?" };
}

function showTyping(state) {
    typingIndicator.hidden = !state;
}

/* ============================== RENDER CIRCOLARI ============================== */

function renderCircolari(data) {
    const container = document.createElement("div");
    container.className = "circolari-cards";

    if (!data.length) {
        const fallback = createFallbackCard("Nessuna circolare trovata. Prova a cambiare i filtri.");
        container.appendChild(fallback);
        return container;
    }

    data.forEach((c) => {
        const card = document.createElement("div");
        card.className = `circolare-card priority-${c.priorita.toLowerCase()}`;
        card.innerHTML = `
            <div class="card-header">
                <span class="priority-tag ${c.priorita.toLowerCase()}">${c.priorita}</span>
                <span class="card-date">${c.data}</span>
            </div>
            <h4 class="card-title">${c.titolo}</h4>
            <p class="card-excerpt">${c.corpo_testo.substring(0, 120)}...</p>
            <div class="card-actions">
                <button class="card-btn">📄 Leggi</button>
                <button class="card-btn">⭐ Preferiti</button>
            </div>
        `;
        card.querySelectorAll(".card-btn")[1].onclick = () => toggleFavorite(c.id_circolare);
        card.querySelectorAll(".card-btn")[0].onclick = () => markAsRead(c.id_circolare);
        container.appendChild(card);
    });

    return container;
}

/* ============================== LETTURA E FAVORITI ============================== */

function markAsRead(id) {
    const c = circolariData.find((x) => x.id_circolare === id);
    if (c) c.readStatus = true;
    addMessage("✅ Circolare segnata come letta.", "bot");
}

function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter((f) => f !== id);
    } else {
        favorites.push(id);
    }
    addMessage("⭐ Preferenze aggiornate.", "bot");
}

/* ============================== FALLBACK SYSTEM ============================== */

function showFallback(message, error = null) {
    console.error(error);
    const div = document.createElement("div");
    div.className = "message message-bot";
    div.innerHTML = `
        <div class="message-bubble" style="background:#fee2e2;color:#b91c1c">
            ⚠️ ${message}<br><small>Modalità offline attiva.</small>
        </div>
    `;
    chatMessages.appendChild(div);
}

/* ============================== FALL-FORWARD SUGGESTIONS ============================== */

function createFallbackCard(msg) {
    const card = document.createElement("div");
    card.className = "circolare-card";
    card.innerHTML = `
        <h4 class="card-title">🕵️ Nessun risultato</h4>
        <p class="card-excerpt">${msg}</p>
        <div class="card-actions">
            <button class="card-btn" data-prompt="Circolari popolari">Circolari popolari</button>
        </div>
    `;
    return card;
}

/* ============================== ACCESSIBILITÀ E UX ============================== */

function renderGreeting() {
    addMessage(
        "Ciao Mario 👋, sono SayHi — il tuo assistente scolastico integrato. Puoi chiedermi circolari, eventi o scadenze.",
        "bot"
    );
}

function getLocalFallbackData() {
    return [
        {
            id_circolare: "001",
            titolo: "Circolare di test - Modalità offline",
            corpo_testo: "Questo è un messaggio di esempio caricato in fallback.",
            priorita: "Normal",
            data: "2026-04-27",
            readStatus: false
        }
    ];
}

/* ============================== ACCESSIBILITÀ RAPIDA DA TASTIERA ============================== */

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        messageInput.focus();
    }
});