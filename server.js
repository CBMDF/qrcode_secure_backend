var express = require("express");
var app = express();
const fs = require("fs");
const {
  generateKeyPairSync,
  privateEncrypt,
  publicDecrypt,
} = require("crypto");
const crypto = require("crypto");
const generator = require("generate-password");
const constants = require("constants");
var cors = require("cors");
app.use(express.urlencoded({ extended: false }));

corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

const { password } = require("./conf");

app.listen(22633, () => {
  console.log("Server running on port 22633"); // Porta eh CBMDF em keypad https://en.wikipedia.org/wiki/Telephone_keypad#/media/File:Telephone-keypad2.svg
});

/* Início Configurações de Criptografia */
const algorithm = "aes-256-cbc";
const inputEncoding = "utf8"; // Codificação da Entrada
const outputEncoding = "base64"; // Codificação da Saída

/**
 * Gera um QRCode a partir do conteúdo do parâmetro data em POST.
 */
app.get("/qrcode", (req, res) => {
  (async () => {
    try {
      const QRCode = require("qrcode");
      data = req.query.data;

      QRCode.toDataURL(data, function (err, url) {
        console.log(url);
        res.send(`<img src="${url}">`);
      });
    } catch (error) {
      res.send(error);
      console.log(error);
    }
  })();
});

/*
Params (POST)
 - version: Versão da API de criptografia.
 - data: Informação que será criptografada codificada em Base64.

Response (JSON)
 - version: versão do algoritmo.
 - data: JSON criptografado e codificado em Base64.

 data (JSON)
 - d: dados em texto claro
 - h: hash SHA-256 dos dados em texto claro.
 - t: data/hora da assinatura criptografica em formato Unix Time.
*/
app.post("/encrypt", (req, res) => {
  (async () => {
    try {
      // Obtem o dado em base64
      const data = req.query.data;

      // Obtem a versão
      const version = req.query.version;

      const hash = crypto.createHash("sha256"); // Define o algoritmo de hashing (message digest)

      // Obtem o conteúdo do parametro data
      let plainText = new Buffer.from(req.query.data, outputEncoding).toString(
        inputEncoding
      );

      // Calcula o hash do conteúdo em texto claro.
      const contentHash = hash.update(plainText).digest("hex");

      // Calcula e criptografa a data /hora da encriptação
      const dateTime = String(Math.floor(new Date() / 1000));

      jsonOutput = {
        d: plainText, // Strings CSV com conteúdo criptografado.
        h: contentHash, // Hash do conteúdo em texto claro.
        t: dateTime,
      };
      outputAsString = JSON.stringify(jsonOutput);
      console.log(outputAsString);

      /*
       Divide a string de entrada devido as limitações de tamanho do RSA
       onde o conteúdo criptografado não pode ser maior que a chave 4096 bits ou
       512 bytes. Nos testes o valor máximo de caracteres de 500.
      */
      const plainTextSplitted = stringSplitter(outputAsString, 500);

      // Criptografa cada parte
      var arrCrypt = [];
      plainTextSplitted.map((chunk) => {
        let encrypted = encryptString(chunk, "./private.pem");
        let encrypted64 = new Buffer.from(encrypted).toString(outputEncoding);
        arrCrypt.push(encrypted64);
      });

      output = arrCrypt.join(","); // Transforma o array em string separada por vírgula (CSV)
      res.json({ version: version, data: output });
    } catch (error) {
      res.send(error);
      console.log(error);
    }
  })();
});

app.post("/decrypt", (req, res) => {
  (async () => {
    try {
      // Obtem a string de dados. N trechos separados por vírgula e codificados em base64
      const data = req.query.data;
      // Tratamento da entrada caso não esteja com URL encoded transformando espaços em +
      var replaced = data.split(" ").join("+");

      // Obtem a versão
      const version = req.query.version;

      // Cria um array a partir do data CSV
      var arrCrypt = replaced.split(",");

      // Decriptografa cada parte
      let output = "";
      arrCrypt.map((chunk) => {
        console.log("chunk", chunk);

        // Converte de base64 para buffer
        encrypted = Buffer.from(chunk, outputEncoding);

        // Decriptografar para obter texto claro
        const decrypted = decryptString(encrypted, "./public.pem");
        console.log("\nTexto claro\n", decrypted);
        output = output.concat(decrypted);
      });

      console.log("Output", output);

      res.json({
        version: 1,
        data: Buffer.from(output).toString(outputEncoding),
      });
    } catch (error) {
      res.send(error);
      console.log(error);
    }
  })();
});

/**
 * A função realiza criptografia assimétrica utilizando uma chave privada existente.
 *
 * @param {string} plainText texto que será criptografado
 * @param {string} privateKeyFile caminho para o arquivo com a chave privada em formato PEM
 * @returns {string}
 */
function encryptString(plainText, privateKeyFile) {
  const privateKey = fs.readFileSync(privateKeyFile, inputEncoding);
  buffer = Buffer.from(plainText);
  const encrypted = crypto.privateEncrypt(privateKey, buffer);
  return encrypted;
}

function decryptString(encrypted, publicKeyFile) {
  // Ja recebe encrypted como Buffer. Nao eh necessario converter.
  console.log("\nBuffer de encrypted:\n", encrypted);
  const publicKey = fs.readFileSync(publicKeyFile, inputEncoding);

  const decrypted = crypto.publicDecrypt(publicKey, encrypted);
  return decrypted.toString();
}

function stringSplitter(str, length) {
  let str2 = str.replace(/(\r\n|\n|\r|\s{2,})/gm, ""); // Remove quebras de linha e mais de 2 espaços consecutivos
  let str3 = str2.match(new RegExp(".{1," + length + "}", "g")); // Dividee a string em trecho de comprimento máximo definido em length
  console.log("stringSplitter: ", str3, str3.length);
  return str3;
}
