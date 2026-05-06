

---

# 📋 SAYHI - Assistente Scolastico Centralizzato

## Documentazione Tecnica & Quality Assurance

**Versione:** 1.0.0  
**Data:** Maggio 2026  
**Sviluppatore:** [Il tuo nome]  
**Istituto:** I.T.E.T. Blaise Pascal  

---

## 📑 INDICE

1. [Descrizione del Progetto](#1-descrizione-del-progetto)
2. [Obiettivi](#2-obiettivi)
3. [Tecnologie Utilizzate](#3-tecnologie-utilizzate)
4. [Struttura del Progetto](#4-struttura-del-progetto)
5. [Architettura del Sistema](#5-architettura-del-sistema)
6. [Flusso Utente](#6-flusso-utente)
7. [Sistema di Login](#7-sistema-di-login)
8. [Sistema Chat Multiple](#8-sistema-chat-multiple)
9. [Interazioni del Chatbot](#9-interazioni-del-chatbot)
10. [Orario Scolastico](#10-orario-scolastico)
11. [Persistenza Dati](#11-persistenza-dati)
12. [Interfaccia Utente](#12-interfaccia-utente)
13. [Responsive Design](#13-responsive-design)
14. [Sfide Tecniche Risolte](#14-sfide-tecniche-risolte)
15. [Metriche del Progetto](#15-metriche-del-progetto)
16. [Quality Assurance - Test Report](#16-quality-assurance---test-report)
17. [Miglioramenti Futuri](#17-miglioramenti-futuri)

---

## 1. DESCRIZIONE DEL PROGETTO

**SayHi** è un chatbot scolastico progettato per **mitigare il sovraccarico informativo** all'interno dell'istituto. Fornisce un unico punto di accesso centralizzato per circolari, orari, scadenze, eventi, contatti docenti, moduli da firmare, compiti e verifiche.

A differenza dei tradizionali portali scolastici, SayHi permette di ottenere informazioni specifiche con un semplice messaggio in linguaggio naturale.

---

## 2. OBIETTIVI

- ✅ Ridurre il tempo di ricerca delle informazioni scolastiche
- ✅ Centralizzare comunicazioni, orari e scadenze in un'unica interfaccia
- ✅ Supportare tutti i ruoli scolastici (Docenti, Studenti, Genitori, ATA)
- ✅ Fornire risposte immediate e contestuali in base alla classe dell'utente
- ✅ Offrire un sistema di chat multiple per organizzare le conversazioni
- ✅ Garantire accessibilità da qualsiasi dispositivo (desktop, tablet, mobile)

---

## 3. TECNOLOGIE UTILIZZATE

| Tecnologia | Versione | Utilizzo |
|------------|----------|----------|
| **HTML5** | - | Struttura semantica dell'interfaccia |
| **CSS3** | - | Stili, animazioni, variabili CSS, responsive |
| **Bootstrap 5.3** | 5.3.0 | Grid system, componenti base, utilities |
| **Bootstrap Icons** | 1.11.0 | Iconografia interfaccia |
| **JavaScript (Vanilla)** | ES6+ | Logica chatbot, gestione stato, DOM manipulation |
| **JSON** | - | Database locale strutturato |
| **localStorage API** | - | Persistenza utente, chat multiple, preferenze |
| **Google Fonts** | - | Font Inter (variabile) |

**Nessuna dipendenza backend**: l'applicazione funziona interamente lato client.

---

## 4. STRUTTURA DEL PROGETTO

```
/progetto-sayhi/
│
├── index.html          # Interfaccia utente completa (login + app)
├── app.js              # Logica applicativa (≈1000 righe)
├── data.json           # Database statico (≈600 righe)
│   ├── utente          # Profilo utente di default
│   ├── circolari       # 4 circolari di esempio
│   ├── eventi          # 6 eventi scolastici
│   ├── orario          # 10 classi × 5 giorni
│   ├── contatti        # 4 contatti docenti/segreteria
│   ├── moduli          # 2 moduli da firmare
│   ├── compiti         # 5 compiti/verifiche
│   └── risposte        # Frasi predefinite (saluti, errori)
│
└── image.svg           # Logo scuola
```

---

## 5. ARCHITETTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                          │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │ Login Screen │  │         App Container             │ │
│  │              │  │  ┌─────────┐  ┌────────────────┐ │ │
│  │  Ruoli       │  │  │ Sidebar │  │   Chat Main    │ │ │
│  │  Nome/Cogn.  │  │  │         │  │                │ │ │
│  │  Classe      │  │  │ Profilo │  │  Messaggi      │ │ │
│  │  Ricordami   │  │  │ Chat    │  │  Suggerimenti  │ │ │
│  │              │  │  │ Stats   │  │  Input Area    │ │ │
│  └──────────────┘  │  │ Emerg.  │  │                │ │ │
│                     │  └─────────┘  └────────────────┘ │ │
│                     └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                       app.js                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ LoginSystem  │  │ ChatManager  │  │  AppState     │ │
│  │              │  │              │  │               │ │
│  │ init()       │  │ chats{}      │  │ dati (JSON)   │ │
│  │ login()      │  │ chatAttiva   │  │ conversazione │ │
│  │ logout()     │  │ creaNuova()  │  │ contesto      │ │
│  │              │  │ elimina()    │  │               │ │
│  └──────────────┘  │ apri()       │  └───────────────┘ │
│                     │ salva()      │                     │
│                     └──────────────┘                     │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              elaboraMessaggio()                    │  │
│  │                                                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │  │
│  │  │Circolari │ │ Orario   │ │ Compiti  │  ...     │  │
│  │  └──────────┘ └──────────┘ └──────────┘          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    localStorage                          │
│  sayhi-current-user  │  sayhi-chats  │  sayhi-* (pref.) │
└─────────────────────────────────────────────────────────┘
```

---

## 6. FLUSSO UTENTE

```
AVVIO APPLICAZIONE
        │
        ▼
┌───────────────────┐     SÌ     ┌──────────────────────┐
│ Remember attivo?  │───────────▶│ Carica profilo e chat │
└───────────────────┘            └──────────────────────┘
        │ NO                              │
        ▼                                 ▼
┌───────────────────┐            ┌──────────────────────┐
│   LOGIN SCREEN     │            │   APP PRINCIPALE      │
│                    │            │                       │
│ 1. Scegli ruolo    │            │ ┌───────────────────┐ │
│ 2. Inserisci nome  │───────────▶│ │ Sidebar (25%)     │ │
│ 3. Inserisci cogn. │            │ │ • Profilo utente  │ │
│ 4. Scegli classe   │            │ │ • Lista chat      │ │
│ 5. Clicca ACCEDI   │            │ │ • Statistiche     │ │
│                    │            │ │ • Emergenza       │ │
└───────────────────┘            │ └───────────────────┘ │
                                  │ ┌───────────────────┐ │
                                  │ │ Chat (75%)        │ │
                                  │ │ • Messaggi        │ │
                                  │ │ • Suggerimenti    │ │
                                  │ │ • Input utente    │ │
                                  │ └───────────────────┘ │
                                  └───────────────────────┘
                                            │
                                    UTENTE SCRIVE
                                            │
                                            ▼
                                  ┌───────────────────────┐
                                  │  elaboraMessaggio()   │
                                  │  Analisi parole chiave │
                                  └───────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
              ┌──────────┐           ┌──────────┐           ┌──────────┐
              │ Circolari│           │  Orario  │           │ Altro... │
              │ (tendina)│           │(classe/g)│           │          │
              └──────────┘           └──────────┘           └──────────┘
```

---

## 7. SISTEMA DI LOGIN

### Ruoli Supportati

| Ruolo | Icona | Classe richiesta? | Note |
|-------|-------|-------------------|------|
| **Docente** | 👨‍🏫 | Obbligatoria | Accesso a tutte le funzioni |
| **Studente** | 🎓 | Obbligatoria | Orario, compiti, circolari della propria classe |
| **Genitore** | 👪 | Facoltativa | Visualizza circolari e moduli |
| **ATA** | 🏢 | Non richiesta | Orario disponibile solo specificando la classe |

### Flusso di Login

1. All'avvio, `LoginSystem.init()` controlla localStorage
2. Se esiste un utente salvato con "Ricordami" attivo → login automatico
3. Altrimenti mostra la schermata di login
4. L'utente seleziona il ruolo, inserisce nome/cognome/classe
5. Al submit, `LoginSystem.login()` salva il profilo e carica l'app

### Logout

- Disponibile dal pannello impostazioni
- Cancella: profilo utente, tutte le chat, preferenze "Ricordami"
- Riporta alla schermata di login pulita

---

## 8. SISTEMA CHAT MULTIPLE

### Gestore: `ChatManager`

| Metodo | Descrizione |
|--------|-------------|
| `init()` | Carica le chat da localStorage o crea una chat predefinita |
| `creaNuovaChat(nome)` | Crea una nuova chat con ID univoco (timestamp) |
| `eliminaChat(id)` | Elimina una chat (mantiene sempre almeno 1 chat) |
| `apriChat(id)` | Cambia la chat attiva, salva la precedente, carica la nuova |
| `salvaChats()` | Persiste tutte le chat in localStorage |

### Struttura Dati Chat

```javascript
{
  "id": "chat_1715000000000",
  "nome": "Chat Principale",
  "messaggi": [
    { "tipo": "utente", "testo": "orario", "ora": "10:30" },
    { "tipo": "bot", "testo": "📚 Orario di oggi...", "ora": "10:30" }
  ],
  "dataCreazione": "2026-05-06T10:00:00.000Z",
  "ultimoAccesso": "2026-05-06T10:35:00.000Z",
  "nonLetti": 0
}
```

### Caratteristiche

- **Persistenza**: Tutte le chat sopravvivono al refresh della pagina
- **Limite**: 1000 messaggi per chat (dopo taglia a 500)
- **Storage pieno**: Elimina automaticamente le chat più vecchie
- **Badge**: Contatore messaggi non letti sulle chat non attive

---

## 9. INTERAZIONI DEL CHATBOT

### Tabella Comandi

| # | Comando | Parole Chiave | Funzione | Risposta |
|---|---------|---------------|----------|----------|
| 1 | Circolari recenti | `circolari`, `comunicazioni`, `avvisi` | `mostraCircolariRecenti()` | Card con tendina expand |
| 2 | Ricerca | `cerca [parola]`, `trova [parola]` | `cercaPerParolaChiave()` | Card filtrate per keyword |
| 3 | Scadenze | `scadenze`, `scade`, `imminente` | `mostraScadenze()` | Lista scadenze ordinate |
| 4 | Dettaglio | `leggi [id]`, `dettaglio [id]` | `mostraDettaglioCircolare()` | Testo completo circolare |
| 5 | Download | Click su allegato | `scaricaAllegato()` | Messaggio di conferma |
| 6 | Orario | `orario`, `lezioni`, `domani`, `[classe]` | `mostraOrario()` | Orario con materie e docenti |
| 7 | Contatti | `contatti`, `docenti`, `email` | `mostraContatti()` | Lista contatti con orari ricevimento |
| 8 | Moduli | `moduli`, `firmare`, `autorizzazione` | `mostraModuliDaFirmare()` | Moduli pending |
| 9 | Eventi | `eventi`, `calendario`, `prossimi` | `mostraEventi()` | Prossimi 5 eventi |
| 10 | Emergenza | `emergenza`, `aiuto`, `urgente`, `pericolo` | `gestisciEmergenza()` | Overlay emergenza |
| 11 | Compiti | `compiti`, `verifiche`, `interrogazione` | `mostraCompiti()` | Lista per classe/materia |
| 12 | Riepilogo | `riepilogo`, `oggi`, `che si fa` | `mostraRiepilogo()` | Orario + compiti + eventi + circolari |

### Risposte Automatiche

| Input | Risposta |
|-------|----------|
| `ciao`, `salve`, `buongiorno`, `buonasera` | Saluto casuale |
| `grazie`, `thanks`, `perfetto` | "Di nulla! 😊" |
| `aiuto`, `help`, `cosa puoi fare` | Lista completa comandi |
| Altro (non riconosciuto) | Messaggio di errore con suggerimenti |

### Sistema di Parsing

Il parser utilizza `contieneParoleChiave()` per analizzare il messaggio:

```javascript
function contieneParoleChiave(testo, paroleChiave) {
    return paroleChiave.some(parola => testo.includes(parola));
}
```

Per l'orario, supporta l'estrazione di classe e giorno tramite regex e confronto con i giorni della settimana.

---

## 10. ORARIO SCOLASTICO

### Classi Gestite

**10 classi**: 1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B, 5A, 5B

### Regole Orarie

| Giorno | Numero Ore | Durata | Orario |
|--------|------------|--------|--------|
| **Lunedì** | 5 | 60 min | 08:15 - 13:30 |
| **Mercoledì** | 5 | 60 min | 08:15 - 13:30 |
| **Giovedì** | 5 | 60 min | 08:15 - 13:30 |
| **Martedì** | 6 | 50 min | 08:15 - 14:40 |
| **Venerdì** | 6 | 50 min | 08:15 - 14:40 |

### Intervallo

- Giorni da 60 min: **10:15 - 10:30**
- Giorni da 50 min: **09:55 - 10:10**

### Materie Tecniche (Triennio)

- **Sistemi e Reti**
- **Telecomunicazioni**
- **TPSIT** (Tecnologie e Progettazione di Sistemi Informatici e di Telecomunicazioni)

### Materie Tecniche (Biennio)

- **Tecnologie Informatiche**

### Esempi di Richiesta

| Input | Risultato |
|-------|-----------|
| `orario` | Orario di oggi per la classe dell'utente |
| `orario 3A` | Orario di oggi per la 3A |
| `orario 3B martedì` | Orario del martedì della 3B (6 ore da 50') |
| `domani` | Orario di domani |
| `orario 5A venerdì` | Orario del venerdì della 5A |

---

## 11. PERSISTENZA DATI

### localStorage - Chiavi

| Chiave | Tipo | Contenuto | Esempio |
|--------|------|-----------|---------|
| `sayhi-current-user` | JSON | Profilo utente loggato | `{"nome":"Mario","ruolo":"docente"...}` |
| `sayhi-remember-me` | Boolean | Flag "Ricordami" | `true` |
| `sayhi-chats` | JSON | Oggetto con tutte le chat | `{"chat_123...": {...}}` |
| `sayhi-active-chat` | String | ID ultima chat attiva | `"chat_1715000000000"` |
| `sayhi-dark-mode` | Boolean | Tema scuro/chiaro | `true` |
| `sayhi-font-size` | Number | Livello zoom (-2 a +3) | `0` |
| `sayhi-notify-circolari` | Boolean | Notifiche circolari | `true` |
| `sayhi-notify-scadenze` | Boolean | Notifiche scadenze | `true` |
| `sayhi-notify-eventi` | Boolean | Notifiche eventi | `true` |
| `sayhi-save-history` | Boolean | Salva cronologia | `true` |

### Data Flow

```
[Login] → salva profilo in localStorage
[Chat]  → ad ogni messaggio, ChatManager.salvaChats()
[Logout] → cancella sayhi-current-user, sayhi-chats, sayhi-active-chat
[Cambio chat] → salva chat corrente, carica nuova chat
```

---

## 12. INTERFACCIA UTENTE

### Componenti Principali

#### A) Login Screen
- Overlay fullscreen con sfondo gradient animato
- Selettore ruolo a 4 pulsanti con feedback visivo
- Form con validazione: nome, cognome, classe, ricordami
- Animazione slide-up all'ingresso
- Animazione fade-out all'uscita

#### B) Sidebar (25%)
- Logo scuola e nome istituto
- **Profilo utente**: avatar con iniziali, nome, ruolo, classe, data corrente
- **Lista chat**: scrollabile, con badge non letti, pulsante elimina
- **Statistiche**: circolari non lette, moduli pending, eventi oggi
- **Pulsante emergenza**: rosso, animato, con icona warning
- **Link orario classi**: pulsante esterno al sito web scolastico

#### C) Chat Main (75%)
- **Header**: avatar bot, nome "SayHi!", status online con pallino animato
- **Messaggi**: scrollabili, animazione fadeInUp, max-width 75%
- **Suggerimenti**: chip cliccabili sopra l'input
- **Input area**: textarea auto-resize, tasto invio, icona invio

#### D) Settings Panel (slide-in destro)
- **Aspetto**: toggle tema scuro, dimensione testo (A-/A/A+)
- **Notifiche**: toggle circolari, scadenze, eventi
- **Privacy**: toggle salva cronologia
- **Logout**: pulsante esci/cambia utente
- **Info**: versione, copyright

#### E) Emergency Overlay
- Modale fullscreen con sfondo blur
- Icona animata (shake)
- Textarea per descrizione emergenza
- Tre pulsanti: Chiama 112, Contatta Dirigente, Annulla
- Chiusura con Esc o click fuori

### Animazioni

| Elemento | Animazione |
|----------|------------|
| Messaggi | `fadeInUp` - opacity + translateY |
| Login screen | `slideUpLogin` |
| Emergency card | `slideUp` + `shake` icona |
| Emergency overlay | `fadeIn` |
| Settings panel | `slideInRight` |
| Status dot online | `pulse` infinito |
| Typing indicator | `typingBounce` su 3 dot sfalsati |
| Hover card | `translateY(-2px)` + glow |
| Hover button | `scale(1.05)` |

### Palette Colori

| Variabile | Valore | Utilizzo |
|-----------|--------|----------|
| `--bg-primary` | `#0a1929` | Sfondo principale |
| `--bg-secondary` | `#0f2940` | Sfondo secondario |
| `--bg-tertiary` | `#143650` | Sfondo terziario |
| `--accent-blue` | `#1a73e8` | Accento blu |
| `--accent-teal` | `#00b4d8` | Accento principale |
| `--text-primary` | `#e0e7ff` | Testo chiaro |
| `--text-secondary` | `#94a3b8` | Testo secondario |
| `--danger` | `#ef4444` | Emergenza / errori |
| `--message-user` | `#1a73e8 → #00b4d8` | Gradiente messaggi utente |
| `--message-bot` | `rgba(20,54,80,0.9)` | Sfondo messaggi bot |

---

## 13. RESPONSIVE DESIGN

### Breakpoint

| Breakpoint | Larghezza | Comportamento |
|------------|-----------|---------------|
| **Desktop** | ≥ 992px | Sidebar (3 colonne) + Chat (9 colonne) |
| **Tablet** | 768px - 991px | Sidebar nascosta, chat 100% |
| **Mobile** | < 768px | Padding ridotti, font compatti |

### Adattamenti Mobile

- Sidebar: `display: none !important`
- Messaggi: max-width 85% → 90%
- Padding: 1.5rem → 1rem
- Font: dimensione ridotta
- Chip suggerimenti: font-size 0.78rem → 0.75rem
- Pannello impostazioni: larghezza 380px → 100vw

---

## 14. SFIDE TECNICHE RISOLTE

### 1. Sistema di Chat Multiple con Persistenza

**Problema**: Gestire conversazioni multiple navigabili con salvataggio in localStorage senza perdere messaggi durante il cambio chat.

**Soluzione adottata**: Ogni chat è un oggetto con ID univoco (timestamp), contenente un array di messaggi. Il `ChatManager` centralizza le operazioni CRUD e sincronizza `AppState.conversazione` ad ogni cambio chat. La pulizia automatica previene il superamento dei limiti di localStorage.

### 2. Orario Differenziato per Giorno e Classe

**Problema**: L'orario scolastico ha due formati diversi (giorni da 5 ore da 60' e giorni da 6 ore da 50'), distribuiti su 10 classi.

**Soluzione adottata**: Il parser estrae la classe dal messaggio tramite regex (`/\b[1-5][AB]\b/i`), identifica il giorno tramite confronto con l'array `giorniSettimana`, e calcola automaticamente se oggi è un giorno scolastico. Se oggi è festivo o weekend, trova il prossimo giorno con lezioni.

### 3. Tendina Expand nelle Circolari

**Problema**: Mostrare il contenuto completo delle circolari senza appesantire la UI con testo lungo.

**Soluzione adottata**: Animazione CSS `max-height` con transizione fluida. Il contenuto completo è hidden (`max-height: 0, overflow: hidden`) e si espande al click. Il pulsante cambia testo e colore in base allo stato (aperto/chiuso).

### 4. Gestione Multi-Ruolo

**Problema**: Docenti, studenti, genitori e ATA hanno esigenze e dati diversi.

**Soluzione adottata**: Il ruolo condiziona:
- I campi del form di login (ATA non ha classe)
- Le risposte dell'orario (ATA deve specificare la classe)
- Il contesto passato alle funzioni (classe dell'utente per filtrare compiti e orari)

---

## 15. METRICHE DEL PROGETTO

| Metrica | Valore |
|---------|--------|
| **Interazioni chatbot** | 12 comandi + 3 risposte automatiche |
| **Ruoli supportati** | 4 (Docente, Studente, Genitore, ATA) |
| **Classi gestite** | 10 (1A-5A, 1B-5B) |
| **Giorni di orario** | 5 giorni × 10 classi = 50 orari giornalieri |
| **Moduli orari totali** | ~300 moduli (materia+docente+ora) |
| **Materie tecniche** | Sistemi e Reti, TPSIT, Telecomunicazioni, Tecnologie Informatiche |
| **Circolari gestite** | 4 (espandibile) |
| **Eventi in calendario** | 6 |
| **Compiti/verifiche** | 5 (filtrabili per classe) |
| **Moduli da firmare** | 2 |
| **Contatti docenti** | 4 |
| **Chat multiple** | Illimitate (storage permettendo) |
| **Componenti UI custom** | 8 (card expand, overlay, typing, badge, chip, toggle, tendina, avatar) |
| **Breakpoint responsive** | 3 (desktop ≥992, tablet ≥768, mobile <768) |
| **Persistenza localStorage** | 10 chiavi |
| **Righe di codice** | ~900 HTML + ~700 CSS + ~1000 JS + ~600 JSON |
| **Totale righe** | **~3200** |

---

## 16. QUALITY ASSURANCE - TEST REPORT

### Legenda
- ✅ Passato
- ❌ Fallito
- ⚠️ Da verificare

### Test Funzionali

| ID | Test | Input | Risultato Atteso | Esito |
|----|------|-------|------------------|-------|
| T01 | Login Docente | Mario Rossi, docente, 3B, ricordami ✓ | App caricata con profilo | ✅ |
| T02 | Login Studente | Studente, classe 3A | Classe 3A nel profilo | ✅ |
| T03 | Login Genitore | Genitore, senza classe | App caricata | ✅ |
| T04 | Login ATA | ATA, senza classe | App caricata | ✅ |
| T05 | Ricordami | Login con remember ✓, refresh | Utente ancora loggato | ✅ |
| T06 | Logout | Logout da impostazioni | Login screen, chat pulite | ✅ |
| T07 | Circolari recenti | "circolari" | Card con tendina expand | ✅ |
| T08 | Tendina expand | Click "Leggi tutto" | Testo completo, bottone → "Chiudi" | ✅ |
| T09 | Ricerca keyword | "cerca meteo" | Circolare allerta meteo | ✅ |
| T10 | Scadenze | "scadenze" | Lista scadenze | ✅ |
| T11 | Orario default | "orario" (docente 3B) | Orario oggi 3B | ✅ |
| T12 | Orario altra classe | "orario 3A" | Orario 3A | ✅ |
| T13 | Orario giorno specifico | "orario 3B martedì" | 6 ore, 50 min, con intervallo | ✅ |
| T14 | Orario domani | "domani" | Orario di domani | ✅ |
| T15 | Orario da ATA | Login ATA, "orario" | "Specifica la classe" | ✅ |
| T16 | Compiti | "compiti" | Lista compiti 3B | ✅ |
| T17 | Verifiche | "verifiche" | Solo verifiche/interrogazioni | ✅ |
| T18 | Riepilogo | "riepilogo" | Orario + compiti + eventi + circolari | ✅ |
| T19 | Contatti | "contatti" | Lista con email e ricevimento | ✅ |
| T20 | Eventi | "prossimi eventi" | Eventi ordinati per data | ✅ |
| T21 | Moduli | "moduli da firmare" | Moduli pending | ✅ |
| T22 | Emergenza (bottone) | Click "Emergenza" | Overlay aperto | ✅ |
| T23 | Emergenza (chat) | "emergenza" | Overlay aperto | ✅ |
| T24 | Nuova chat | Click "+" | Nuova chat creata e attiva | ✅ |
| T25 | Cambio chat | Click su altra chat | Messaggi caricati | ✅ |
| T26 | Elimina chat | Click cestino | Chat eliminata | ✅ |
| T27 | Saluti | "ciao" | Risposta random | ✅ |
| T28 | Ringraziamenti | "grazie" | "Di nulla! 😊" | ✅ |
| T29 | Aiuto | "help" | Lista comandi | ✅ |
| T30 | Fallback | "xyz123" | Messaggio errore | ✅ |
| T31 | Chip suggerimenti | Click chip | Prompt inviato e risposta | ✅ |
| T32 | Esc emergenza | Apri emergenza, premi Esc | Overlay chiuso | ✅ |

### Test UI/UX

| ID | Test | Risultato Atteso | Esito |
|----|------|------------------|-------|
| U01 | Animazione messaggi | Fade-in fluido | ✅ |
| U02 | Typing indicator | 3 punti animati durante attesa | ✅ |
| U03 | Scroll automatico | Scroll in fondo a ogni messaggio | ✅ |
| U04 | Auto-resize textarea | Input si espande fino a 120px | ✅ |
| U05 | Pannello impostazioni | Slide-in da destra | ✅ |
| U06 | Overlay emergenza | Sfondo blur, card centrata | ✅ |
| U07 | Hover card circolare | Elevazione + glow azzurro | ✅ |
| U08 | Hover bottoni | Traslazione + shadow | ✅ |
| U09 | Tema scuro | Attivo di default | ✅ |
| U10 | Dimensione testo A+ | Testo ingrandito | ✅ |
| U11 | Dimensione testo A- | Testo ridotto | ✅ |

### Test Responsive

| ID | Test | Viewport | Esito |
|----|------|----------|-------|
| R01 | Desktop | 1920×1080 | ✅ |
| R02 | Desktop medio | 1366×768 | ✅ |
| R03 | Tablet landscape | 1024×768 | ✅ |
| R04 | Tablet portrait | 768×1024 | ✅ |
| R05 | Mobile large | 428×926 (iPhone) | ✅ |
| R06 | Mobile small | 375×667 (iPhone SE) | ✅ |

### Test Compatibilità

| Browser | Versione | Esito |
|---------|----------|-------|
| Chrome | 130+ | ✅ |
| Firefox | 130+ | ✅ |
| Edge | 130+ | ✅ |
| Safari | 17+ | ✅ |

---

## 17. MIGLIORAMENTI FUTURI

### Backend & Database
- [ ] Sostituire `data.json` con API REST + database SQL/NoSQL
- [ ] Sistema di autenticazione reale (OAuth/JWT)
- [ ] Webhook per notifiche push in tempo reale

### Funzionalità
- [ ] Integrazione con registro elettronico reale
- [ ] Caricamento PDF circolari reali con OCR
- [ ] Sintesi automatica circolari tramite AI
- [ ] Esportazione orario in formato iCal/Google Calendar
- [ ] Sistema di ticketing per segnalazioni
- [ ] Dark mode / Light mode completo
- [ ]Internazionalizzazione (multi-lingua)

### Performance
- [ ] Lazy loading dei dati JSON
- [ ] Service Worker per caching offline (PWA)
- [ ] Compressione localStorage

### UI/UX
- [ ] Comandi vocali (Speech-to-Text)
- [ ] Sintesi vocale risposte (Text-to-Speech)
- [ ] Tasti rapida da tastiera
- [ ] Tour guidato al primo accesso

---

## 📄 Riepilogo Finale

**SayHi** è un'applicazione completa e funzionante che dimostra:

- ✅ **Competenza tecnica**: codice modulare, design pattern chiari, gestione stato
- ✅ **Attenzione all'usabilità**: interfaccia intuitiva, feedback visivi, responsive
- ✅ **Gestione casi limite**: ruoli multipli, storage pieno, cambio utente, errori
- ✅ **Documentazione professionale**: QA test, metriche, diagrammi, flusso dati
- ✅ **Visione del prodotto**: chiara roadmap di miglioramenti futuri

---

Sviluppato dal Gruppo Broly del FSL STAMPASI