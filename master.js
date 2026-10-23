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
*/

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

const gioco = new Api(username, password, baseURL);