// Exportación de una libreta al formato abierto LSAA (Libreta Sanitaria Animal Abierta, borrador 0.1).
// Especificación y esquema: /estandar en el repositorio. Este módulo es la implementación de referencia.
import { estadoSanitario } from './core.js';

const ESPECIE = { Canino: 'canino', Felino: 'felino', Equino: 'equino', Bovino: 'bovino', Caprino: 'caprino', Ovino: 'ovino', Porcino: 'porcino', Ave: 'ave' };
const TIPO = { vac: 'vacuna', des: 'desparasitacion', cas: 'castracion', chip: 'identificacion', lab: 'analisis', via: 'certificado_viaje', con: 'consulta', cir: 'cirugia', inc: 'mordedura' };
// Qué eventos ve cada nivel de acceso.
const NIVELES = { publico: ['vac', 'des', 'cas', 'chip', 'lab', 'via'], tutor: ['vac', 'des', 'cas', 'chip', 'lab', 'via', 'con', 'cir', 'inc'] };
const dia = d => (d ? new Date(d).toISOString().slice(0, 10) : null);
const vetNombre = v => `${v.femenino ? 'Dra.' : 'Dr.'} ${v.nombre} ${v.apellido}`;

export const EMISOR = () => ({
  institucion: process.env.LSAA_EMISOR || 'Colegio de Médicos Veterinarios (demo ColVet Digital)',
  jurisdiccion: process.env.LSAA_JURISDICCION || 'AR-M',
  generado: new Date().toISOString(),
});
const verificacion = numero => `${(process.env.PUBLIC_URL || 'https://www.ultimamilla.com.ar/casos/vetcole').replace(/\/$/, '')}/libreta/${numero}`;

function firma(e, colegio) {
  if (e.vet) return { matricula: String(e.vet.mp), colegio, nombre: vetNombre(e.vet), vigenteAlFirmar: e.vet.estado === 'Vigente' };
  if (e.municipio) return { matricula: null, colegio: `Zoonosis ${e.municipio.nombre}`, nombre: null, vigenteAlFirmar: true };
  return { matricula: null, colegio, nombre: null, vigenteAlFirmar: false };
}

// animal: con eventos (incluyendo vet y municipio), municipio y tutor.
export function aLsaa(a, nivel = 'publico') {
  const emisor = EMISOR();
  const tipos = NIVELES[nivel] || NIVELES.publico;
  const eventos = a.eventos.filter(e => (nivel !== 'publico' || e.publico) && tipos.includes(e.tipo)).sort((x, y) => new Date(y.fecha) - new Date(x.fecha));
  const chipEv = a.eventos.find(e => e.tipo === 'chip');
  const est = estadoSanitario(a, a.eventos);
  return {
    estandar: 'LSAA',
    version: '0.1',
    nivel,
    libreta: {
      numero: a.libreta,
      verificacion: verificacion(a.libreta),
      luscyf: null,
      lsed: a.especie === 'Equino' ? null : undefined,
      credencialMunicipal: a.municipio ? { municipio: a.municipio.nombre, numero: String(a.credencialNro ?? '') } : null,
    },
    animal: {
      nombre: a.nombre,
      especie: ESPECIE[a.especie] || 'otro',
      raza: a.raza || null,
      sexo: /hembra/i.test(a.sexo) ? 'hembra' : /macho/i.test(a.sexo) ? 'macho' : 'desconocido',
      nacimiento: dia(a.nacimiento),
      pelaje: a.pelaje || null,
      castrado: a.castrado,
      microchip: /^\d{15}$/.test(a.microchip || '') ? {
        numero: a.microchip, norma: 'ISO 11784/11785',
        fechaColocacion: chipEv ? dia(chipEv.fecha) : null,
        colocadoPor: chipEv ? firma(chipEv, emisor.institucion) : null,
      } : null,
      // Mordeduras y peligrosidad no se publican: sólo las ven profesionales y autoridades sanitarias.
      estado: nivel === 'publico' ? { perdido: a.perdido, fallecido: false } : { perdido: a.perdido, mordedor: a.mordedor, potencialmentePeligroso: a.peligroso, fallecido: false },
    },
    ...(nivel === 'publico' ? {} : { tutor: a.tutor ? { nombre: a.tutor.nombre, departamento: a.tutor.departamento || undefined } : null }),
    emisor,
    estadoSanitario: est ? { codigo: est.codigo, etiqueta: est.etiqueta, vence: dia(est.vence) } : null,
    eventos: eventos.map(e => ({
      id: String(e.id),
      tipo: TIPO[e.tipo] || 'otro',
      fecha: dia(e.fecha),
      titulo: e.titulo,
      detalle: e.detalle || null,
      producto: e.lote ? { nombre: e.titulo, laboratorio: null, lote: e.lote, vencimiento: null } : null,
      stickerLuscyf: e.sticker || null,
      proximo: dia(e.proximo),
      origen: ['consultorio', 'zoonosis', 'campania'].includes(e.origen) ? e.origen : 'consultorio',
      lugar: null,
      firma: firma(e, emisor.institucion),
      visibilidad: e.publico && NIVELES.publico.includes(e.tipo) ? 'publico' : 'profesional',
    })),
  };
}
