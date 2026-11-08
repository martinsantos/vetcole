// Asistente de la comunidad. En la demo responde con reglas sobre contenido oficial y datos en vivo;
// en producción este módulo se reemplaza por un modelo de lenguaje restringido a las fuentes del Colegio.
import { prisma, openStatus, vetName, parse } from './core.js';

const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function asistente(pregunta) {
  const t = n(pregunta);
  const has = (...w) => w.some(x => t.includes(x));
  if (has('chile', 'viaj', 'avion', 'frontera'))
    return r('Para viajar a Chile necesitás la antirrábica aplicada hace más de 30 días, el Certificado Veterinario Internacional de SENASA y la desparasitación que pida el destino. El certificado de salud lo emite un veterinario matriculado.', [['Requisitos', '/viajar'], ['Pedir turno', '/directorio?turnos=1']], 'Viajar con mascotas');
  if (has('guardia', 'urgen', 'noche', 'emergen')) {
    const g = await prisma.establecimiento.findMany({ where: { guardia: 'activa' } });
    const abiertas = g.filter(e => openStatus(e).open);
    return r(`Ahora hay ${abiertas.length} guardias activas con profesional en el lugar: ${abiertas.slice(0, 3).map(e => `${e.nombre} (${e.departamento})`).join(', ')}.`, [['Tablero de guardia', '/guardias']], 'Tablero de guardia (en vivo)');
  }
  if (has('exotic', 'conejo', 'huron', 'ave', 'loro', 'reptil')) {
    const v = (await prisma.vet.findMany({ where: { estado: 'Vigente' } })).filter(x => parse(x.especiesJson).some(s => s === 'Exóticos' || s === 'Aves'));
    return r(`Atienden exóticos o aves: ${v.map(x => `${vetName(x)} (${x.departamento})`).join(', ')}.`, [['Ver en el directorio', '/directorio?especie=Exóticos']], 'Directorio oficial (en vivo)');
  }
  if (has('perd', 'extravi', 'encontr'))
    return r('Si tu mascota tiene libreta digital, activá el aviso de perdido/a desde la app del tutor: quien escanee el QR de la chapita o la libreta verá el aviso y podrá avisarte sin ver tu número.', [['App del tutor', '/tutor']], 'Libreta sanitaria digital');
  if (has('matricul', 'verific', 'trucho', 'ilegal', 'falso'))
    return r('Podés verificar cualquier matrícula con el número o escaneando el QR de la credencial. Si alguien vacuna o atiende sin matrícula, podés denunciarlo.', [['Verificar matrícula', '/verificar'], ['Denunciar', '/tramites']], 'Verificación pública');
  if (has('libreta', 'vacun', 'antirrab'))
    return r('La libreta sanitaria digital la emite tu veterinario/a matriculado/a. La consultás con el número de libreta o de microchip y te avisa cuándo toca la próxima vacuna.', [['Consultar libreta', '/libreta']], 'Libreta sanitaria digital');
  if (has('turno', 'castr'))
    return r('Estos profesionales tienen turnos online: elegís día y horario y te llega la confirmación.', [['Ver turnos', '/directorio?turnos=1']], 'Directorio oficial');
  if (has('caball', 'equin', 'vaca', 'cabra', 'campo', 'product'))
    return r('Para grandes animales tenés el directorio filtrado por especie con atención a campo. Para equinos, la libreta digital de SENASA será la única válida desde 2028.', [['Directorio', '/directorio?especie=Equinos']], 'Directorio oficial');
  if (has('receta', 'farmac'))
    return r('Las farmacias verifican las recetas veterinarias escaneando su QR: ven si el profesional está habilitado y si la receta ya se usó.', [['Verificar receta', '/receta']], 'Recetas veterinarias');
  return r('No encontré eso en el contenido oficial del Colegio. Podés escribir a info@colvetmza.com.ar o llamar al 0261 4243250.', [['Inicio', '/']], 'Contacto');
}
const r = (respuesta, enlaces, fuente) => ({ respuesta, enlaces: enlaces.map(([label, to]) => ({ label, to })), fuente });
