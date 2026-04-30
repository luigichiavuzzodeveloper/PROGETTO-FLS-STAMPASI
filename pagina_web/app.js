       /**
 * ============================================================================
 * SayHi - Assistente Scolastico Centralizzato
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
    currentDateDisplay: document.getElementById('current-date-display')
};

// ============================================================================
// CARICAMENTO DATI JSON
// ============================================================================

async function caricaDati() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}: Impossibile caricare i dati`);
        AppState.dati = await response.json();
        inizializzaInterfaccia();
        console.log('✅ Dati JSON caricati con successo da pagina_web/data.json');
    } catch (errore) {
        console.error('❌ Errore caricamento dati:', errore);
        aggiungiMessaggioBot('⚠️ Mi dispiace, non riesco a caricare i dati. Verifica che il file data.json esista o contatta l\'amministratore.');
    }
}

// ============================================================================
// INIZIALIZZAZIONE
// ============================================================================

function inizializzaInterfaccia() {
    if (!AppState.dati) return;
    
    const dati = AppState.dati;
    const oggi = new Date().toISOString().split('T')[0];
    
    // Aggiorna nome e ruolo
    if (DOM.userName && dati.utente) {
        DOM.userName.textContent = `${dati.utente.nome} ${dati.utente.cognome}`;
    }
    if (DOM.userRole && dati.utente) {
        DOM.userRole.textContent = `${capitalize(dati.utente.ruolo)} - ${dati.utente.classe}`;
    }
    
    // Aggiorna statistiche
    if (dati.circolari) {
        const circolariNonLette = dati.circolari.filter(c => !c.letta).length;
        if (DOM.unreadCount) DOM.unreadCount.textContent = circolariNonLette;
    }
    
    if (dati.moduli) {
        const moduliInScadenza = dati.moduli.filter(m => m.stato === 'da_firmare' && m.scadenza >= oggi).length;
        if (DOM.pendingTasks) DOM.pendingTasks.textContent = moduliInScadenza;
    }
    
    if (dati.eventi) {
        const eventiOggi = dati.eventi.filter(e => e.data === oggi).length;
        if (DOM.todayEvents) DOM.todayEvents.textContent = eventiOggi;
    }
    
    // Data corrente
    if (DOM.currentDateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const oggiFormattato = new Date().toLocaleDateString('it-IT', options);
        DOM.currentDateDisplay.textContent = capitalize(oggiFormattato);
    }
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
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
                    <p class="mb-0">${escapeHTML(testo)}</p>
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
    
    // Supporto per **grassetto** e newline
    const testoFormattato = escapeHTML(testo)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    
    const messaggioHTML = `
        <div class="message message-bot">
            <div class="message-avatar" aria-hidden="true">
                <i class="bi bi-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <p class="mb-0">${testoFormattato}</p>
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
                <i class="bi bi-robot"></i>
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
    if (DOM.typingIndicator) {
        DOM.typingIndicator.hidden = false;
        scrollaInFondo();
    }
}

function nascondiTypingIndicator() {
    if (DOM.typingIndicator) {
        DOM.typingIndicator.hidden = true;
    }
}

function scrollaInFondo() {
    if (DOM.chatMessages) {
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    }
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
    
    // Simula ritardo di risposta (800-2000ms)
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
    if (!AppState.dati) {
        aggiungiMessaggioBot('⚠️ Dati non ancora caricati. Attendi un momento o ricarica la pagina.');
        return;
    }
    
    const dati = AppState.dati;
    
    // Interazione 10: Gestione emergenze
    if (contieneParoleChiave(messaggio, ['emergenza', 'aiuto', 'urgente', 'pericolo', 'critico', 'allarme'])) {
        gestisciEmergenza(messaggio);
        return;
    }
    
    // Interazione 1: Circolari recenti
    if (contieneParoleChiave(messaggio, ['circolari', 'comunicazioni', 'ultime notizie', 'recenti', 'news', 'avvisi'])) {
        mostraCircolariRecenti();
        return;
    }
    
    // Interazione 2: Ricerca per parola chiave
    if (contieneParoleChiave(messaggio, ['cerca', 'trova', 'cercami', 'ricerca'])) {
        const parole = messaggio.split(' ');
        const indiceCerca = parole.findIndex(p => ['cerca', 'cercami', 'trova', 'ricerca'].includes(p));
        if (indiceCerca >= 0 && indiceCerca < parole.length - 1) {
            const keyword = parole.slice(indiceCerca + 1).join(' ');
            cercaPerParolaChiave(keyword);
        } else {
            aggiungiMessaggioBot('Cosa vuoi cercare? Prova a scrivere "cerca [parola]" oppure "trova [argomento]".');
        }
        return;
    }
    
    // Interazione 3: Scadenze
    if (contieneParoleChiave(messaggio, ['scadenze', 'scade', 'scadenza', 'imminente', 'prossima scadenza', 'cose scade'])) {
        mostraScadenze();
        return;
    }
    
    // Interazione 6: Orario
    if (contieneParoleChiave(messaggio, ['orario', 'lezioni', 'materie', 'domani', 'lezione'])) {
        mostraOrario();
        return;
    }
    
    // Interazione 7: Contatti
    if (contieneParoleChiave(messaggio, ['contatti', 'docenti', 'professori', 'email', 'ricevimento', 'contatto'])) {
        mostraContatti();
        return;
    }
    
    // Interazione 9: Eventi / Calendario
    if (contieneParoleChiave(messaggio, ['eventi', 'calendario', 'appuntamenti', 'programma', 'prossimi', 'agenda'])) {
        mostraEventi();
        return;
    }
    
    // Interazione 8: Moduli
    if (contieneParoleChiave(messaggio, ['moduli', 'firmare', 'autorizzazione', 'compilare', 'firma', 'modulo'])) {
        mostraModuliDaFirmare();
        return;
    }
    
    // Interazione 4: Dettaglio circolare specifica (via ID o numero)
    if (contieneParoleChiave(messaggio, ['dettaglio', 'leggi', 'apri', 'mostra', 'visualizza'])) {
        const match = messaggio.match(/\d+/);
        if (match) {
            mostraDettaglioCircolare(match[0]);
        } else {
            aggiungiMessaggioBot('Di quale circolare vuoi il dettaglio? Scrivi "leggi circolare [numero]"');
        }
        return;
    }
    
    // Saluti
    if (contieneParoleChiave(messaggio, ['ciao', 'salve', 'buongiorno', 'buonasera', 'hey', 'buondi'])) {
        const saluti = dati.risposte_predefinite?.saluto || ['Ciao! Come posso aiutarti?', 'Eccomi! Dimmi pure.'];
        aggiungiMessaggioBot(saluti[Math.floor(Math.random() * saluti.length)]);
        return;
    }
    
    // Ringraziamenti
    if (contieneParoleChiave(messaggio, ['grazie', 'ti ringrazio', 'thanks', 'perfetto', 'ottimo'])) {
        aggiungiMessaggioBot('Di nulla! 😊 Sono qui per aiutarti. Se hai altre domande, chiedi pure!');
        return;
    }
    
    // Aiuto / cosa puoi fare
    if (contieneParoleChiave(messaggio, ['cosa puoi fare', 'aiuto', 'help', 'funzioni', 'capacità', 'come funzioni'])) {
        mostraAiuto();
        return;
    }
    
    // Fallback: messaggio non riconosciuto
    const errori = dati.risposte_predefinite?.errore || [
        'Non ho capito. Puoi riformulare la domanda?',
        'Scusa, non ho compreso. Prova a chiedermi diversamente.',
        'Non sono sicuro di aver capito. Puoi essere più specifico?'
    ];
    aggiungiMessaggioBot(errori[Math.floor(Math.random() * errori.length)]);
}

// ============================================================================
// FUNZIONI DI SUPPORTO PER PAROLE CHIAVE
// ============================================================================

function contieneParoleChiave(testo, paroleChiave) {
    return paroleChiave.some(parola => testo.includes(parola));
}

function formattaData(dataISO) {
    if (!dataISO) return 'N/D';
    const [anno, mese, giorno] = dataISO.split('-');
    return `${giorno}/${mese}/${anno}`;
}

// ============================================================================
// INTERAZIONE 1: MOSTRA CIRCOLARI RECENTI
// ============================================================================

function mostraCircolariRecenti() {
    const dati = AppState.dati;
    if (!dati.circolari || dati.circolari.length === 0) {
        aggiungiMessaggioBot('📋 Non ci sono circolari disponibili al momento.');
        return;
    }
    
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
        
        const allegatiHTML = (circ.allegati && circ.allegati.length > 0) ? 
            circ.allegati.map(a => 
                `<button class="card-btn" onclick="window.scaricaAllegato('${circ.id}', '${a.url}', '${a.nome}')">📎 ${a.nome}</button>`
            ).join(' ') : '';
        
        cardHTML += `
            <div class="circolare-card priority-${classePriorita}" tabindex="0">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-white-50">${iconaPriorita}</small>
                    <small class="text-white-50">${formattaData(circ.data_pubblicazione)}</small>
                </div>
                <h6 class="text-white fw-bold">${escapeHTML(circ.titolo)}</h6>
                <p class="text-white-50 small">${escapeHTML(circ.corpo.substring(0, 100))}...</p>
                <div class="d-flex gap-2 flex-wrap">
                    ${allegatiHTML}
                    <button class="card-btn" onclick="window.mostraDettaglioCircolare('${circ.id}')">📖 Leggi tutto</button>
                </div>
            </div>
        `;
    });
    
    cardHTML += `</div>`;
    aggiungiCardHTML(cardHTML);
}

// ============================================================================
// INTERAZIONE 2: RICERCA PER PAROLA CHIAVE
// ============================================================================

function cercaPerParolaChiave(keyword) {
    const dati = AppState.dati;
    if (!dati.circolari) {
        aggiungiMessaggioBot('⚠️ Database circolari non disponibile.');
        return;
    }
    
    const risultati = dati.circolari.filter(circ => 
        circ.titolo.toLowerCase().includes(keyword.toLowerCase()) ||
        circ.corpo.toLowerCase().includes(keyword.toLowerCase()) ||
        (circ.categoria && circ.categoria.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    if (risultati.length === 0) {
        aggiungiMessaggioBot(`🔍 Nessuna circolare trovata per **${keyword}**. Prova con altre parole chiave o controlla le circolari recenti.`);
        return;
    }
    
    let cardHTML = `
        <div class="message-bubble">
            <p>🔍 Ho trovato ${risultati.length} circolari per **${keyword}**:</p>
        </div>
        <div class="circolari-cards">
    `;
    
    risultati.forEach(circ => {
        const classePriorita = circ.priorita === 'urgente' ? 'urgent' : 
                               circ.priorita === 'importante' ? 'important' : 'normal';
        
        cardHTML += `
            <div class="circolare-card priority-${classePriorita}" tabindex="0">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-white-50">${escapeHTML(circ.priorita)}</small>
                    <small class="text-white-50">${formattaData(circ.data_pubblicazione)}</small>
                </div>
                <h6 class="text-white fw-bold">${escapeHTML(circ.titolo)}</h6>
                <p class="text-white-50 small">${escapeHTML(circ.corpo.substring(0, 100))}...</p>
                <button class="card-btn" onclick="window.mostraDettaglioCircolare('${circ.id}')">📖 Leggi tutto</button>
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
    
    let scadenze = [];
    
    if (dati.circolari) {
        scadenze.push(...dati.circolari
            .filter(c => c.scadenza && c.scadenza >= oggi)
            .map(c => ({
                tipo: 'circolare',
                titolo: c.titolo,
                data: c.scadenza,
                priorita: c.priorita
            }))
        );
    }
    
    if (dati.moduli) {
        scadenze.push(...dati.moduli
            .filter(m => m.scadenza && m.scadenza >= oggi && m.stato === 'da_firmare')
            .map(m => ({
                tipo: 'modulo',
                titolo: m.titolo,
                data: m.scadenza,
                priorita: 'importante'
            }))
        );
    }
    
    scadenze.sort((a, b) => a.data.localeCompare(b.data));
    
    if (scadenze.length === 0) {
        aggiungiMessaggioBot('✅ Non ci sono scadenze imminenti! Ottimo lavoro.');
        return;
    }
    
    let risposta = '⏰ **Scadenze in arrivo:**\n\n';
    scadenze.slice(0, 5).forEach((s, i) => {
        const emoji = s.priorita === 'urgente' ? '🔴' : s.priorita === 'importante' ? '🟡' : '🔵';
        risposta += `${i + 1}. ${emoji} ${s.titolo} → **${formattaData(s.data)}**\n`;
    });
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// INTERAZIONE 4: MOSTRA DETTAGLIO CIRCOLARE
// ============================================================================

function mostraDettaglioCircolare(idCircolare) {
    const dati = AppState.dati;
    if (!dati.circolari) {
        aggiungiMessaggioBot('⚠️ Database circolari non disponibile.');
        return;
    }
    
    const circ = dati.circolari.find(c => c.id === idCircolare);
    
    if (!circ) {
        aggiungiMessaggioBot(`❌ Circolare con ID "${idCircolare}" non trovata. Controlla l'ID e riprova.`);
        return;
    }
    
    // Marca come letta
    circ.letta = true;
    aggiornaStatistiche();
    
    const allegatiHTML = (circ.allegati && circ.allegati.length > 0) ? 
        `<p>📎 <strong>Allegati:</strong> ${circ.allegati.map(a => a.nome).join(', ')}</p>` : '';
    
    const html = `
        <div class="message-bubble">
            <p><strong>📄 ${escapeHTML(circ.titolo)}</strong></p>
            <p>📅 Pubblicata: ${formattaData(circ.data_pubblicazione)}</p>
            <p>🏷️ Categoria: ${escapeHTML(circ.categoria || 'N/D')}</p>
            <p>⚠️ Priorità: ${escapeHTML(circ.priorita)}</p>
            ${circ.scadenza ? `<p>⏰ Scadenza: ${formattaData(circ.scadenza)}</p>` : ''}
            <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;">
            <p>${escapeHTML(circ.corpo)}</p>
            ${allegatiHTML}
        </div>
    `;
    
    aggiungiCardHTML(html);
}

// ============================================================================
// INTERAZIONE 5: DOWNLOAD ALLEGATI
// ============================================================================

function scaricaAllegato(idCircolare, url, nomeFile) {
    aggiungiMessaggioBot(`📥 Sto preparando il download di **${nomeFile}**...`);
    
    // In produzione: window.open(url, '_blank') o fetch per il download
    setTimeout(() => {
        aggiungiMessaggioBot(`✅ File **${nomeFile}** scaricato con successo! Se il download non parte automaticamente, <a href="${url}" target="_blank" class="text-info">clicca qui</a>.`);
    }, 1000);
}

// ============================================================================
// INTERAZIONE 6: MOSTRA ORARIO (MIGLIORATA)
// ============================================================================

function mostraOrario() {
    const dati = AppState.dati;
    const classe = AppState.contesto.classe;
    const messaggioOriginale = arguments[1] || ''; // Passa il messaggio utente se disponibile
    
    if (!dati.orario || !dati.orario[classe]) {
        aggiungiMessaggioBot(`❌ Orario non disponibile per la classe ${classe}.`);
        return;
    }
    
    const orario = dati.orario[classe];
    const giorniSettimana = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const oggi = new Date();
    const giornoOggiIndex = oggi.getDay(); // 0 = domenica, 1 = lunedì, ..., 6 = sabato
    const giornoOggiNome = giorniSettimana[giornoOggiIndex - 1]; // converte a lunedì=0
    
    // Controlla se l'utente ha chiesto un giorno specifico o "domani"
    let giornoRichiesto = null;
    
    // Verifica se ha chiesto "domani"
    if (contieneParoleChiave(messaggioOriginale, ['domani'])) {
        const domani = new Date(oggi);
        domani.setDate(oggi.getDate() + 1);
        const domaniIndex = domani.getDay();
        giornoRichiesto = giorniSettimana[domaniIndex - 1];
    }
    // Verifica se ha chiesto un giorno della settimana specifico
    else {
        for (let giorno of giorniSettimana) {
            if (contieneParoleChiave(messaggioOriginale, [giorno])) {
                giornoRichiesto = giorno;
                break;
            }
        }
    }
    
    // Se non ha chiesto un giorno specifico, mostra l'orario di oggi (se è un giorno scolastico)
    if (!giornoRichiesto) {
        // Se oggi è un giorno scolastico (lunedì-sabato) e esiste l'orario
        if (giornoOggiIndex >= 1 && giornoOggiIndex <= 6 && orario[giornoOggiNome]) {
            giornoRichiesto = giornoOggiNome;
        } else {
            // Oggi non è giorno scolastico -> mostra il prossimo giorno con lezioni
            let trovato = false;
            for (let i = 1; i <= 7; i++) {
                const giornoTest = new Date(oggi);
                giornoTest.setDate(oggi.getDate() + i);
                const giornoTestIndex = giornoTest.getDay();
                const giornoTestNome = giorniSettimana[giornoTestIndex - 1];
                if (giornoTestIndex >= 1 && giornoTestIndex <= 6 && orario[giornoTestNome]) {
                    giornoRichiesto = giornoTestNome;
                    trovato = true;
                    break;
                }
            }
            if (!trovato) {
                aggiungiMessaggioBot(`📚 Non ci sono lezioni programmate per i prossimi giorni. Controlla il calendario scolastico. 🎉`);
                return;
            }
        }
    }
    
    const lezioniGiorno = orario[giornoRichiesto];
    
    if (!lezioniGiorno || lezioniGiorno.length === 0) {
        aggiungiMessaggioBot(`📚 ${capitalize(giornoRichiesto)} non ci sono lezioni! Goditi la giornata. 🎉`);
        return;
    }
    
    // Determina se è oggi, domani o altro giorno
    let prefisso = '';
    if (giornoRichiesto === giornoOggiNome && giornoOggiIndex >= 1 && giornoOggiIndex <= 6) {
        prefisso = '📚 **Orario di oggi**';
    } else if (contieneParoleChiave(messaggioOriginale, ['domani'])) {
        prefisso = `📚 **Orario di domani (${capitalize(giornoRichiesto)})**`;
    } else {
        prefisso = `📚 **Orario di ${capitalize(giornoRichiesto)}**`;
    }
    
    let risposta = `${prefisso}:\n\n`;
    lezioniGiorno.forEach(lezione => {
        risposta += `🕐 ${lezione.ora} - ${lezione.materia} (${lezione.docente})\n`;
    });
    
    // Aggiunge un suggerimento per altri giorni
    risposta += `\n💡 Puoi chiedermi: "orario di martedì" o "domani" per altri giorni.`;
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// INTERAZIONE 7: MOSTRA CONTATTI
// ============================================================================

function mostraContatti() {
    const dati = AppState.dati;
    
    if (!dati.contatti || dati.contatti.length === 0) {
        aggiungiMessaggioBot('👥 Nessun contatto disponibile al momento.');
        return;
    }
    
    let risposta = '👥 **Contatti disponibili:**\n\n';
    
    dati.contatti.forEach(c => {
        risposta += `**${escapeHTML(c.nome)}**\n`;
        if (c.materia) risposta += `📚 ${escapeHTML(c.materia)}\n`;
        risposta += `📧 ${escapeHTML(c.email)}\n`;
        if (c.ricevimento) risposta += `🕐 Ricevimento: ${escapeHTML(c.ricevimento)}\n`;
        risposta += '\n';
    });
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// INTERAZIONE 8: MOSTRA MODULI DA FIRMARE
// ============================================================================

function mostraModuliDaFirmare() {
    const dati = AppState.dati;
    
    if (!dati.moduli) {
        aggiungiMessaggioBot('⚠️ Database moduli non disponibile.');
        return;
    }
    
    const moduli = dati.moduli.filter(m => m.stato === 'da_firmare');
    
    if (moduli.length === 0) {
        aggiungiMessaggioBot('✅ Non hai moduli da firmare al momento!');
        return;
    }
    
    let risposta = '✍️ **Moduli in attesa di firma:**\n\n';
    
    moduli.forEach((m, i) => {
        risposta += `${i + 1}. **${escapeHTML(m.titolo)}**\n`;
        risposta += `   📝 ${escapeHTML(m.descrizione)}\n`;
        risposta += `   ⏰ Scadenza: ${formattaData(m.scadenza)}\n\n`;
    });
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// INTERAZIONE 9: MOSTRA EVENTI
// ============================================================================

function mostraEventi() {
    const dati = AppState.dati;
    
    if (!dati.eventi || dati.eventi.length === 0) {
        aggiungiMessaggioBot('📅 Nessun evento in programma per i prossimi giorni.');
        return;
    }
    
    const oggi = new Date().toISOString().split('T')[0];
    const eventiFuturi = dati.eventi
        .filter(e => e.data >= oggi)
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(0, 5);
    
    if (eventiFuturi.length === 0) {
        aggiungiMessaggioBot('📅 Nessun evento in programma per i prossimi giorni.');
        return;
    }
    
    let risposta = '📅 **Prossimi eventi:**\n\n';
    
    eventiFuturi.forEach(e => {
        risposta += `📌 **${escapeHTML(e.titolo)}**\n`;
        risposta += `📅 ${formattaData(e.data)} | 🕐 ${e.ora_inizio || '?'}-${e.ora_fine || '?'}\n`;
        risposta += `📍 ${escapeHTML(e.luogo || 'Da definire')}\n\n`;
    });
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// INTERAZIONE 10: GESTIONE EMERGENZE
// ============================================================================

function gestisciEmergenza(messaggio) {
    if (DOM.emergencyOverlay) {
        DOM.emergencyOverlay.hidden = false;
        if (DOM.emergencyMessageText) {
            DOM.emergencyMessageText.textContent = 'Descrivi brevemente la situazione di emergenza. Un operatore ti risponderà immediatamente.';
        }
        if (DOM.emergencyInput) {
            DOM.emergencyInput.focus();
        }
    }
}

// ============================================================================
// MOSTRA AIUTO
// ============================================================================

function mostraAiuto() {
    const risposta = `Ecco tutte le cose che posso fare per te:

📋 **Circolari** - "mostrami le circolari recenti"
🔍 **Ricerca** - "cerca [parola chiave]"
⏰ **Scadenze** - "cosa scade questa settimana?"
📄 **Dettaglio** - "leggi circolare [id]"
📎 **Allegati** - clicca sui pulsanti nelle card
📚 **Orario** - "orario di domani"
👥 **Contatti** - "contatti docenti"
✍️ **Moduli** - "moduli da firmare"
📅 **Eventi** - "prossimi eventi"
🚨 **Emergenza** - scrivi "emergenza" per aiuto immediato

Cosa posso fare per te ora?`;
    
    aggiungiMessaggioBot(risposta);
}

// ============================================================================
// UTILITY
// ============================================================================

function aggiornaStatistiche() {
    if (!AppState.dati || !AppState.dati.circolari) return;
    
    const oggi = new Date().toISOString().split('T')[0];
    const nonLette = AppState.dati.circolari.filter(c => !c.letta).length;
    
    if (DOM.unreadCount) DOM.unreadCount.textContent = nonLette;
    
    if (AppState.dati.moduli) {
        const daFirmare = AppState.dati.moduli.filter(m => m.stato === 'da_firmare' && m.scadenza >= oggi).length;
        if (DOM.pendingTasks) DOM.pendingTasks.textContent = daFirmare;
    }
    
    if (AppState.dati.eventi) {
        const eventiOggi = AppState.dati.eventi.filter(e => e.data === oggi).length;
        if (DOM.todayEvents) DOM.todayEvents.textContent = eventiOggi;
    }
}

// ============================================================================
// GESTIONE EVENTI
// ============================================================================

function inviaMessaggio() {
    if (!DOM.messageInput) return;
    
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

function inviaPrompt(testo) {
    if (DOM.messageInput) {
        DOM.messageInput.value = testo;
        inviaMessaggio();
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Invio con click
    if (DOM.sendButton) {
        DOM.sendButton.addEventListener('click', inviaMessaggio);
    }
    
    // Invio con tasto Enter (Shift+Enter per nuova linea)
    if (DOM.messageInput) {
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
    }
    
    // Gestione overlay emergenza
    if (DOM.emergencyTrigger) {
        DOM.emergencyTrigger.addEventListener('click', () => {
            if (DOM.emergencyOverlay) DOM.emergencyOverlay.hidden = false;
            if (DOM.emergencyInput) DOM.emergencyInput.focus();
        });
    }
    
    if (DOM.emergencyCancel) {
        DOM.emergencyCancel.addEventListener('click', () => {
            if (DOM.emergencyOverlay) DOM.emergencyOverlay.hidden = true;
            if (DOM.emergencyInput) DOM.emergencyInput.value = '';
        });
    }
    
    if (DOM.emergencySend) {
        DOM.emergencySend.addEventListener('click', () => {
            const messaggio = DOM.emergencyInput ? DOM.emergencyInput.value.trim() : '';
            if (messaggio) {
                aggiungiMessaggioBot(`🚨 **Richiesta di emergenza inviata!**\nUn operatore ti risponderà immediatamente.\n\nMessaggio: "${escapeHTML(messaggio)}"`);
            } else {
                aggiungiMessaggioBot('🚨 **Richiesta di emergenza inviata!**\nUn operatore ti risponderà immediatamente.');
            }
            if (DOM.emergencyOverlay) DOM.emergencyOverlay.hidden = true;
            if (DOM.emergencyInput) DOM.emergencyInput.value = '';
        });
    }
    
    // Chip suggerimenti (sia nella sidebar che nell'area sopra la textbar)
    document.querySelectorAll('.suggestion-chip, .prompt-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const prompt = this.getAttribute('data-prompt') || this.textContent.trim();
            inviaPrompt(prompt);
        });
    });
    
    // Tasto Esc per chiudere overlay emergenza
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.emergencyOverlay && !DOM.emergencyOverlay.hidden) {
            DOM.emergencyOverlay.hidden = true;
            if (DOM.emergencyInput) DOM.emergencyInput.value = '';
        }
    });
    
    // Gestione click su overlay per chiudere (cliccando fuori dalla card)
    if (DOM.emergencyOverlay) {
        DOM.emergencyOverlay.addEventListener('click', (e) => {
            if (e.target === DOM.emergencyOverlay) {
                DOM.emergencyOverlay.hidden = true;
                if (DOM.emergencyInput) DOM.emergencyInput.value = '';
            }
        });
    }
}

// ============================================================================
// ESPONI FUNZIONI GLOBALI
// ============================================================================

window.scaricaAllegato = scaricaAllegato;
window.mostraDettaglioCircolare = mostraDettaglioCircolare;
window.inviaPrompt = inviaPrompt;

// ============================================================================
// AVVIO APPLICAZIONE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SayHi avviato');
    setupEventListeners();
    caricaDati();
    
    // Focus sull'input dopo caricamento
    setTimeout(() => {
        if (DOM.messageInput) {
            DOM.messageInput.focus();
        }
    }, 500);
});

// ============================================================================
// FINE SCRIPT
// ========================================================================