const encoder=new TextEncoder();
const decoder=new TextDecoder();
const ITERATIONS=310000;
const toBase64=bytes=>{let binary="";for(const byte of new Uint8Array(bytes))binary+=String.fromCharCode(byte);return btoa(binary);};
const fromBase64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const randomBytes=size=>crypto.getRandomValues(new Uint8Array(size));
const requireCrypto=()=>{if(!globalThis.crypto?.subtle)throw new Error("secure-crypto-unavailable");};
async function deriveWrappingKey(passphrase,salt,iterations=ITERATIONS){
 requireCrypto();
 if(typeof passphrase!=="string"||passphrase.length<12)throw new Error("passphrase-too-short");
 const material=await crypto.subtle.importKey("raw",encoder.encode(passphrase),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function createSpiritualKeyring(passphrase){
 requireCrypto();
 const salt=randomBytes(16),iv=randomBytes(12);
 const wrappingKey=await deriveWrappingKey(passphrase,salt);
 const dataKey=await crypto.subtle.generateKey({name:"AES-GCM",length:256},true,["encrypt","decrypt"]);
 const rawKey=await crypto.subtle.exportKey("raw",dataKey);
 const wrapped=await crypto.subtle.encrypt({name:"AES-GCM",iv},wrappingKey,rawKey);
 const lockedKey=await crypto.subtle.importKey("raw",rawKey,{name:"AES-GCM"},false,["encrypt","decrypt"]);
 new Uint8Array(rawKey).fill(0);
 return{key:lockedKey,keyring:{version:1,kdf:"PBKDF2-SHA-256",iterations:ITERATIONS,salt:toBase64(salt),wrap_iv:toBase64(iv),wrapped_key:toBase64(wrapped)}};
}
export async function unlockSpiritualKeyring(passphrase,keyring){
 requireCrypto();
 if(!keyring||keyring.version!==1||keyring.kdf!=="PBKDF2-SHA-256"||!Number.isInteger(keyring.iterations)||keyring.iterations<100000||keyring.iterations>2000000)throw new Error("unsupported-keyring");
 try{
  const wrappingKey=await deriveWrappingKey(passphrase,fromBase64(keyring.salt),keyring.iterations);
  const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(keyring.wrap_iv)},wrappingKey,fromBase64(keyring.wrapped_key));
  return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
 }catch{throw new Error("incorrect-passphrase-or-corrupt-keyring");}
}
export async function rewrapSpiritualKeyring(currentPassphrase,nextPassphrase,keyring){
 requireCrypto();
 if(typeof nextPassphrase!=="string"||nextPassphrase.length<12)throw new Error("passphrase-too-short");
 if(!keyring||keyring.version!==1||keyring.kdf!=="PBKDF2-SHA-256"||!Number.isInteger(keyring.iterations)||keyring.iterations<100000||keyring.iterations>2000000)throw new Error("unsupported-keyring");
 let raw;
 try{
  const oldWrappingKey=await deriveWrappingKey(currentPassphrase,fromBase64(keyring.salt),keyring.iterations);
  raw=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(keyring.wrap_iv)},oldWrappingKey,fromBase64(keyring.wrapped_key));
 }catch{throw new Error("incorrect-passphrase-or-corrupt-keyring");}
 const salt=randomBytes(16),iv=randomBytes(12);
 const nextWrappingKey=await deriveWrappingKey(nextPassphrase,salt);
 const wrapped=await crypto.subtle.encrypt({name:"AES-GCM",iv},nextWrappingKey,raw);
 const key=await crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
 new Uint8Array(raw).fill(0);
 return{key,keyring:{version:1,kdf:"PBKDF2-SHA-256",iterations:ITERATIONS,salt:toBase64(salt),wrap_iv:toBase64(iv),wrapped_key:toBase64(wrapped)}};
}
export async function encryptSpiritualPayload(key,value){
 requireCrypto();
 if(!key)throw new Error("encryption-locked");
 const iv=randomBytes(12),plain=encoder.encode(JSON.stringify(value));
 const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
 return{version:1,algorithm:"AES-256-GCM",iv:toBase64(iv),ciphertext:toBase64(ciphertext)};
}
export async function decryptSpiritualPayload(key,envelope){
 requireCrypto();
 if(!key)throw new Error("encryption-locked");
 if(!envelope||envelope.version!==1||envelope.algorithm!=="AES-256-GCM")throw new Error("unsupported-ciphertext");
 try{return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(envelope.iv)},key,fromBase64(envelope.ciphertext))));}
 catch{throw new Error("ciphertext-authentication-failed");}
}
export const SPIRITUAL_KEYRING_KDF_ITERATIONS=ITERATIONS;
