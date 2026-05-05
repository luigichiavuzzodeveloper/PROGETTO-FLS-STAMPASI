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
// SISTEMA CHAT MULTIPLE - GESTIONE CONVERSAZIONI
// ============================================================================

const ChatManager = {
    chats: {},           // Oggetto con tutte le chat: { id: { nome, messaggi, dataCreazione, ... } }
    chatAttiva: null,    // ID della chat attualmente aperta
    CHIAVE_STORAGE: 'sayhi-chats',
    
    // Inizializza il sistema chat
    init() {
        this.caricaChats();
        if (Object.keys(this.chats).length === 0) {
            this.creaNuovaChat('Chat Principale');
        } else {
            // Apri l'ultima chat attiva o la prima disponibile
            const ultimaAttiva = localStorage.getItem('sayhi-active-chat');
            if (ultimaAttiva && this.chats[ultimaAttiva]) {
                this.apriChat(ultimaAttiva);
            } else {
                const primaChat = Object.keys(this.chats)[0];
                this.apriChat(primaChat);
            }
        }
        this.renderizzaListaChat();
    },
    
    // Carica tutte le chat dal localStorage
    caricaChats() {
        try {
            const salvate = localStorage.getItem(this.CHIAVE_STORAGE);
            if (salvate) {
                this.chats = JSON.parse(salvate);
            }
        } catch (e) {
            console.error('Errore caricamento chats:', e);
            this.chats = {};
        }
    },
    
    // Salva tutte le chat nel localStorage
    salvaChats() {
        try {
            localStorage.setItem(this.CHIAVE_STORAGE, JSON.stringify(this.chats));
        } catch (e) {
            console.error('Errore salvataggio chats:', e);
            // Se lo storage è pieno, prova a rimuovere le chat più vecchie
            if (e.name === 'QuotaExceededError') {
                this.pulisciChatVecchie();
                try {
                    localStorage.setItem(this.CHIAVE_STORAGE, JSON.stringify(this.chats));
                } catch (e2) {
                    console.error('Impossibile salvare anche dopo pulizia');
                }
            }
        }
    },
    
    // Crea una nuova chat
    creaNuovaChat(nome = null) {
        const id = 'chat_' + Date.now();
        const nomeChat = nome || `Chat ${Object.keys(this.chats).length + 1}`;
        
        this.chats[id] = {
            id: id,
            nome: nomeChat,
            messaggi: [],
            dataCreazione: new Date().toISOString(),
            ultimoAccesso: new Date().toISOString(),
            nonLetti: 0
        };
        
        this.salvaChats();
        this.apriChat(id);
        this.renderizzaListaChat();
        
        return id;
    },
    
    // Elimina una chat
    eliminaChat(id) {
        if (Object.keys(this.chats).length <= 1) {
            // Non eliminare l'ultima chat
            this.chats[id].messaggi = [];
            this.salvaChats();
            
            // Pulisci interfaccia
            if (DOM.chatMessages) {
                DOM.chatMessages.innerHTML = '';
            }
            AppState.conversazione = [];
            
            aggiungiMessaggioBot('🗑️ Chat ripulita! Puoi continuare a usarla.');
            return;
        }
        
        delete this.chats[id];
        this.salvaChats();
        
        // Se stiamo eliminando la chat attiva, apri un'altra chat
        if (this.chatAttiva === id) {
            const prossimaChat = Object.keys(this.chats)[0];
            if (prossimaChat) {
                this.apriChat(prossimaChat);
            }
        }
        
        this.renderizzaListaChat();
    },
    
    // Apri una chat esistente
    apriChat(id) {
        if (!this.chats[id]) return;
        
        // Salva la chat corrente prima di cambiare
        if (this.chatAttiva && this.chats[this.chatAttiva]) {
            this.chats[this.chatAttiva].messaggi = [...AppState.conversazione];
            this.salvaChats();
        }
        
        this.chatAttiva = id;
        localStorage.setItem('sayhi-active-chat', id);
        
        // Aggiorna ultimo accesso e resetta non letti
        this.chats[id].ultimoAccesso = new Date().toISOString();
        this.chats[id].nonLetti = 0;
        
        // Carica i messaggi di questa chat
        this.caricaMessaggiChat(id);
        
        // Aggiorna UI
        this.renderizzaListaChat();
        this.salvaChats();
    },
    
    // Carica i messaggi di una chat nell'interfaccia
    caricaMessaggiChat(id) {
        if (!DOM.chatMessages) return;
        
        // Pulisci l'area messaggi
        DOM.chatMessages.innerHTML = '';
        
        const chat = this.chats[id];
        if (!chat || !chat.messaggi) {
            // Mostra messaggio di benvenuto per chat vuota
            AppState.conversazione = [];
            const nomeChat = chat ? chat.nome : 'Chat';
            
            const messaggioHTML = `
                <div class="message message-bot">
                    <div class="message-avatar" aria-hidden="true">
                        <i class="bi bi-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <p class="mb-2">📝 Questa è la chat: <strong>${escapeHTML(nomeChat)}</strong></p>
                            <p class="mb-0">Cosa posso fare per te?</p>
                        </div>
                        <span class="message-time">${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            `;
            DOM.chatMessages.innerHTML = messaggioHTML;
            return;
        }
        
        // Ripristina i messaggi
        AppState.conversazione = [...chat.messaggi];
        
        chat.messaggi.forEach(msg => {
            if (msg.tipo === 'utente') {
                aggiungiMessaggioUtenteSenzaSalvare(msg.testo, msg.ora);
            } else if (msg.tipo === 'bot') {
                aggiungiMessaggioBotSenzaSalvare(msg.testo, msg.ora);
            }
        });
        
        scrollaInFondo();
    },
    
    // Aggiungi messaggio alla chat attiva
    aggiungiMessaggio(tipo, testo) {
        if (!this.chatAttiva || !this.chats[this.chatAttiva]) return;
        
        const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const messaggio = { tipo, testo, ora };
        
        this.chats[this.chatAttiva].messaggi.push(messaggio);
        AppState.conversazione.push(messaggio);
        
        // Limita a 1000 messaggi per chat
        if (this.chats[this.chatAttiva].messaggi.length > 1000) {
            this.chats[this.chatAttiva].messaggi = this.chats[this.chatAttiva].messaggi.slice(-500);
        }
        
        this.salvaChats();
        this.renderizzaListaChat();
    },
    
    // Renderizza la lista delle chat nella sidebar
    renderizzaListaChat() {
        const chatList = document.getElementById('chat-list');
        const noChatsMessage = document.getElementById('no-chats-message');
        if (!chatList) return;
        
        // Ordina le chat per ultimo accesso (più recenti prima)
        const chatsOrdinate = Object.values(this.chats)
            .sort((a, b) => new Date(b.ultimoAccesso) - new Date(a.ultimoAccesso));
        
        if (chatsOrdinate.length === 0) {
            chatList.innerHTML = '';
            if (noChatsMessage) noChatsMessage.style.display = 'block';
            return;
        }
        
        if (noChatsMessage) noChatsMessage.style.display = 'none';
        
        chatList.innerHTML = chatsOrdinate.map(chat => {
            const isActive = chat.id === this.chatAttiva;
            const ultimoMsg = chat.messaggi && chat.messaggi.length > 0 
                ? chat.messaggi[chat.messaggi.length - 1] 
                : null;
            const preview = ultimoMsg 
                ? ultimoMsg.testo.substring(0, 40) + (ultimoMsg.testo.length > 40 ? '...' : '')
                : 'Nessun messaggio';
            const oraUltimoMsg = ultimoMsg ? ultimoMsg.ora : '';
            
            return `
                <div class="chat-item ${isActive ? 'active' : ''}" 
                     data-chat-id="${chat.id}"
                     onclick="ChatManager.apriChat('${chat.id}')">
                    <div class="chat-item-title">
                        <span>💬 ${escapeHTML(chat.nome)}</span>
                        <div class="chat-item-actions">
                            <button class="chat-delete-btn" 
                                    onclick="event.stopPropagation(); ChatManager.eliminaChat('${chat.id}')"
                                    title="Elimina chat">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="chat-item-preview">${escapeHTML(preview)}</div>
                        <div class="d-flex align-items-center gap-1">
                            ${chat.nonLetti > 0 ? `<span class="chat-badge">${chat.nonLetti}</span>` : ''}
                            <span class="chat-item-time">${oraUltimoMsg}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // Rinomina una chat
    rinominaChat(id, nuovoNome) {
        if (this.chats[id]) {
            this.chats[id].nome = nuovoNome;
            this.salvaChats();
            this.renderizzaListaChat();
        }
    },
    
    // Pulisci chat vecchie in caso di storage pieno
    pulisciChatVecchie() {
        const chatsOrdinate = Object.values(this.chats)
            .sort((a, b) => new Date(a.ultimoAccesso) - new Date(b.ultimoAccesso));
        
        // Mantieni solo le 10 chat più recenti
        if (chatsOrdinate.length > 10) {
            const daEliminare = chatsOrdinate.slice(0, chatsOrdinate.length - 10);
            daEliminare.forEach(chat => {
                delete this.chats[chat.id];
            });
        }
    }
};

// ============================================================================
// FUNZIONI MODIFICATE PER SUPPORTARE CHAT MULTIPLE
// ============================================================================

// Sovrascrivi le funzioni originali
const aggiungiMessaggioUtenteOriginale = aggiungiMessaggioUtente;
aggiungiMessaggioUtente = function(testo) {
    aggiungiMessaggioUtenteOriginale(testo);
    ChatManager.aggiungiMessaggio('utente', testo);
};

const aggiungiMessaggioBotOriginale = aggiungiMessaggioBot;
aggiungiMessaggioBot = function(testo) {
    aggiungiMessaggioBotOriginale(testo);
    ChatManager.aggiungiMessaggio('bot', testo);
};

// Funzioni helper per il caricamento (già definite ma le richiamo per sicurezza)
function aggiungiMessaggioUtenteSenzaSalvare(testo, ora) {
    const oraMsg = ora || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    const messaggioHTML = `
        <div class="message message-user">
            <div class="message-content">
                <div class="message-bubble">
                    <p class="mb-0">${escapeHTML(testo)}</p>
                </div>
                <span class="message-time">${oraMsg}</span>
            </div>
        </div>
    `;
    
    DOM.chatMessages.insertAdjacentHTML('beforeend', messaggioHTML);
    scrollaInFondo();
}

function aggiungiMessaggioBotSenzaSalvare(testo, ora) {
    const oraMsg = ora || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
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
                <span class="message-time">${oraMsg}</span>
            </div>
        </div>
    `;
    
    DOM.chatMessages.insertAdjacentHTML('beforeend', messaggioHTML);
    scrollaInFondo();
}

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
    
    // ⬇️ SOSTITUISCI caricaChatSalvata() con questo ⬇️
    // Inizializza il sistema di chat multiple
    if (!ChatManager.chatAttiva) {
        ChatManager.init();
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

    setupSettingsListeners();
const newChatBtn = document.getElementById('new-chat-btn');
if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        const nome = prompt('Nome della nuova chat:', `Chat ${Object.keys(ChatManager.chats).length + 1}`);
        if (nome && nome.trim()) {
            ChatManager.creaNuovaChat(nome.trim());
            aggiungiMessaggioBot(`✅ Nuova chat "${nome.trim()}" creata! Come posso aiutarti?`);
        }
    });
}

// Dentro setupEventListeners(), aggiungi:

// Gestione form login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('login-nome').value.trim();
        const cognome = document.getElementById('login-cognome').value.trim();
        const classe = document.getElementById('login-classe').value;
        const remember = document.getElementById('remember-me').checked;
        
        // Trova il ruolo selezionato
        const ruoloAttivo = document.querySelector('.role-btn.active');
        const ruolo = ruoloAttivo ? ruoloAttivo.getAttribute('data-role') : 'docente';
        
        if (!nome || !cognome) {
            alert('Inserisci nome e cognome');
            return;
        }
        
        LoginSystem.login(nome, cognome, ruolo, classe, remember);
    });
}

// Gestione bottoni ruolo
document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const ruolo = this.getAttribute('data-role');
        const classeField = document.getElementById('classe-field');
        const passwordField = document.getElementById('password-field');
        
        // Mostra/nascondi campi in base al ruolo
        if (classeField) {
            classeField.hidden = (ruolo === 'ata');
        }
        if (passwordField) {
            passwordField.hidden = true; // Per ora sempre nascosto
        }
    });
});

// Gestione accessi rapidi
document.querySelectorAll('.quick-login-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const nome = this.getAttribute('data-nome');
        const cognome = this.getAttribute('data-cognome');
        const ruolo = this.getAttribute('data-ruolo');
        const classe = this.getAttribute('data-classe');
        
        // Compila il form
        document.getElementById('login-nome').value = nome;
        document.getElementById('login-cognome').value = cognome;
        if (classe) document.getElementById('login-classe').value = classe;
        
        // Seleziona il ruolo
        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        const ruoloBtn = document.querySelector(`.role-btn[data-role="${ruolo}"]`);
        if (ruoloBtn) ruoloBtn.classList.add('active');
        
        // Login automatico
        LoginSystem.login(nome, cognome, ruolo, classe, true);
    });
});

// Pulsante logout (aggiungilo nel pannello impostazioni)
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Sei sicuro di voler uscire?')) {
            LoginSystem.logout();
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
// SISTEMA DI LOGIN
// ============================================================================

const LoginSystem = {
    utenteCorrente: null,
    CHIAVE_UTENTE: 'sayhi-current-user',
    
    init() {
        // Controlla se c'è un utente salvato
        const salvato = localStorage.getItem(this.CHIAVE_UTENTE);
        const rememberMe = localStorage.getItem('sayhi-remember-me') === 'true';
        
        if (salvato && rememberMe) {
            try {
                this.utenteCorrente = JSON.parse(salvato);
                this.mostraApp();
                return true;
            } catch (e) {
                console.warn('Dati utente corrotti, richiesto nuovo login');
            }
        }
        
        this.mostraLogin();
        return false;
    },
    
    login(nome, cognome, ruolo, classe, remember) {
        // Crea profilo utente
        this.utenteCorrente = {
            nome: nome,
            cognome: cognome,
            ruolo: ruolo,
            classe: classe || null,
            iniziali: (nome[0] + cognome[0]).toUpperCase(),
            dataLogin: new Date().toISOString()
        };
        
        // Salva se richiesto
        if (remember) {
            localStorage.setItem(this.CHIAVE_UTENTE, JSON.stringify(this.utenteCorrente));
            localStorage.setItem('sayhi-remember-me', 'true');
        } else {
            localStorage.removeItem(this.CHIAVE_UTENTE);
            localStorage.setItem('sayhi-remember-me', 'false');
        }
        
        // Aggiorna UI e mostra app
        this.aggiornaUIUtente();
        this.mostraApp();
        
        // Messaggio di benvenuto personalizzato
        setTimeout(() => {
            const saluto = this.getSaluto();
            aggiungiMessaggioBot(`${saluto} ${nome}! 👋 Sono SayHi, il tuo assistente scolastico. Come posso aiutarti?`);
        }, 500);
    },
    
    logout() {
        this.utenteCorrente = null;
        localStorage.removeItem(this.CHIAVE_UTENTE);
        localStorage.setItem('sayhi-remember-me', 'false');
        
        // Reset app
        if (DOM.chatMessages) DOM.chatMessages.innerHTML = '';
        AppState.conversazione = [];
        
        this.mostraLogin();
    },
    
    aggiornaUIUtente() {
        if (!this.utenteCorrente) return;
        
        const u = this.utenteCorrente;
        
        // Aggiorna nome e ruolo nella sidebar
        const userNameEl = document.querySelector('.user-context h2, .user-context .h6');
        const userRoleEl = document.querySelector('.user-context span.small');
        const userAvatarEl = document.querySelector('.user-avatar');
        
        if (userNameEl) {
            userNameEl.textContent = `${u.nome} ${u.cognome}`;
        }
        if (userRoleEl) {
            const ruoloTesto = u.ruolo === 'docente' ? 'Docente' :
                              u.ruolo === 'studente' ? 'Studente' :
                              u.ruolo === 'genitore' ? 'Genitore' : 'ATA';
            userRoleEl.textContent = u.classe ? `${ruoloTesto} - ${u.classe}` : ruoloTesto;
        }
        if (userAvatarEl) {
            userAvatarEl.textContent = u.iniziali;
        }
        
        // Aggiorna contesto app
        AppState.contesto.ruolo = u.ruolo;
        AppState.contesto.classe = u.classe || '';
        AppState.contesto.nome = u.nome;
    },
    
    getSaluto() {
        const ora = new Date().getHours();
        if (ora < 12) return 'Buongiorno';
        if (ora < 18) return 'Buon pomeriggio';
        return 'Buonasera';
    },
    
    mostraLogin() {
        const loginScreen = document.getElementById('login-screen');
        const appOverlay = document.getElementById('app-overlay');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appOverlay) appOverlay.hidden = true;
    },
    
    mostraApp() {
        const loginScreen = document.getElementById('login-screen');
        const appOverlay = document.getElementById('app-overlay');
        
        if (loginScreen) {
            loginScreen.classList.add('hidden');
            setTimeout(() => {
                loginScreen.style.display = 'none';
                loginScreen.classList.remove('hidden');
            }, 300);
        }
        if (appOverlay) appOverlay.hidden = false;
    }
};

// ============================================================================
// AVVIO APPLICAZIONE
// ============================================================================

// Sostituisci il DOMContentLoaded attuale con questo:
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SayHi avviato');
    setupEventListeners();
    
    // Avvia sistema login
    const isLoggedIn = LoginSystem.init();
    
    if (isLoggedIn) {
        // Se già loggato, carica dati e chat
        caricaDati();
        setTimeout(() => {
            if (DOM.messageInput) DOM.messageInput.focus();
        }, 500);
    }
});

// Modifica la funzione di login per caricare i dati dopo il login
const loginOriginale = LoginSystem.login;
LoginSystem.login = function(nome, cognome, ruolo, classe, remember) {
    loginOriginale.call(this, nome, cognome, ruolo, classe, remember);
    // Carica i dati dopo il login
    if (!AppState.dati) {
        caricaDati();
    }
    if (!ChatManager.chatAttiva) {
        ChatManager.init();
    }
};

// ============================================================================
// GESTIONE IMPOSTAZIONI
// ============================================================================

const SettingsDOM = {
    panel: document.getElementById('settings-panel'),
    overlay: document.getElementById('settings-overlay'),
    closeBtn: document.getElementById('close-settings'),
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    fontSizeUp: document.getElementById('font-size-up'),
    fontSizeDown: document.getElementById('font-size-down'),
    fontSizeReset: document.getElementById('font-size-reset'),
    notifyCircolari: document.getElementById('notify-circolari'),
    notifyScadenze: document.getElementById('notify-scadenze'),
    notifyEventi: document.getElementById('notify-eventi'),
    saveHistory: document.getElementById('save-history'),
    clearHistory: document.getElementById('clear-history')
};

function apriImpostazioni() {
    if (SettingsDOM.panel) SettingsDOM.panel.hidden = false;
    if (SettingsDOM.overlay) SettingsDOM.overlay.hidden = false;
    document.body.style.overflow = 'hidden';
}

function chiudiImpostazioni() {
    if (SettingsDOM.panel) SettingsDOM.panel.hidden = true;
    if (SettingsDOM.overlay) SettingsDOM.overlay.hidden = true;
    document.body.style.overflow = '';
}

function setupSettingsListeners() {
    // Apertura impostazioni
    const settingsTrigger = document.querySelector('[aria-label="Impostazioni"]');
    if (settingsTrigger) {
        settingsTrigger.addEventListener('click', apriImpostazioni);
    }
    
    // Chiusura impostazioni
    if (SettingsDOM.closeBtn) {
        SettingsDOM.closeBtn.addEventListener('click', chiudiImpostazioni);
    }
    
    // Chiusura con overlay
    if (SettingsDOM.overlay) {
        SettingsDOM.overlay.addEventListener('click', chiudiImpostazioni);
    }
    
    // Chiusura con tasto Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && SettingsDOM.panel && !SettingsDOM.panel.hidden) {
            chiudiImpostazioni();
        }
    });
    
    // Toggle tema scuro (al momento è sempre scuro, ma prepariamo il toggle)
    if (SettingsDOM.darkModeToggle) {
        SettingsDOM.darkModeToggle.addEventListener('change', function() {
            const isDark = this.checked;
            if (isDark) {
                document.body.style.background = 'radial-gradient(circle at 50% 50%, #0f2940 0%, #0a1929 70%)';
                aggiungiMessaggioBot('🌙 Tema scuro attivato');
            } else {
                document.body.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
                document.body.style.color = '#1a1a1a';
                aggiungiMessaggioBot('☀️ Tema chiaro attivato (sperimentale)');
            }
            
            // Salva preferenza
            localStorage.setItem('sayhi-dark-mode', isDark);
        });
    }
    
    // Gestione dimensione testo
    let fontSizeLevel = parseInt(localStorage.getItem('sayhi-font-size') || '0');
    
    function updateFontSize() {
        const baseSize = 16; // px base
        const scale = 1 + (fontSizeLevel * 0.1); // +/- 10% per livello
        const newSize = baseSize * scale;
        document.documentElement.style.fontSize = newSize + 'px';
        localStorage.setItem('sayhi-font-size', fontSizeLevel);
    }
    
    if (SettingsDOM.fontSizeUp) {
        SettingsDOM.fontSizeUp.addEventListener('click', () => {
            if (fontSizeLevel < 3) {
                fontSizeLevel++;
                updateFontSize();
            }
        });
    }
    
    if (SettingsDOM.fontSizeDown) {
        SettingsDOM.fontSizeDown.addEventListener('click', () => {
            if (fontSizeLevel > -2) {
                fontSizeLevel--;
                updateFontSize();
            }
        });
    }
    
    if (SettingsDOM.fontSizeReset) {
        SettingsDOM.fontSizeReset.addEventListener('click', () => {
            fontSizeLevel = 0;
            updateFontSize();
        });
    }
    
    // Notifiche (salva in localStorage)
    if (SettingsDOM.notifyCircolari) {
        SettingsDOM.notifyCircolari.addEventListener('change', function() {
            localStorage.setItem('sayhi-notify-circolari', this.checked);
        });
        // Carica stato iniziale
        const saved = localStorage.getItem('sayhi-notify-circolari');
        if (saved !== null) SettingsDOM.notifyCircolari.checked = saved === 'true';
    }
    
    if (SettingsDOM.notifyScadenze) {
        SettingsDOM.notifyScadenze.addEventListener('change', function() {
            localStorage.setItem('sayhi-notify-scadenze', this.checked);
        });
        const saved = localStorage.getItem('sayhi-notify-scadenze');
        if (saved !== null) SettingsDOM.notifyScadenze.checked = saved === 'true';
    }
    
    if (SettingsDOM.notifyEventi) {
        SettingsDOM.notifyEventi.addEventListener('change', function() {
            localStorage.setItem('sayhi-notify-eventi', this.checked);
        });
        const saved = localStorage.getItem('sayhi-notify-eventi');
        if (saved !== null) SettingsDOM.notifyEventi.checked = saved === 'true';
    }
    
    // Salva cronologia
    if (SettingsDOM.saveHistory) {
        SettingsDOM.saveHistory.addEventListener('change', function() {
            localStorage.setItem('sayhi-save-history', this.checked);
            if (!this.checked) {
                aggiungiMessaggioBot('⚠️ La cronologia non verrà più salvata. I messaggi attuali saranno cancellati alla chiusura.');
            } else {
                aggiungiMessaggioBot('✅ Cronologia chat attivata');
            }
        });
        const saved = localStorage.getItem('sayhi-save-history');
        if (saved !== null) SettingsDOM.saveHistory.checked = saved === 'true';
    }
    
    // Cancella cronologia
    if (SettingsDOM.clearHistory) {
        SettingsDOM.clearHistory.addEventListener('click', () => {
            if (confirm('Sei sicuro di voler cancellare tutta la cronologia della chat?')) {
                // Mantieni solo il messaggio di benvenuto
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    const welcomeMessage = chatMessages.querySelector('.message-bot');
                    chatMessages.innerHTML = '';
                    if (welcomeMessage) {
                        chatMessages.appendChild(welcomeMessage.parentElement);
                    }
                }
                AppState.conversazione = [];
                aggiungiMessaggioBot('🗑️ Cronologia chat cancellata con successo!');
                chiudiImpostazioni();
            }
        });
    }
}

// ============================================================================

// ============================================================================
// FINE SCRIPT
// ========================================================================