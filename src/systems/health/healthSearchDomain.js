export function normalizeHealthSearch(value){
 return String(value??"").normalize("NFKC").toLocaleLowerCase("ar")
 .replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا")
 .replace(/ى/g,"ي").replace(/ة/g,"ه")
 .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660))
 .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06F0))
 .replace(/[\s\u200e\u200f]+/g," ").trim();
}
