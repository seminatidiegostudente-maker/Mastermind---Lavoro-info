/*
const baseURL = 'https://classe5id.altervista.org/games/';
const password = 'CRIPPA';
const username = '4IB';

//classe api con metodi crea, mostra,  join
class api
{
    constructor(username, password, baseURL)
    {
        this.baseURL=baseURL;
        this.password=password;
        this.username = username;
    }
    //crea partita

    async CreaPartita()
    {
        fetch("https://classe5ID.altervista.org/games/partita/Master_Belo", requestOptions)
        .then((response) => response.text())
        .then((result) => console.log(result))
        .catch((error) => console.error(error));
    }
}


const myHeaders = new Headers();
myHeaders.append("Authorization", "Basic NElCOkNSSVBQQQ==");

const requestOptions = {
  method: "POST",
  headers: myHeaders,
  redirect: "follow"
};

fetch("https://classe5ID.altervista.org/games/partita/Master_Belo", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));


const baseURL = 'https://classe5id.altervista.org/games/';
const password = 'CRIPPA';
const username = '4IB';

class Api {
    constructor(username, password, baseURL) 
    {
        this.baseURL = baseURL;
        this.password = password;
        this.username = username;
    }

    // Crea una partita
    async CreaPartita() {
        try {
            const headers = new Headers();

            headers.append(
                "Authorization",
                "Basic " + btoa(this.username + ":" + this.password)
            );

            const requestOptions =
            {
                method: "POST",
                headers: headers,
                redirect: "follow"
            };

            const response = await fetch(
                this.baseURL + "partita/Master_Belo",
                requestOptions
            );

            if (!response.ok)
                throw new Error("Errore HTTP: " + response.status);

            const risultato = await response.text();

            console.log("Risposta del server:", risultato);

            return risultato;

        } catch (error) {
            console.error("Errore:", error);
            throw error;
        }
    }
}

const gioco = new Api(username, password, baseURL);*/
/*





partita che si crea su api
const myHeaders = new Headers();
myHeaders.append("Authorization", "Basic NElCOkNSSVBQQQ==");

const requestOptions = {
  method: "POST",
  headers: myHeaders,
  redirect: "follow"
};

fetch("https://classe5ID.altervista.org/games/partita/Master_nomeutente", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));

  */


  const baseURL = 'https://classe5id.altervista.org/games/';
  const password = 'CRIPPA';
  const username = '4IB';
  
  class Api {
      constructor(username, password, baseURL) {
          this.baseURL = baseURL;
          this.password = password;
          this.username = username;
      }
  
      // Crea una partita
      async CreaPartita() {
          try {
              const headers = new Headers();
  
              headers.append(
                  "Authorization",
                  "Basic " + btoa(this.username + ":" + this.password)
              );
  
              const requestOptions =
              {
                  method: "POST",
                  headers: headers,
                  redirect: "follow"
              };
  
              const response = await fetch(
                  this.baseURL + "partita/Master_Belo",
                  requestOptions
              );
  
              if (!response.ok)
                  throw new Error("Errore HTTP: " + response.status);
  
              const risultato = await response.text();
  
              console.log("Risposta del server:", risultato);
  
              return risultato;
  
          } catch (error) {
              console.error("Errore:", error);
              throw error;
          }
      }
  }
  
  const gioco = new Api(username, password, baseURL);
  
  
  // PULSANTE NUOVA PARTITA
  
  document.getElementById("nuovaPartita").addEventListener("click", async function () {
  
      const pulsante = this;
      const messaggio = document.getElementById("messaggio");
  
      pulsante.disabled = true;
      messaggio.textContent = "Creazione della partita in corso...";
  
      try {
          const risultato = await gioco.CreaPartita();
  
          console.log("Partita creata:", risultato);
  
          // Nasconde la schermata iniziale
          document.getElementById("schermataIniziale").hidden = true;
  
          // Mostra la schermata di Mastermind
          document.getElementById("schermataGioco").hidden = false;
  
      } catch (error) {
          messaggio.textContent =
              "Errore durante la creazione della partita. Riprova.";
  
          pulsante.disabled = false;
      }
  
  });
  
  
  // PULSANTE CANCELLA
  
  document.getElementById("cancella").addEventListener("click", function () {
  
      const tentativoAttivo = document.querySelector(".attempt.active");
  
      if (!tentativoAttivo) {
          return;
      }
  
      tentativoAttivo.querySelectorAll(".peg").forEach(function (peg) {
          peg.className = "peg";
      });
  
  });
  
  
  // SELEZIONE DEI COLORI
  
  let coloreSelezionato = null;
  
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
  
  document.querySelectorAll(".color").forEach(function (colore) {
  
      colore.addEventListener("click", function () {
  
          coloreSelezionato = colori.find(function (nome) {
              return colore.classList.contains(nome);
          });
  
          document.querySelectorAll(".color").forEach(function (elemento) {
              elemento.classList.remove("selected");
          });
  
          colore.classList.add("selected");
  
          const tentativoAttivo = document.querySelector(".attempt.active");
  
          if (!tentativoAttivo || !coloreSelezionato) {
              return;
          }
  
          const pioli = tentativoAttivo.querySelectorAll(".peg");
  
          for (const peg of pioli) {
              if (!peg.dataset.colore) {
                  peg.classList.add(coloreSelezionato);
                  peg.dataset.colore = coloreSelezionato;
                  break;
              }
          }
  
      });
  
  });
  
  
  // CONFERMA TENTATIVO
  
  document.getElementById("conferma").addEventListener("click", function () {
  
      const tentativoAttivo = document.querySelector(".attempt.active");
  
      if (!tentativoAttivo) {
          return;
      }
  
      const pioli = tentativoAttivo.querySelectorAll(".peg");
  
      const combinazione = Array.from(pioli).map(function (peg) {
          return peg.dataset.colore || null;
      });
  
      if (combinazione.some(function (colore) {
          return colore === null;
      })) {
          alert("Devi selezionare tutti e quattro i colori!");
          return;
      }
  
      alert(
          "Tentativo selezionato: " + combinazione.join(", ") +
          "\nPer verificare la combinazione serve la funzione di controllo del server."
      );
  
  });