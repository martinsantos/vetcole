// "JWT" de la demo en el navegador: no hay secreto que proteger (cada visitante tiene su propia copia de los datos).
const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec = s => JSON.parse(decodeURIComponent(escape(atob(s))));
export function sign(payload) { return 'demo.' + enc({ ...payload, iat: Date.now() }); }
export function verify(token) { if (!String(token).startsWith('demo.')) throw new Error('token inválido'); return dec(token.slice(5)); }
export default { sign, verify };
