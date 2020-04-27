const fs = require("fs");
const {
  generateKeyPairSync,
  privateEncrypt,
  publicDecrypt,
} = require("crypto");
const crypto = require("crypto");
const generator = require("generate-password");
const constants = require("constants");

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs1",
    format: "pem",
    cipher: "aes-256-cbc",
    passphrase: "",
  },
});

fs.writeFileSync("private.pem", privateKey);
fs.writeFileSync("public.pem", publicKey);

console.log("Keys generated");
