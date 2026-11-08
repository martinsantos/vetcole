// bcrypt de la demo en el navegador: las cuentas son públicas (demo1234), no se guardan secretos.
export async function hash(p) { return 'demo:' + p; }
export async function compare(p, h) { return h === 'demo:' + p; }
export default { hash, compare };
