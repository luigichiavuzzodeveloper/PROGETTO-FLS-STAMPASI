/**
 * ============================================================================
 * EduBot - Assistente Scolastico Centralizzato
 * Logica del Chatbot per Mitigazione Sovraccarico Informativo
 * ============================================================================
 * Gestisce 10 interazioni chiave:
 * 1. Richiesta circolari recenti
 * 2. Ricerca per parola chiave
 * 3. Verifica scadenze imminenti
 * 4. Richiesta dettaglio circolare specifica
 * 5. Download allegati
 * 6. Richiesta orario lezioni
 * 7. Richiesta contatti docenti
 * 8. Compilazione modulo digitale assistita
 * 9. Aggiunta evento al calendario
 * 10. Gestione emergenze / allerte
 * ============================================================================
 */

// ============================================================================
// STATO DELL'APPLICAZIONE
// ============================================================================

const AppState = {
    dati: null,           // Dati JSON caricati
    conversazione: [],    // Storico messaggi
    contesto: {           // Contesto corrente dell'utente
        ruolo: 'docente',
        classe: '3B',
        nome: 'Mario',
        moduloCorrente: null,  // Per compilazione moduli assistita
        stepModulo: 0
    },
    caricamento: false
};

// ============================================================================
// RIFERIMENTI DOM
// ============================================================================

const DOM = {
    chatMessages: document.getElementById('chat-messages'),
    messageInput: document.getElementById('message-input'),
    sendButton: document.getElementById('send-button'),
    typingIndicator: document.getElementById('typing-indicator'),
    notificationBadge: document.getElementById('notification-count'),
    userName: document.querySelector('.user-name'),
    userRole: document.querySelector('.user-role'),
    unreadCount: document.getElementById('unread-count'),
    pendingTasks: document.getElementById('pending-tasks'),
    todayEvents: document.getElementById('today-events'),
    emergencyOverlay: document.getElementById('emergency-overlay'),
    emergencyTrigger: document.getElementById('emergency-trigger'),
    emergencyCancel: document.getElementById('emergency-cancel'),
    emergencySend: document.getElementById('emergency-send'),
    emergencyInput: document.getElementById('emergency-input'),
    emergencyMessageText: document.getElementById('emergency-message-text'),
    currentDateDisplay: document.getElementById('current-date-display'),
    dismissEmergency: document.getElementById('dismiss-emergency'),
    emergencyDismissBtn: document.querySelector('.emergency-btn-send')
};

// ============================================================================
// CARICAMENTO DATI JSON
// ============================================================================

async function caricaDati() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Impossibile caricare i dati');
        AppState.dati = await response.json();
        inizializzaInterfaccia();
        console.log('✅ Dati JSON caricati con successo');
    } catch (errore) {
        console.error('❌ Errore caricamento dati:', errore);
        // Fallback: mostra errore nella chat
        aggiungiMessaggioBot('⚠️ Mi dispiace, non riesco a caricare i dati. Riprova più tardi o contatta l\'amministratore.');
    }
}

// ============================================================================
// INIZIALIZZAZIONE
// ============================================================================

function inizializzaInterfaccia() {
    const dati = AppState.dati;
    const oggi = new Date().toISOString().split('T')[0];
    
    // Aggiorna nome e ruolo
    if (DOM.userName) DOM.userName.textContent = dati.utente.nome + ' ' + dati.utente.cognome;
    if (DOM.userRole) DOM.userRole.textContent = dati.utente.ruolo.charAt(0).toUpperCase() + dati.utente.ruolo.slice(1) + ' - ' + dati.utente.classe;
    
    // Aggiorna statistiche
    const circolariNonLette = dati.circolari.filter(c => !c.letta).length;
    const moduliInScadenza = dati.moduli.filter(m => m.stato === 'da_firmare' && m.scadenza >= oggi).length;
    const eventiOggi = dati.eventi.filter(e => e.data === oggi).length;
    
    if (DOM.unreadCount) DOM.unreadCount.textContent = circolariNonLette;
    if (DOM.pendingTasks) DOM.pendingTasks.textContent = moduliInScadenza;
    if (DOM.todayEvents) DOM.todayEvents.textContent = eventiOggi;
    
    // Aggiorna badge notifiche
    if (DOM.notificationBadge) {
        DOM.notificationBadge.textContent = circolariNonLette;
        DOM.notificationBadge.hidden = circolariNonLette === 0;
    }
    
    // Data corrente
    if (DOM.currentDateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const oggiFormattato = new Date().toLocaleDateString('it-IT', options);
        DOM.currentDateDisplay.textContent = oggiFormattato.charAt(0).toUpperCase() + oggiFormattato.slice(1);
    }
}

// ============================================================================
// GESTIONE MESSAGGI
// ============================================================================

function aggiungiMessaggioUtente(testo) {
    const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    const messaggioHTML = `
        <div class="message message-user">
            <div class="message-content">
                <div class="message-bubble">
                    <p>${escapeHTML(testo)}</p>
                </div>
                <span class="message-time">${ora}</span>
            </div>
        </div>
    `;
    
    DOM.chatMessages.insertAdjacentHTML('beforeend', messaggioHTML);
    scrollaInFondo();
    AppState.conversazione.push({ tipo: 'utente', testo, ora });
}

function aggiungiMessaggioBot(testo) {
    const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    const messaggioHTML = `
        <div class="message message-bot">
            <div class="message-avatar" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="9" cy="10" r="1.5" fill="white"/>
                    <circle cx="15" cy="10" r="1.5" fill="white"/>
                    <path d="M9 14C9.5 15 11 16 12 16C13 16 14.5 15 15 14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>${escapeHTML(testo)}</p>
                </div>
                <span class="message-time">${ora}</span>
            </div>
        </div>
    `;
    
    DOM.chatMessages.insertAdjacentHTML('beforeend', messaggioHTML);
    scrollaInFondo();
    AppState.conversazione.push({ tipo: 'bot', testo, ora });
}

function aggiungiCardHTML(html) {
    const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    const messaggioHTML = `
        <div class="message message-bot">
            <div class="message-avatar" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="9" cy="10" r="1.5" fill="white"/>
                    <circle cx="15" cy="10" r="1.5" fill="white"/>
                    <path d="M9 14C9.5 15 11 16 12 16C13 16 14.5 15 15 14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="message-content">
                ${html}
                <span class="message-time">${ora}</span>
            </div>
        </div>
    `;
    
    DOM.chatMessages.insertAdjacentHTML('beforeend', messaggioHTML);
    scrollaInFondo();
}

function mostraTypingIndicator() {
    DOM.typingIndicator.hidden = false;
    scrollaInFondo();
}

function nascondiTypingIndicator() {
    DOM.typingIndicator.hidden = true;
}

function scrollaInFondo() {
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

function escapeHTML(testo) {
    const div = document.createElement('div');
    div.textContent = testo;
    return div.innerHTML;
}

// ============================================================================
// RISPOSTA AUTOMATICA (SIMULAZIONE BOT)
// ============================================================================

function simulaRispostaBot(messaggioUtente) {
    mostraTypingIndicator();
    
    // Simula ritardo di risposta (1-2 secondi)
    const ritardo = 800 + Math.random() * 1200;
    
    setTimeout(() => {
        nascondiTypingIndicator();
        elaboraMessaggio(messaggioUtente.toLowerCase().trim());
    }, ritardo);
}

// ============================================================================
// ELABORAZIONE MESSAGGIO - CUORE DEL CHATBOT
// ============================================================================

function elaboraMessaggio(messaggio) {
    const dati = AppState.dati;
    const oggi = new Date().toISOString().split('T')[0];
    
    // Interazione 10: Gestione emergenze
    if (contieneParoleChiave(messaggio, ['emergenza', 'aiuto', 'urgente', 'pericolo', 'critico'])) {
        gestisciEmergenza(messaggio);
        return;
    }
    
    // Interazione 1: Circolari recenti
    if (contieneParoleChiave(messaggio, ['circolari', 'comunicazioni', 'ultime notizie', 'recenti', 'news'])) {
        mostraCircolariRecenti();
        return;
    }
    
    // Interazione 2: Ricerca per parola chiave
    if (contieneParoleChiave(messaggio, ['cerca', 'trova', 'cercami']) || 
        messaggio.includes('parola') || messaggio.includes('argomento')) {
        // Estrai parola chiave dopo "cerca" o "trova"
        const parole = messaggio.split(' ');
        const indiceCerca = parole.findIndex(p => ['cerca', 'cercami', 'trova'].includes(p));
        if (indiceCerca >= 0 && indiceCerca < parole.length - 1) {
            const keyword = parole.slice(indiceCerca + 1).join(' ');
            cercaPerParolaChiave(keyword);
        } else {
            aggiungiMessaggioBot('Cosa vuoi cercare? Prova a scrivere "cerca [parola]" oppure dimmi l\'argomento che ti interessa.');
        }
        return;
    }
    
    // Interazione 3: Scadenze
    if (contieneParoleChiave(messaggio, ['scadenze', 'scade', 'scadenza', 'imminente', 'prossima scadenza', 'cosa scade'])) {
        mostraScadenze();
        return;
    }
    
    // Interazione 6: Orario
    if (contieneParoleChiave(messaggio, ['orario', 'lezioni', 'materie', 'domani'])) {
        mostraOrario();
        return;
    }
    
    // Interazione 7: Contatti
    if (contieneParoleChiave(messaggio, ['contatti', 'docenti', 'professori', 'email', 'ricevimento'])) {
        mostraContatti();
        return;
    }
    
    // Interazione 9: Eventi / Calendario
    if (contieneParoleChiave(messaggio, ['eventi', 'calendario', 'appuntamenti', 'programma', 'prossimi'])) {
        mostraEventi();
        return;
    }
    
    // Interazione 8: Moduli
    if (contieneParoleChiave(messaggio, ['moduli', 'firmare', 'autorizzazione', 'compilare'])) {
        mostraModuliDaFirmare();
        return;
    }
    
    // Interazione 4: Dettaglio circolare specifica (via numero o titolo)
    if (contieneParoleChiave(messaggio, ['dettaglio', 'leggi', 'apri', 'mostra circolare'])) {
        const match = messaggio.match(/\d+/);
        if (match) {
            mostraDettaglioCircolare(parseInt(match[0]));
            return;
        }
    }
    
    // Saluti
    if (contieneParoleChiave(messaggio, ['ciao', 'salve', 'buongiorno', 'buonasera', 'hey'])) {
        const saluti = dati.risposte_predefinite.saluto;
        aggiungiMessaggioBot(saluti[Math.floor(Math.random() * saluti.length)]);
        aggiungiSuggerimentiRapidi();
        return;
    }
    
    // Aiuto / cosa puoi fare
    if (contieneParoleChiave(messaggio, ['cosa puoi fare', 'aiuto', 'help', 'funzioni', 'capacità'])) {
        mostraAiuto();
        return;
    }
    
    // Fallback: messaggio non riconosciuto
    const errori = dati.risposte_predefinite.errore;
    aggiungiMessaggioBot(errori[Math.floor(Math.random() * errori.length)]);
    aggiungiSuggerimentiRapidi();
}

// ============================================================================
// FUNZIONI DI SUPPORTO PER PAROLE CHIAVE
// ============================================================================

function contieneParoleChiave(testo, paroleChiave) {
    return paroleChiave.some(parola => testo.includes(parola));
}

// ============================================================================
// INTERAZIONE 1: MOSTRA CIRCOLARI RECENTI
// ============================================================================

function mostraCircolariRecenti() {
    const dati = AppState.dati;
    const circolari = dati.circolari.slice(0, 3);
    
    let cardHTML = `
        <div class="message-bubble">
            <p>📋 Ecco le ultime ${circolari.length} circolari che ti riguardano:</p>
        </div>
        <div class="circolari-cards">
    `;
    
    circolari.forEach(circ => {
        const classePriorita = circ.priorita === 'urgente' ? 'urgent' : 
                               circ.priorita === 'importante' ? 'important' : 'normal';
        const iconaPriorita = circ.priorita === 'urgente' ? '🔴 Urgente' : 
                               circ.priorita === 'importante' ? '🟡 Importante' : '🔵 Ordinaria';
        
        const allegatiHTML = circ.allegati.map(a => 
            `<button class="card-btn" onclick="scaricaAllegato('${circ.id}', '${a.url}', '${a.nome}')">📎 ${a.nome}</button>`
        ).join(' ');
        
        cardHTML += `
            <div class="circolare-card priority-${classePriorita}" tabindex="0">
                <div class="card-header">
                    <span class="priority-tag ${classePriorita}">${iconaPriorita}</span>
                    <span class="card-date">${formattaData(circ.data_pubblicazione)}</span>
                </div>
                <h4 class="card-title">${circ.titolo}</h4>
                <p class="card-excerpt">${circ.corpo}</p>
                <div class="card-actions">
                    ${allegatiHTML}
                    <button class="card-btn" onclick="mostraDettaglioCircolare('${circ.id}')">📖 Leggi tutto</button>
                </div>
            </div>
        `;
    });
    
    cardHTML += `
        </div>
        <div class="message-bubble message-followup">
            <p>Vuoi vedere altre circolari o filtrarle per categoria?</p>
        </div>
    `;
    
    aggiungiCardHTML(cardHTML);
}

// ============================================================================
// INTERAZIONE 2: RICERCA PER PAROLA CHIAVE
// ============================================================================

function cercaPerParolaChiave(keyword) {
    const dati = AppState.dati;
    const risultati = dati.circolari.filter(circ => 
        circ.titolo.toLowerCase().includes(keyword.toLowerCase()) ||
        circ.corpo.toLowerCase().includes(keyword.toLowerCase()) ||
        circ.categoria.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (risultati.length === 0) {
        // Fallback: nessun risultato
        aggiungiMessaggioBot(`🔍 Nessuna circolare trovata per "${keyword}". Prova con altre parole chiave o controlla le circolari recenti.`);
        aggiungiSuggerimentiRapidi();
        return;
    }
    
    let cardHTML = `
        <div class="message-bubble">
            <p>🔍 Ho trovato ${risultati.length} circolari per "${keyword}":</p>
        </div>
        <div class="circolari-cards">
    `;
    
    risultati.forEach(circ => {
        const classePriorita = circ.priorita === 'urgente' ? 'urgent' : 
                               circ.priorita === 'importante' ? 'important' : 'normal';
        
        cardHTML += `
            <div class="circolare-card priority-${classePriorita}" tabindex="0">
                <div class="card-header">
                    <span class="priority-tag ${classePriorita}">${circ.priorita}</span>
                    <span class="card-date">${formattaData(circ.data_pubblicazione)}</span>
                </div>
                <h4 class="card-title">${circ.titolo}</h4>
                <p class="card-excerpt">${circ.corpo.substring(0, 100)}...</p>
                <div class="card-actions">
                    <button class="card-btn" onclick="mostraDettaglioCircolare('${circ.id}')">📖 Leggi tutto</button>
                </div>
            </div>
        `;
    });
    
    cardHTML += `</div>`;
    aggiungiCardHTML(cardHTML);
}

// ============================================================================
// INTERAZIONE 3: MOSTRA SCADENZE
// ============================================================================

function mostraScadenze() {
    const dati = AppState.dati;
    const oggi = new Date().toISOString().split('T')[0];
    
    const scadenze = [
        ...dati.circolari.filter(c => c.scadenza && c.scadenza >= oggi).map(c => ({
            tipo: 'circolare',
            titolo: c.titolo,
            data: c.scadenza,
            priorita: c.priorita
        })),
        ...dati.moduli.filter(m => m.scadenza && m.scadenza >= oggi).map(m => ({
            tipo: 'modulo',
            titolo: m.titolo,
            data: m.scadenza,
            priorita: 'importante'
        }))
    ].sort((a, b) => a.data.localeCompare(b.data));
    
    if (scadenze.length === 0) {
        aggiungiMessaggioBot('✅ Non ci sono scadenze imminenti! Ottimo lavoro.');
        return;
    }
    
    let risposta = '⏰ **Scadenze in arrivo:**\n\n';
    scadenze.slice(0, 5).forEach((s, i) => {
        risposta += `${i + 1}. ${s.titolo} → **${formattaData(s.data)}**\n`;
    });
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// INTERAZIONE 4: MOSTRA DETTAGLIO CIRCOLARE
// ============================================================================

function mostraDettaglioCircolare(idCircolare) {
    const dati = AppState.dati;
    const circ = dati.circolari.find(c => c.id === idCircolare);
    
    if (!circ) {
        aggiungiMessaggioBot('❌ Circolare non trovata. Controlla l\'ID e riprova.');
        return;
    }
    
    // Marca come letta
    circ.letta = true;
    aggiornaStatistiche();
    
    const allegatiHTML = circ.allegati.length > 0 ? 
        `<p>📎 <strong>Allegati:</strong> ${circ.allegati.map(a => a.nome).join(', ')}</p>` : '';
    
    const html = `
        <div class="message-bubble">
            <p><strong>📄 ${circ.titolo}</strong></p>
            <p>📅 Pubblicata: ${formattaData(circ.data_pubblicazione)}</p>
            <p>🏷️ Categoria: ${circ.categoria}</p>
            <p>⚠️ Priorità: ${circ.priorita}</p>
            ${circ.scadenza ? `<p>⏰ Scadenza: ${formattaData(circ.scadenza)}</p>` : ''}
            <hr style="margin: 10px 0; border: 0.5px solid #e2e8f0;">
            <p>${circ.corpo}</p>
            ${allegatiHTML}
        </div>
    `;
    
    aggiungiCardHTML(html);
}

// ============================================================================
// INTERAZIONE 5: DOWNLOAD ALLEGATI
// ============================================================================

function scaricaAllegato(idCircolare, url, nomeFile) {
    aggiungiMessaggioBot(`📥 Sto preparando il download di "${nomeFile}"...`);
    
    // Simula download (in produzione: window.open(url))
    setTimeout(() => {
        aggiungiMessaggioBot(`✅ File "${nomeFile}" scaricato con successo!`);
    }, 1000);
}

// ============================================================================
// INTERAZIONE 6: MOSTRA ORARIO
// ============================================================================

function mostraOrario() {
    const dati = AppState.dati;
    const orario = dati.orario['3B']; // Prende orario della classe dell'utente
    
    if (!orario) {
        aggiungiMessaggioBot('❌ Orario non disponibile per questa classe.');
        return;
    }
    
    const giorni = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const domani = new Date();
    domani.setDate(domani.getDate() + 1);
    const giornoDomani = giorni[domani.getDay() - 1];
    
    const orarioDomani = orario[giornoDomani];
    
    if (orarioDomani) {
        let risposta = `📚 **Orario di domani (${giornoDomani}):**\n\n`;
        orarioDomani.forEach(lezione => {
            risposta += `🕐 ${lezione.ora} - ${lezione.materia} (${lezione.docente})\n`;
        });
        aggiungiMessaggioBot(risposta);
    } else {
        aggiungiMessaggioBot('📚 Domani non ci sono lezioni!');
    }
}

// ============================================================================
// INTERAZIONE 7: MOSTRA CONTATTI
// ============================================================================

function mostraContatti() {
    const dati = AppState.dati;
    const contatti = dati.contatti;
    
    let risposta = '👥 **Contatti disponibili:**\n\n';
    
    contatti.forEach(c => {
        risposta += `**${c.nome}**\n`;
        if (c.materia) risposta += `📚 ${c.materia}\n`;
        risposta += `📧 ${c.email}\n`;
        if (c.ricevimento) risposta += `🕐 Ricevimento: ${c.ricevimento}\n`;
        risposta += '\n';
    });
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// INTERAZIONE 8: MOSTRA MODULI DA FIRMARE
// ============================================================================

function mostraModuliDaFirmare() {
    const dati = AppState.dati;
    const moduli = dati.moduli.filter(m => m.stato === 'da_firmare');
    
    if (moduli.length === 0) {
        aggiungiMessaggioBot('✅ Non hai moduli da firmare al momento!');
        return;
    }
    
    let risposta = '✍️ **Moduli in attesa di firma:**\n\n';
    
    moduli.forEach((m, i) => {
        risposta += `${i + 1}. **${m.titolo}**\n`;
        risposta += `   📝 ${m.descrizione}\n`;
        risposta += `   ⏰ Scadenza: ${formattaData(m.scadenza)}\n`;
        risposta += `   Scrivi "compila modulo ${i + 1}" per iniziare la compilazione assistita.\n\n`;
    });
    
    aggiungiMessaggioBot(risposta);
    
    // Avvia compilazione assistita se richiesto
    if (messaggio.includes('compila modulo')) {
        const match = messaggio.match(/\d+/);
        if (match && moduli[parseInt(match[0]) - 1]) {
            avviaCompilazioneModulo(moduli[parseInt(match[0]) - 1]);
        }
    }
}

// ============================================================================
// INTERAZIONE 9: MOSTRA EVENTI
// ============================================================================

function mostraEventi() {
    const dati = AppState.dati;
    const oggi = new Date().toISOString().split('T')[0];
    const eventiFuturi = dati.eventi.filter(e => e.data >= oggi).slice(0, 5);
    
    if (eventiFuturi.length === 0) {
        aggiungiMessaggioBot('📅 Nessun evento in programma per i prossimi giorni.');
        return;
    }
    
    let risposta = '📅 **Prossimi eventi:**\n\n';
    
    eventiFuturi.forEach(e => {
        risposta += `📌 **${e.titolo}**\n`;
        risposta += `📅 ${formattaData(e.data)} | 🕐 ${e.ora_inizio}-${e.ora_fine}\n`;
        risposta += `📍 ${e.luogo}\n`;
        risposta += `✚ Scrivi "aggiungi al calendario ${e.id}" per sincronizzare\n\n`;
    });
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// INTERAZIONE 10: GESTIONE EMERGENZE
// ============================================================================

function gestisciEmergenza(messaggio) {
    DOM.emergencyOverlay.hidden = false;
    DOM.emergencyMessageText.textContent = 'Descrivi brevemente la situazione di emergenza. Un operatore ti risponderà immediatamente.';
}

// ============================================================================
// COMPILAZIONE MODULO ASSISTITA (Parte dell'Interazione 8)
// ============================================================================

function avviaCompilazioneModulo(modulo) {
    AppState.contesto.moduloCorrente = modulo;
    AppState.contesto.stepModulo = 0;
    
    aggiungiMessaggioBot(`✍️ **Compilazione assistita: ${modulo.titolo}**\n\nTi guiderò passo dopo passo. Iniziamo!\n\n${modulo.campi[0].nome}:`);
}

// ============================================================================
// SUGGERIMENTI RAPIDI
// ============================================================================

function aggiungiSuggerimentiRapidi() {
    const html = `
        <div class="message-bubble message-followup">
            <p>Ecco cosa posso fare per te:</p>
        </div>
        <div class="message-suggestions">
            <div class="suggestion-chips">
                <button class="suggestion-chip" onclick="inviaPrompt('circolari recenti')">📋 Circolari recenti</button>
                <button class="suggestion-chip" onclick="inviaPrompt('scadenze')">⏰ Scadenze</button>
                <button class="suggestion-chip" onclick="inviaPrompt('orario')">📚 Orario</button>
                <button class="suggestion-chip" onclick="inviaPrompt('eventi')">📅 Eventi</button>
                <button class="suggestion-chip" onclick="inviaPrompt('contatti')">👥 Contatti</button>
                <button class="suggestion-chip" onclick="inviaPrompt('moduli da firmare')">✍️ Moduli</button>
            </div>
        </div>
    `;
    
    aggiungiCardHTML(html);
}

// ============================================================================
// MOSTRA AIUTO
// ============================================================================

function mostraAiuto() {
    const risposta = `Ecco tutte le cose che posso fare per te:

📋 **Circolari** - "mostrami le circolari recenti"
🔍 **Ricerca** - "cerca [parola chiave]"
⏰ **Scadenze** - "cosa scade questa settimana?"
📄 **Dettaglio** - "leggi circolare 1"
📎 **Allegati** - clicca sui pulsanti nelle card
📚 **Orario** - "orario di domani"
👥 **Contatti** - "contatti docenti"
✍️ **Moduli** - "moduli da firmare"
📅 **Eventi** - "prossimi eventi"
🚨 **Emergenza** - scrivi "emergenza" per aiuto immediato

Cosa posso fare per te ora?`;
    
    aggiungiMessaggioBot(risposta);
    aggiungiSuggerimentiRapidi();
}

// ============================================================================
// FUNZIONI UTILITY
// ============================================================================

function formattaData(dataISO) {
    const [anno, mese, giorno] = dataISO.split('-');
    return `${giorno}/${mese}/${anno}`;
}

function aggiornaStatistiche() {
    const dati = AppState.dati;
    const oggi = new Date().toISOString().split('T')[0];
    const nonLette = dati.circolari.filter(c => !c.letta).length;
    
    if (DOM.unreadCount) DOM.unreadCount.textContent = nonLette;
    if (DOM.notificationBadge) {
        DOM.notificationBadge.textContent = nonLette;
        DOM.notificationBadge.hidden = nonLette === 0;
    }
}

// ============================================================================
// GESTIONE EVENTI
// ============================================================================

// Invio messaggio
function inviaMessaggio() {
    const testo = DOM.messageInput.value.trim();
    if (!testo || AppState.caricamento) return;
    
    // Aggiungi messaggio utente
    aggiungiMessaggioUtente(testo);
    
    // Pulisci input
    DOM.messageInput.value = '';
    DOM.messageInput.style.height = 'auto';
    
    // Simula risposta bot
    simulaRispostaBot(testo);
}

// Prompt rapido (da chip cliccabili)
function inviaPrompt(testo) {
    DOM.messageInput.value = testo;
    inviaMessaggio();
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Invio con click
DOM.sendButton.addEventListener('click', inviaMessaggio);

// Invio con tasto Enter (Shift+Enter per nuova linea)
DOM.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        inviaMessaggio();
    }
});

// Auto-resize textarea
DOM.messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Gestione overlay emergenza
if (DOM.emergencyTrigger) {
    DOM.emergencyTrigger.addEventListener('click', () => {
        DOM.emergencyOverlay.hidden = false;
    });
}

if (DOM.emergencyCancel) {
    DOM.emergencyCancel.addEventListener('click', () => {
        DOM.emergencyOverlay.hidden = true;
        DOM.emergencyInput.value = '';
    });
}

if (DOM.emergencySend) {
    DOM.emergencySend.addEventListener('click', () => {
        const messaggio = DOM.emergencyInput.value.trim();
        if (messaggio) {
            aggiungiMessaggioBot(`🚨 **Richiesta di emergenza inviata!**\nUn operatore ti risponderà immediatamente.\n\nMessaggio: "${messaggio}"`);
            DOM.emergencyOverlay.hidden = true;
            DOM.emergencyInput.value = '';
        }
    });
}

// Dismiss overlay emergenza principale
if (DOM.dismissEmergency) {
    DOM.dismissEmergency.addEventListener('click', () => {
        document.getElementById('emergency-overlay')?.setAttribute('hidden', '');
    });
}

// Chip suggerimenti nella sidebar
document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        const prompt = this.getAttribute('data-prompt') || this.textContent.trim();
        DOM.messageInput.value = prompt;
        DOM.messageInput.style.height = 'auto';
        DOM.messageInput.style.height = Math.min(DOM.messageInput.scrollHeight, 120) + 'px';
        DOM.messageInput.focus();
    });
});

// Tasto Esc per chiudere overlay
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.emergencyOverlay && !DOM.emergencyOverlay.hidden) {
        DOM.emergencyOverlay.hidden = true;
    }
});

// ============================================================================
// AVVIO APPLICAZIONE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 EduBot avviato');
    caricaDati();
    
    // Focus sull'input
    DOM.messageInput.focus();
});

// Esponi funzioni globali per onclick negli HTML template
window.scaricaAllegato = scaricaAllegato;
window.mostraDettaglioCircolare = mostraDettaglioCircolare;
window.inviaPrompt = inviaPrompt;