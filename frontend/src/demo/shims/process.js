// `process` mínimo para el código del backend que corre en el navegador (lee process.env).
if (typeof globalThis.process === 'undefined') globalThis.process = { env: {}, exit() {}, argv: [] };
else globalThis.process.env ||= {};
export default globalThis.process;
