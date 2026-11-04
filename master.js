
"use strict";

// ============================================
// CONFIGURAZIONE API
// ============================================

const API_BASE_URL = "https://classe5id.altervista.org/games/";
const API_USERNAME = "4IB";
const API_PASSWORD = "CRIPPA";

// ============================================
// CLASSE API
// ============================================

class Api {
    constructor(username, password, baseURL) {
        this.username = username;
        this.password = password;
        this.baseURL = baseURL.endsWith("/") ? baseURL : baseURL + "/";
    }

    async richiesta(endpoint, metodo = "GET") {
        const headers = new Headers();

        headers.set(
            "Authorization",
            "Basic " + btoa(this.username + ":" + this.password)
        );

        const response = await fetch(this.baseURL + endpoint, {
            method: metodo,
            headers
        });

        const testo = await response.text();

        if (!response.ok) {
            throw new Error(
                "HTTP " + response.status + ": " +
                (testo || response.statusText)
            );
        }

        if (!testo) return null;

        try {
            return JSON.parse(testo);
        } catch {
            return testo;
        }
    }

    async creaPartita(nome) {
        const risultato = await this.richiesta(
            "partita/" + encodeURIComponent(nome),
            "POST"
        );

        const id = risultato?.id ??
            risultato?.data?.id ??
            risultato?.gameId ??
            risultato?.data?.gameId;

        if (id == null) {
            throw new Error("Il server non ha restituito un ID valido.");
        }

        return String(id);
    }

    async entraPartita(id, nome) {
        return this.richiesta(
            "join/" +
            encodeURIComponent(id) + "/" +
            encodeURIComponent(nome),
            "POST"
        );
    }

    async inserisciMossa(id, nome, mossa) {
        return this.richiesta(
            "mossa/" +
            encodeURIComponent(id) + "/" +
            encodeURIComponent(nome) + "/" +
            encodeURIComponent(mossa),
            "POST"
        );
    }

    async leggiMosse(id) {
        return this.richiesta(
            "mosse/" + encodeURIComponent(id),
            "GET"
        );
    }
}

const api = new Api(API_USERNAME, API_PASSWORD, API_BASE_URL);

const $ = id => document.getElementById(id);

// ============================================
// ELEMENTI HTML
// ============================================

const schermataIniziale = $("schermataIniziale");
const schermataGioco = $("schermataGioco");

const inputNome = $("nomeGiocatore");
const inputIdPartita = $("idPartitaInput");

const pulsanteNuova = $("nuovaPartita");
const pulsanteEntra = $("entraPartita");
const pulsanteCopia = $("copiaId");
const pulsanteCancella = $("cancella");
const pulsanteConferma = $("conferma");
const pulsanteTorna = $("tornaInizio");

const messaggio = $("messaggio");
const messaggioGioco = $("messaggioGioco");

const nomeVisualizzato = $("nomeVisualizzato");
const idPartitaVisualizzato = $("idPartitaVisualizzato");
const statoAccesso = $("statoAccesso");

const tentativoElement = $("tentativo");
const tempoElement = $("tempo");
const recordElement = $("record");
const statoCodice = $("statoCodice");

const righe = Array.from(
    document.querySelectorAll("#tabellonePersonale .attempt")
);

const pioliSegreti = Array.from(
    document.querySelectorAll(".secret-slot")
);

const righeAvversario = Array.from(
    document.querySelectorAll("#tabelloneAvversario .attempt")
);

const pulsantiColori = Array.from(
    document.querySelectorAll(".color")
);

const colori = [
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "orange",
    "pink",
    "cyan"
];

// ============================================
// STATO DEL GIOCO
// ============================================

let partitaId = null;
let nomeGiocatore = "";

let codiceSegreto = [];
let tentativo = [];

let tentativoCorrente = 0;
let secondi = 0;

let timer = null;
let polling = null;

let partitaAttiva = false;
let partitaTerminata = false;

let richiestaInCorso = false;
let aggiornamentoInCorso = false;

let tutteLeMosse = [];

// ============================================
// MESSAGGI
// ============================================

function mostraMessaggio(testo) {
    messaggio.textContent = testo;
}

function mostraMessaggioGioco(testo) {
    messaggioGioco.textContent = testo;
}

// ============================================
// NOME GIOCATORE
// ============================================

function leggiNomeGiocatore() {
    const nome = inputNome.value.trim();

    if (!nome) {
        mostraMessaggio("Inserisci il tuo nome.");
        inputNome.focus();
        return null;
    }

    nomeGiocatore = nome;

    return nome;
}

// ============================================
// GENERAZIONE CODICE SEGRETO
// ============================================

// Entrambi i giocatori ottengono lo stesso codice
// perché viene generato usando l'ID della partita.

function generaCodiceSegreto(id) {
    let seme = 0;

    const testo = String(id);

    for (let i = 0; i < testo.length; i++) {
        seme = (
            (seme << 5) - seme + testo.charCodeAt(i)
        ) >>> 0;
    }

    if (seme === 0) {
        seme = 123456789;
    }

    function numeroCasuale() {
        seme ^= seme << 13;
        seme ^= seme >>> 17;
        seme ^= seme << 5;

        return (seme >>> 0) / 4294967296;
    }

    return Array.from(
        { length: 4 },
        () => colori[
            Math.floor(numeroCasuale() * colori.length)
        ]
    );
}

// ============================================
// LETTURA MOSSE DAL SERVER
// ============================================

function normalizzaMossa(mossa) {
    if (Array.isArray(mossa)) {
        return mossa;
    }

    return String(mossa || "").split("-");
}

function estraiMosse(risposta) {
    const mosse = risposta?.data?.moves ??
        risposta?.moves ??
        risposta?.data ??
        [];

    if (!Array.isArray(mosse)) {
        return [];
    }

    return mosse.map((mossa, indice) => ({
        id: Number(mossa.ID ?? mossa.id ?? indice + 1),

        nome: String(
            mossa.PLAYER ?? mossa.player ?? ""
        ),

        colori: normalizzaMossa(
            mossa.MOSSA ?? mossa.mossa
        )
    })).filter(mossa =>
        mossa.nome && mossa.colori.length === 4
    );
}

function ordinaMosse(mosse) {
    return [...mosse].sort(
        (a, b) => a.id - b.id
    );
}

// ============================================
// TIMER
// ============================================

function aggiornaTempo() {
    const minuti = Math.floor(secondi / 60);
    const resto = secondi % 60;

    tempoElement.textContent =
        String(minuti).padStart(2, "0") + ":" +
        String(resto).padStart(2, "0");
}

function avviaTimer() {
    fermaTimer();

    secondi = 0;
    aggiornaTempo();

    timer = setInterval(() => {
        secondi++;
        aggiornaTempo();
    }, 1000);
}

function fermaTimer() {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
}

// ============================================
// RECORD
// ============================================

function caricaRecord() {
    try {
        const record = localStorage.getItem(
            "mastermind_record"
        );

        recordElement.textContent =
            record !== null ? record + "/10" : "—";

    } catch {
        recordElement.textContent = "—";
    }
}

function salvaRecord(numero) {
    try {
        const precedente = localStorage.getItem(
            "mastermind_record"
        );

        if (
            precedente === null ||
            numero < Number(precedente)
        ) {
            localStorage.setItem(
                "mastermind_record",
                String(numero)
            );
        }

        caricaRecord();

    } catch (errore) {
        console.warn(
            "Errore nel salvataggio del record:",
            errore
        );
    }
}

// ============================================
// CONTROLLO TENTATIVO
// ============================================

function controllaTentativo(proposta, segreto) {
    let corretti = 0;
    let presenti = 0;

    const segretoRimanente = [];
    const propostaRimanente = [];

    for (let i = 0; i < 4; i++) {
        if (proposta[i] === segreto[i]) {
            corretti++;
        } else {
            segretoRimanente.push(segreto[i]);
            propostaRimanente.push(proposta[i]);
        }
    }

    for (const colore of propostaRimanente) {
        const posizione = segretoRimanente.indexOf(colore);

        if (posizione !== -1) {
            presenti++;

            segretoRimanente.splice(posizione, 1);
        }
    }

    return {
        corretti,
        presenti
    };
}

// ============================================
// MOSTRA INDIZI
// ============================================

function mostraIndizi(riga, risultato) {
    const indizi = riga.querySelectorAll(".feedback i");

    indizi.forEach(indizio => {
        indizio.className = "";
    });

    let indice = 0;

    for (let i = 0; i < risultato.corretti; i++) {
        indizi[indice].classList.add("correct");
        indice++;
    }

    for (let i = 0; i < risultato.presenti; i++) {
        indizi[indice].classList.add("misplaced");
        indice++;
    }
}

// ============================================
// DISEGNO DEI TABELLONI
// ============================================

function pulisciTabellone(righeTabellone) {
    righeTabellone.forEach((riga, indice) => {
        riga.classList.remove("active", "done");

        riga.querySelectorAll(".peg").forEach(peg => {
            peg.className = "peg";
            peg.disabled = true;

            delete peg.dataset.colore;
        });

        riga.querySelectorAll(".feedback i").forEach(indizio => {
            indizio.className = "";
        });

        riga.querySelector(".number").textContent =
            String(indice + 1).padStart(2, "0");
    });
}

function disegnaMosse(righeTabellone, mosse) {
    pulisciTabellone(righeTabellone);

    mosse.slice(0, 10).forEach((mossa, indice) => {
        const riga = righeTabellone[indice];

        if (!riga) return;

        const pioli = riga.querySelectorAll(".peg");

        mossa.colori.forEach((colore, posizione) => {
            if (
                colori.includes(colore) &&
                pioli[posizione]
            ) {
                pioli[posizione].className =
                    "peg " + colore;

                pioli[posizione].disabled = true;
            }
        });

        const risultato = controllaTentativo(
            mossa.colori,
            codiceSegreto
        );

        mostraIndizi(riga, risultato);

        riga.classList.add("done");
    });
}

function aggiornaTabelloni(mosse) {
    const mossePersonali = mosse.filter(
        mossa => mossa.nome === nomeGiocatore
    );

    const mosseAvversario = mosse.filter(
        mossa => mossa.nome !== nomeGiocatore
    );

    // Disegna il tabellone personale
    disegnaMosse(righe, mossePersonali);

    // Disegna il tabellone dell'avversario
    disegnaMosse(righeAvversario, mosseAvversario);

    // Aggiorna il numero dei tentativi personali
    tentativoCorrente = mossePersonali.length;

    tentativoElement.textContent =
        String(
            Math.min(tentativoCorrente + 1, 10)
        ).padStart(2, "0") + " / 10";

    // Attiva la prossima riga personale
    const prossimaRiga = righe[tentativoCorrente];

    if (prossimaRiga && partitaAttiva) {
        prossimaRiga.classList.add("active");
        prossimaRiga.querySelectorAll(".peg").forEach(peg => {
            peg.disabled = false;
        });
    }

    // Aggiorna lo stato dell'avversario
    const statoAvversario = $("statoAvversario");

    const nomeAvversario = mosseAvversario[0]?.nome;

    if (nomeAvversario) {
        statoAvversario.textContent =
            nomeAvversario + ": " +
            mosseAvversario.length + "/10 tentativi";
    } else {
        statoAvversario.textContent =
            "In attesa delle mosse dell'avversario...";
    }
}

// ============================================
// BLOCCO INTERFACCIA
// ============================================

function bloccaInterfaccia(bloccata) {
    pulsanteConferma.disabled = bloccata;
    pulsanteCancella.disabled = bloccata;

    pulsantiColori.forEach(pulsante => {
        pulsante.disabled = bloccata;
    });

    document.querySelectorAll(
        "#tabellonePersonale .attempt .peg"
    ).forEach(peg => {
        peg.disabled = bloccata;
    });
}

// ============================================
// MOSTRA CODICE SEGRETO
// ============================================

function mostraSoluzione() {
    pioliSegreti.forEach((slot, indice) => {
        slot.className =
            "secret-slot " + codiceSegreto[indice];
    });
}

// ============================================
// FINE PARTITA
// ============================================

function terminaPartita(vincitore, numeroTentativi) {
    if (partitaTerminata) return;

    partitaTerminata = true;
    partitaAttiva = false;

    fermaTimer();
    bloccaInterfaccia(true);
    mostraSoluzione();

    if (vincitore) {
        statoCodice.textContent = "Partita terminata";

        if (vincitore === nomeGiocatore) {
            statoCodice.textContent = "Hai vinto!";

            mostraMessaggioGioco(
                "HAI VINTO! Hai indovinato in " +
                numeroTentativi + " tentativi."
            );

            salvaRecord(numeroTentativi);

        } else {
            mostraMessaggioGioco(
                vincitore + " ha vinto in " +
                numeroTentativi + " tentativi."
            );
        }

    } else {
        statoCodice.textContent = "Partita terminata";

        mostraMessaggioGioco(
            "Nessuno ha indovinato il codice entro " +
            "10 tentativi. La combinazione era: " +
            codiceSegreto.join(" - ")
        );
    }
}

// ============================================
// VERIFICA VINCITORE
// ============================================

function verificaEsitoPartita(mosse) {
    const ordinate = ordinaMosse(mosse);

    // Cerca la prima mossa vincente
    const mossaVincente = ordinate.find(mossa => {
        const risultato = controllaTentativo(
            mossa.colori,
            codiceSegreto
        );

        return risultato.corretti === 4;
    });

    if (mossaVincente) {
        const mosseDelVincitore = ordinate.filter(
            mossa => mossa.nome === mossaVincente.nome
        );

        const numeroTentativi =
            mosseDelVincitore.findIndex(
                mossa => mossa.id === mossaVincente.id
            ) + 1;

        terminaPartita(
            mossaVincente.nome,
            numeroTentativi
        );

        return;
    }

    // Conta i tentativi di ogni giocatore
    const conteggi = {};

    ordinate.forEach(mossa => {
        conteggi[mossa.nome] =
            (conteggi[mossa.nome] || 0) + 1;
    });

    const giocatori = Object.keys(conteggi);

    // Se entrambi hanno esaurito i tentativi
    if (
        giocatori.length >= 2 &&
        giocatori.every(nome => conteggi[nome] >= 10)
    ) {
        terminaPartita(null, 0);
        return;
    }

    // Se il giocatore locale ha esaurito i tentativi
    if ((conteggi[nomeGiocatore] || 0) >= 10) {
        partitaAttiva = false;
        bloccaInterfaccia(true);

        fermaTimer();

        mostraMessaggioGioco(
            "Hai esaurito i 10 tentativi. " +
            "Attendi che l'avversario finisca."
        );
    }
}

// ============================================
// AGGIORNAMENTO PARTITA DAL SERVER
// ============================================

async function aggiornaPartita() {
    if (
        !partitaId ||
        aggiornamentoInCorso ||
        partitaTerminata
    ) {
        return;
    }

    aggiornamentoInCorso = true;

    try {
        const risposta = await api.leggiMosse(partitaId);

        tutteLeMosse = ordinaMosse(
            estraiMosse(risposta)
        );

        aggiornaTabelloni(tutteLeMosse);

        verificaEsitoPartita(tutteLeMosse);

    } catch (errore) {
        console.error(
            "Errore aggiornamento partita:",
            errore
        );

        if (partitaAttiva) {
            mostraMessaggioGioco(
                "Problema di connessione: riprovo automaticamente..."
            );
        }

    } finally {
        aggiornamentoInCorso = false;
    }
}

function avviaAggiornamenti() {
    fermaAggiornamenti();

    aggiornaPartita();

    polling = setInterval(
        aggiornaPartita,
        1500
    );
}

function fermaAggiornamenti() {
    if (polling !== null) {
        clearInterval(polling);
        polling = null;
    }
}

// ============================================
// APERTURA PARTITA
// ============================================

function apriSchermataGioco(id) {
    partitaId = String(id);

    schermataIniziale.hidden = true;
    schermataGioco.hidden = false;

    nomeVisualizzato.textContent = nomeGiocatore;
    idPartitaVisualizzato.textContent = partitaId;

    codiceSegreto = generaCodiceSegreto(partitaId);

    tentativo = [];
    tentativoCorrente = 0;

    partitaTerminata = false;
    partitaAttiva = true;

    righe.forEach(riga => {
        riga.querySelectorAll(".peg").forEach(peg => {
            peg.disabled = false;
        });
    });

    if (righe[0]) {
        righe[0].classList.add("active");
    }

    statoCodice.textContent =
        "Indovina la combinazione";

    caricaRecord();
    avviaTimer();

    bloccaInterfaccia(false);

    statoAccesso.textContent =
        "Connesso. Condividi l'ID con il secondo giocatore.";

    mostraMessaggioGioco(
        "Partita pronta! Scegli quattro colori."
    );

    avviaAggiornamenti();
}

// ============================================
// CREAZIONE PARTITA
// ============================================

pulsanteNuova.addEventListener("click", async () => {
    if (richiestaInCorso) return;

    const nome = leggiNomeGiocatore();

    if (!nome) return;

    try {
        richiestaInCorso = true;
        pulsanteNuova.disabled = true;

        mostraMessaggio(
            "Creazione partita in corso..."
        );

        const id = await api.creaPartita(nome);

        apriSchermataGioco(id);

    } catch (errore) {
        console.error(errore);

        mostraMessaggio(
            "Errore durante la creazione: " +
            errore.message
        );

    } finally {
        richiestaInCorso = false;
        pulsanteNuova.disabled = false;
    }
});

// ============================================
// ENTRARE IN UNA PARTITA
// ============================================

pulsanteEntra.addEventListener("click", async () => {
    if (richiestaInCorso) return;

    const nome = leggiNomeGiocatore();

    if (!nome) return;

    const id = inputIdPartita.value.trim();

    if (!id) {
        mostraMessaggio(
            "Inserisci l'ID della partita."
        );
        return;
    }

    try {
        richiestaInCorso = true;
        pulsanteEntra.disabled = true;

        mostraMessaggio(
            "Accesso alla partita in corso..."
        );

        await api.entraPartita(id, nome);

        apriSchermataGioco(id);

    } catch (errore) {
        console.error(errore);

        mostraMessaggio(
            "Errore durante l'accesso: " +
            errore.message
        );

    } finally {
        richiestaInCorso = false;
        pulsanteEntra.disabled = false;
    }
});

// ============================================
// AGGIORNAMENTO PIOLI DEL TENTATIVO
// ============================================

function aggiornaPioliTentativo() {
    const riga = righe[tentativoCorrente];

    if (!riga) return;

    const pioli = riga.querySelectorAll(".peg");

    pioli.forEach((peg, indice) => {
        peg.className = "peg";

        if (tentativo[indice]) {
            peg.classList.add(tentativo[indice]);
        }
    });
}

// ============================================
// SELEZIONE COLORI
// ============================================

pulsantiColori.forEach(pulsante => {
    pulsante.addEventListener("click", () => {
        if (
            !partitaAttiva ||
            richiestaInCorso ||
            partitaTerminata
        ) {
            return;
        }

        if (tentativo.length >= 4) {
            mostraMessaggioGioco(
                "Hai già scelto quattro colori."
            );
            return;
        }

        const colore = pulsante.dataset.color;

        if (!colori.includes(colore)) return;

        tentativo.push(colore);

        aggiornaPioliTentativo();

        pulsantiColori.forEach(p => {
            p.classList.remove("selected");
        });

        pulsante.classList.add("selected");

        mostraMessaggioGioco(
            "Colori selezionati: " +
            tentativo.length + "/4"
        );
    });
});

// ============================================
// CANCELLA ULTIMO COLORE
// ============================================

pulsanteCancella.addEventListener("click", () => {
    if (!partitaAttiva || richiestaInCorso) return;

    if (tentativo.length === 0) {
        mostraMessaggioGioco(
            "Non ci sono colori da cancellare."
        );
        return;
    }

    tentativo.pop();

    aggiornaPioliTentativo();

    pulsantiColori.forEach(p => {
        p.classList.remove("selected");
    });

    mostraMessaggioGioco(
        "Colori selezionati: " +
        tentativo.length + "/4"
    );
});

// ============================================
// CONFERMA TENTATIVO
// ============================================

pulsanteConferma.addEventListener("click", async () => {
    if (
        !partitaAttiva ||
        richiestaInCorso ||
        partitaTerminata
    ) {
        return;
    }

    if (tentativo.length !== 4) {
        mostraMessaggioGioco(
            "Devi scegliere tutti e quattro i colori."
        );
        return;
    }

    if (tentativoCorrente >= 10) return;

    const proposta = [...tentativo];

    try {
        richiestaInCorso = true;

        bloccaInterfaccia(true);

        mostraMessaggioGioco(
            "Invio del tentativo..."
        );

        // Invia la mossa al server
        await api.inserisciMossa(
            partitaId,
            nomeGiocatore,
            proposta.join("-")
        );

        tentativo = [];

        pulsantiColori.forEach(p => {
            p.classList.remove("selected");
        });

        // Rilegge le mosse aggiornate
        await aggiornaPartita();

        if (partitaAttiva && !partitaTerminata) {
            mostraMessaggioGioco(
                "Tentativo registrato. " +
                "Attendi l'aggiornamento dell'avversario."
            );
        }

    } catch (errore) {
        console.error(errore);

        mostraMessaggioGioco(
            "Errore nell'invio della mossa: " +
            errore.message
        );

    } finally {
        richiestaInCorso = false;

        if (
            partitaAttiva &&
            !partitaTerminata &&
            tentativoCorrente < 10
        ) {
            bloccaInterfaccia(false);
        }
    }
});

// ============================================
// COPIA ID PARTITA
// ============================================

pulsanteCopia.addEventListener("click", async () => {
    if (!partitaId) return;

    try {
        await navigator.clipboard.writeText(partitaId);

        statoAccesso.textContent =
            "ID partita copiato!";

    } catch (errore) {
        console.error(errore);

        statoAccesso.textContent =
            "Impossibile copiare l'ID.";
    }
});

// ============================================
// TORNA ALLA SCHERMATA INIZIALE
// ============================================

pulsanteTorna.addEventListener("click", () => {
    fermaTimer();
    fermaAggiornamenti();

    partitaAttiva = false;
    partitaTerminata = true;
    richiestaInCorso = false;

    schermataGioco.hidden = true;
    schermataIniziale.hidden = false;

    mostraMessaggio("");
    mostraMessaggioGioco("");

    partitaId = null;
    codiceSegreto = [];
    tentativo = [];
    tutteLeMosse = [];
});

// ============================================
// AVVIO
// ============================================

caricaRecord();
aggiornaTempo();