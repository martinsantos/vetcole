// Asistente de la comunidad con Claude (capacidad `sample` del Artifact): responde con el contenido oficial
// del Colegio y los datos en vivo de la demo. Si Claude no está disponible o el visitante no lo permite,
// devuelve null y se usa el asistente con reglas del backend.
import { PrismaClient } from './prisma-memory.js';
import { openStatus, vetName, parse } from '../../../backend/src/lib/core.js';

const prisma = new PrismaClient();
let samplePromise = null;
let disabled = false;
const getSample = () => (samplePromise ||= (window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null)));

const RUTAS = ['/', '/directorio', '/directorio?turnos=1', '/directorio?domicilio=1', '/mapa', '/guardias', '/libreta', '/verificar', '/receta', '/tramites', '/inscripcion', '/viajar', '/datos', '/servicios', '/noticias', '/institucional'];

const OFICIAL = `Plataforma ColVet Digital (demo de Última Milla para colegios veterinarios; datos ficticios). Para contacto, indicá que en la versión real aparecen los canales oficiales del Colegio.
- Matriculación: online desde /inscripcion (datos, título, documentación, pago, seguimiento). El Ministerio de Salud otorga la matrícula y el Colegio emite la credencial.
- Verificar una matrícula: /verificar con el número o escaneando el QR de la credencial. Ejercer sin matrícula se denuncia desde /tramites.
- Libreta sanitaria digital: la emiten veterinarios matriculados; se consulta en /libreta con N° de libreta o microchip. Compatible con la LUSCyF en papel.
- Viajar con mascotas: dentro del país, libreta con antirrábica vigente y certificado de salud de un matriculado. A Chile: antirrábica con más de 30 días, Certificado Veterinario Internacional de SENASA y desparasitación según exigencia. Detalle en /viajar.
- Guardias: tablero en vivo en /guardias. Activa = profesional en el lugar; pasiva = llamar antes.
- Recetas veterinarias: las farmacias las verifican en /receta y registran la dispensa (una sola vez).
- Turnos online: /directorio?turnos=1.`;

async function datosEnVivo() {
  const [g, vets] = await Promise.all([
    prisma.establecimiento.findMany({ where: { NOT: { guardia: null } } }),
    prisma.vet.findMany({ where: { estado: 'Vigente', fichaPublica: true } }),
  ]);
  const abiertas = g.map(e => ({ e, s: openStatus(e) })).filter(x => x.s.open);
  return [
    `Guardias abiertas ahora (${new Date().toLocaleString('es-AR')}):`,
    ...abiertas.map(({ e, s }) => `- ${e.nombre} (${e.departamento}) · ${s.code === 'activa' ? 'activa' : 'pasiva'} · tel ${e.telefono}`),
    'Profesionales con matrícula vigente:',
    ...vets.map(v => `- ${vetName(v)}, MP ${v.mp}, ${v.departamento}: ${parse(v.especialidadesJson).join(', ')}; especies: ${parse(v.especiesJson).join(', ')}${v.turnosOnline ? '; turnos online' : ''}${v.domicilio ? '; a domicilio' : ''}`),
  ].join('\n');
}

export async function asistenteClaude(pregunta, fallback) {
  if (!pregunta.trim()) return fallback(pregunta);
  const sample = disabled ? null : await getSample();
  if (!sample) return fallback(pregunta);
  const prompt = `Sos el asistente del sitio público de ColVet Digital, una demo para colegios veterinarios. Respondé en español rioplatense (voseo), claro y breve: como máximo 3 oraciones. Usá SOLO la información de abajo; si no está, decí que no la tenés y que en la versión real se consulta por los canales oficiales del Colegio. No inventes datos ni teléfonos.

INFORMACIÓN OFICIAL:
${OFICIAL}

DATOS EN VIVO DE LA DEMO:
${await datosEnVivo()}

Rutas de la web que podés sugerir como enlaces: ${RUTAS.join(', ')}.

Respondé SOLO con un objeto JSON: {"respuesta": string, "enlaces": [{"label": string, "to": una de las rutas}], "fuente": string corto que diga de dónde sale}. Como máximo 2 enlaces.

Pregunta: ${pregunta}`;
  try {
    const r = await sample.json(prompt, { modelTier: 'quick' });
    if (!r || typeof r.respuesta !== 'string') return fallback(pregunta);
    const enlaces = (Array.isArray(r.enlaces) ? r.enlaces : []).filter(l => l && RUTAS.includes(l.to)).slice(0, 2).map(l => ({ label: String(l.label || 'Ver'), to: l.to }));
    return { respuesta: r.respuesta, enlaces, fuente: `Claude · ${String(r.fuente || 'contenido oficial')}` };
  } catch (e) {
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e?.code)) disabled = true;
    return fallback(pregunta);
  }
}
