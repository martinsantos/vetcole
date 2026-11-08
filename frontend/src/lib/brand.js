// Datos institucionales del sitio. En la versión publicada en Claude se usan datos neutros:
// la página no puede presentarse como el sitio oficial del Colegio.
import { CLAUDE } from './base.js';

export const BRAND = CLAUDE ? {
  demo: true,
  nombre: 'Colegio de Médicos Veterinarios',
  corto: 'Colegio de Veterinarios',
  ley: 'Ley de colegiatura obligatoria',
  sede: 'Dirección de la sede',
  tel: 'Teléfono de contacto',
  mail: 'contacto@colegio.demo',
  horario: 'Lunes a viernes, de 8 a 14 h',
  aviso: 'Demo de Última Milla con datos ficticios. No es un sitio oficial.',
} : {
  nombre: 'Colegio de Médicos Veterinarios de la Provincia de Mendoza',
  corto: 'Colegio de Veterinarios de Mendoza',
  ley: 'Ley provincial N° 7825 · Decreto 1958/11',
  sede: 'Pte. Santiago Derqui 114, Godoy Cruz',
  tel: '0261 424 3250',
  mail: 'info@colvetmza.com.ar',
  horario: null, // el sitio actual no publica el horario de atención
  aviso: 'Demo con datos de ejemplo: profesionales, tutores y municipios son ficticios.',
};
