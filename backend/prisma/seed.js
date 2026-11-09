// Datos de demostración. Las guardias salen del listado público de colvetmza.com.ar (ubicación aproximada);
// profesionales, tutores, animales, ventas y municipios en servicio son FICTICIOS.
import { FOTOS } from './fotos.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = a => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const at = (d, hh, mm = 0) => { const x = new Date(d); x.setHours(hh, mm, 0, 0); return x; };
const J = x => JSON.stringify(x);

const VETS = [
  [1342, 'Lucía', 'Ferreyra', 1, 'Capital', ['Clínica de pequeños animales', 'Dermatología'], ['Perros', 'Gatos'], { turnos: 1 }],
  [1188, 'Martín', 'Quiroga', 0, 'Godoy Cruz', ['Diagnóstico por imágenes', 'Cardiología'], ['Perros', 'Gatos', 'Exóticos'], { turnos: 1 }],
  [1241, 'Valentina', 'Sosa', 1, 'Guaymallén', ['Animales exóticos y no convencionales'], ['Exóticos', 'Aves'], { turnos: 1 }],
  [902, 'Joaquín', 'Funes', 0, 'Tunuyán', ['Clínica de pequeños animales', 'Rumiantes'], ['Perros', 'Gatos', 'Bovinos'], { turnos: 1, dom: 1 }],
  [1015, 'Carolina', 'Videla', 1, 'Luján de Cuyo', ['Equinos', 'Fisioterapia y rehabilitación'], ['Equinos'], { turnos: 1, dom: 1 }],
  [1120, 'Federico', 'Lucero', 0, 'San Martín', ['Clínica de pequeños animales', 'Cirugía'], ['Perros', 'Gatos'], { turnos: 1 }],
  [777, 'Agustina', 'Pizarro', 1, 'Rivadavia', ['Clínica de pequeños animales'], ['Perros', 'Gatos'], {}],
  [688, 'Tomás', 'Correa', 0, 'General Alvear', ['Rumiantes', 'Salud pública y bromatología'], ['Bovinos', 'Caprinos y ovinos'], { dom: 1 }],
  [1263, 'Romina', 'Guiñazú', 1, 'Tupungato', ['Clínica de pequeños animales', 'Etología y comportamiento'], ['Perros', 'Gatos'], { turnos: 1 }],
  [940, 'Esteban', 'Bustos', 0, 'Lavalle', ['Producción caprina', 'Rumiantes'], ['Caprinos y ovinos', 'Bovinos'], { dom: 1 }],
  [1077, 'Florencia', 'Moyano', 1, 'San Carlos', ['Clínica de pequeños animales', 'Equinos'], ['Perros', 'Gatos', 'Equinos'], {}],
  [1301, 'Micaela', 'Arancibia', 1, 'Capital', ['Medicina felina'], ['Gatos'], { turnos: 1 }],
  [1204, 'Diego', 'Ojeda', 0, 'Capital', ['Cirugía', 'Anestesiología'], ['Perros', 'Gatos'], { turnos: 1 }],
  [1156, 'Sofía', 'Calderón', 1, 'Godoy Cruz', ['Oftalmología'], ['Perros', 'Gatos', 'Equinos'], { turnos: 1 }],
  [1099, 'Pablo', 'Giménez', 0, 'Maipú', ['Clínica de pequeños animales'], ['Perros', 'Gatos'], { dom: 1 }],
  [865, 'Nicolás', 'Ruiz Díaz', 0, 'San Rafael', ['Rumiantes', 'Producción caprina'], ['Bovinos', 'Caprinos y ovinos', 'Equinos'], { dom: 1 }],
  [1288, 'Julieta', 'Ponce', 1, 'Las Heras', ['Clínica de pequeños animales', 'Fisioterapia y rehabilitación'], ['Perros', 'Gatos'], { dom: 1 }],
  [731, 'Gonzalo', 'Herrera', 0, 'Malargüe', ['Producción caprina', 'Salud pública y bromatología'], ['Caprinos y ovinos', 'Bovinos'], { dom: 1 }],
  [1225, 'Camila', 'Zalazar', 1, 'Guaymallén', ['Dermatología', 'Medicina felina'], ['Perros', 'Gatos'], { turnos: 1 }],
  [1010, 'Ramiro', 'Olguín', 0, 'Junín', ['Clínica de pequeños animales'], ['Perros', 'Gatos', 'Aves'], {}],
  [1180, 'Paula', 'Montenegro', 1, 'Santa Rosa', ['Rumiantes'], ['Bovinos', 'Porcinos'], { dom: 1 }],
  [615, 'Sebastián', 'Riquelme', 0, 'General Alvear', ['Equinos'], ['Equinos'], { dom: 1 }],
  [1312, 'Natalia', 'Coria', 1, 'Capital', ['Etología y comportamiento'], ['Perros', 'Gatos'], { dom: 1, turnos: 1 }],
  [984, 'Ignacio', 'Vargas', 0, 'La Paz', ['Clínica de pequeños animales', 'Rumiantes'], ['Perros', 'Bovinos'], {}],
  [552, 'Héctor', 'Lima', 0, 'Capital', ['Clínica de pequeños animales'], ['Perros', 'Gatos'], { estado: 'Suspendida' }],
  [1350, 'Brenda', 'Saavedra', 1, 'Maipú', ['Clínica de pequeños animales'], ['Perros', 'Gatos'], { estado: 'En trámite' }],
];

// [codigo, nombre, direccion, depto, tel, guardia, lat, lng, tipo, especies, extra]
const ESTABS = [
  ['g1', 'Clínica Dr. Juan Martín Molinari', 'Paso de los Andes 1863', 'Capital', '2615183703', 'pasiva', -32.8775, -68.858, 'Clínica'],
  ['g2', 'AsisVet 24 hs.', 'Peltier 55', 'Godoy Cruz', '2615880840', 'activa', -32.927, -68.847, 'Clínica'],
  ['g3', 'Clínica Veterinaria Los Álamos', 'Los Álamos 1654', 'Godoy Cruz', '2613035770', 'pasiva', -32.946, -68.856, 'Clínica'],
  ['g4', 'Veterinaria Cumelén', 'Aristóbulo del Valle y Corrientes 1749', 'Godoy Cruz', '4398134', 'pasiva', -32.931, -68.838, 'Veterinaria'],
  ['g5', 'Clínica Veterinaria Godoy Cruz', 'Juan de Garay 18', 'Godoy Cruz', '2612552066', 'pasiva', -32.924, -68.844, 'Clínica'],
  ['g6', 'Veterinaria Avenida', 'Av. San Martín Sur 1176', 'Godoy Cruz', '2615105274', 'pasiva', -32.938, -68.842, 'Veterinaria'],
  ['g7', 'Veterinaria Bombal', 'Francisco Álvarez 27, B° Bombal', 'Godoy Cruz', '2613838599', 'pasiva', -32.9165, -68.855, 'Veterinaria'],
  ['g8', 'Hocicos Internación 24 hs.', 'Sebastián Gaboto 2740, San José', 'Guaymallén', '2617050082', 'pasiva', -32.893, -68.815, 'Clínica con internación'],
  ['g9', 'Ital Vet 24 hs.', 'Remedios de Escalada 992', 'Guaymallén', '2617090001', 'activa', -32.901, -68.8, 'Clínica'],
  ['g10', 'Clínica Veterinaria Estrada', 'Manuel Estrada 472', 'Guaymallén', '2616607232', 'activa', -32.896, -68.822, 'Clínica'],
  ['g11', 'Nueva Ciudad', 'Hudson 2125, San José', 'Guaymallén', '2615089608', 'activa', -32.905, -68.808, 'Clínica'],
  ['g12', 'González Rodrigo, Urgencias Veterinarias', 'Bandera de los Andes 1893', 'Guaymallén', '2612595336', 'pasiva', -32.899, -68.805, 'Urgencias', null, { guardiaNota: 'hasta las 0 h' }],
  ['g13', 'Hospital Veterinario Andino', 'Barrio Cementista 2, Mza 16 Casa 7', 'Las Heras', '4444396', 'activa', -32.856, -68.825, 'Hospital'],
  ['g14', 'Clínica Veterinaria El Cencerro', 'Cerro Aconcagua 1030, Vistalba', 'Luján de Cuyo', '2612587488', 'pasiva', -33.026, -68.918, 'Clínica', ['Perros', 'Gatos', 'Equinos']],
  ['g15', 'Agroveterinaria del Litoral', 'Juan Agustín Maza 1655', 'Malargüe', '2604570182', 'pasiva', -35.472, -69.585, 'Agroveterinaria', ['Perros', 'Gatos', 'Caprinos y ovinos', 'Bovinos']],
  ['g16', 'Clínica San Rafael', 'Iselin 66', 'San Rafael', '2604043270', 'pasiva', -34.615, -68.333, 'Clínica'],
  ['g17', 'Servicios Veterinarios «El Capricho»', 'Ruta 146 km 365, Colonia Elena', 'San Rafael', '2604827225', 'pasiva', -34.73, -68.41, 'Servicio rural', ['Perros', 'Gatos', 'Bovinos', 'Equinos']],
  ['g18', 'CDVET Centro Diagnóstico Veterinario', 'Agustín Álvarez 155, Fray Luis Beltrán', 'Maipú', '2617115285', 'activa', -33.004, -68.653, 'Centro de diagnóstico', null, { guardiaDias: '5,6', guardiaNota: 'activa viernes y sábados' }],
  ['e1', 'Consultorio Veterinario Parque', 'Av. Emilio Civit 450', 'Capital', '2615550101', null, -32.888, -68.864, 'Consultorio', null, { dt: 1342, team: [1342, 1204], turnos: 1 }],
  ['e2', 'VetImágenes Diagnóstico', 'San Martín 2100', 'Godoy Cruz', '2615550102', null, -32.93, -68.85, 'Centro de diagnóstico', ['Perros', 'Gatos', 'Exóticos'], { dt: 1188, team: [1188, 1156], turnos: 1 }],
  ['e3', 'Exóticos Mendoza', 'Bandera de los Andes 5200', 'Guaymallén', '2615550103', null, -32.91, -68.78, 'Consultorio', ['Exóticos', 'Aves'], { dt: 1241, team: [1241, 1225], turnos: 1 }],
  ['e4', 'Veterinaria Valle de Uco', 'San Martín 980', 'Tunuyán', '2622550104', null, -33.577, -69.017, 'Veterinaria', ['Perros', 'Gatos', 'Bovinos', 'Equinos'], { dt: 902, team: [902], turnos: 1 }],
  ['e5', 'Servicio Equino Los Andes', 'Ruta 86 km 12, Agrelo', 'Luján de Cuyo', '2615550105', null, -33.12, -68.9, 'Servicio a campo', ['Equinos'], { dt: 1015, team: [1015], turnos: 1 }],
  ['e6', 'Veterinaria del Este', 'Av. España 340', 'San Martín', '2623550106', null, -33.081, -68.47, 'Veterinaria', null, { dt: 1120, team: [1120], turnos: 1 }],
  ['e7', 'Clínica Rivadavia', 'Lavalle 210', 'Rivadavia', '2623550107', null, -33.19, -68.464, 'Clínica', null, { dt: 777, team: [777] }],
  ['e8', 'Veterinaria Alvear Rural', 'Av. Alvear Oeste 600', 'General Alvear', '2625550108', null, -34.976, -67.695, 'Agroveterinaria', ['Bovinos', 'Caprinos y ovinos', 'Perros'], { dt: 688, team: [688, 615] }],
  ['e9', 'Consultorio Tupungato', 'Belgrano 455', 'Tupungato', '2622550109', null, -33.369, -69.148, 'Consultorio', null, { dt: 1263, team: [1263], turnos: 1 }],
  ['e10', 'Agroveterinaria Lavalle', 'Ruta 24 s/n, Villa Tulumaya', 'Lavalle', '2615550110', null, -32.724, -68.593, 'Agroveterinaria', ['Caprinos y ovinos', 'Bovinos', 'Perros'], { dt: 940, team: [940] }],
  ['e11', 'Veterinaria San Carlos', 'Av. San Martín 120, La Consulta', 'San Carlos', '2622550111', null, -33.734, -69.117, 'Veterinaria', ['Perros', 'Gatos', 'Equinos'], { dt: 1077, team: [1077] }],
  ['e12', 'Felinos · Clínica amigable con gatos', 'Colón 780', 'Capital', '2615550112', null, -32.895, -68.842, 'Clínica felina', ['Gatos'], { dt: 1301, team: [1301, 1204], turnos: 1 }],
];

const NOMBRES = ['Martina Gómez', 'Juan Pérez', 'Diego Morales', 'Carla Suárez', 'Lucas Domínguez', 'Valeria Ortiz', 'Hernán Castro', 'Paula Romero', 'Marcela Aguirre', 'Ignacio Navarro', 'Florencia Ríos', 'Gabriel Molina', 'Julia Peralta', 'Andrés Sánchez', 'Noelia Torres', 'Federico Díaz', 'Cecilia Vega', 'Rodrigo Medina', 'Lorena Rojas', 'Matías Herrera', 'Silvina Luna', 'Tomás Acosta', 'Laura Benítez', 'Pablo Ferrari', 'Daniela Paz', 'Emilio Castillo', 'Rocío Godoy', 'Santiago Quiroga', 'Mariana Ledesma', 'Germán Funes'];
const PERROS = ['Toto', 'Luna', 'Rocco', 'Olivia', 'Bruno', 'Mora', 'Simón', 'Kira', 'Thor', 'Lola', 'Coco', 'Nala', 'Milo', 'Frida', 'Zeus', 'Uma', 'Pancho', 'Maya', 'Tango', 'Greta'];
const GATOS = ['Michi', 'Pelusa', 'Felipe', 'Nina', 'Tom', 'Mía', 'Salem', 'Kiwi', 'Oliver', 'Chispa'];
const RAZAS_P = ['Mestizo', 'Caniche', 'Labrador', 'Golden Retriever', 'Bulldog francés', 'Ovejero alemán', 'Beagle', 'Border collie'];
const RAZAS_G = ['Europeo de pelo corto', 'Siamés', 'Persa', 'Mestizo'];

async function main() {
  seed = 7; // datos idénticos en cada recarga
  // limpiar (orden por dependencias)
  for (const m of ['ventaItem', 'venta', 'movCC', 'compra', 'proveedor', 'producto', 'mensaje', 'turno', 'servicio', 'receta', 'evento', 'mordedura', 'campania', 'cliente', 'user', 'animal', 'tutor', 'equipoVet', 'establecimiento', 'cuota', 'tramite', 'casoEpi', 'vet', 'municipio', 'inscripcion', 'noticia', 'denuncia'])
    await prisma[m].deleteMany();

  const pass = await bcrypt.hash('demo1234', 8);

  // ── Veterinarios
  const vetBy = {};
  for (const [mp, nombre, apellido, f, dep, esp, sp, o] of VETS) {
    vetBy[mp] = await prisma.vet.create({ data: { mp, nombre, apellido, femenino: !!f, departamento: dep, especialidadesJson: J(esp), especiesJson: J(sp), estado: o.estado || 'Vigente', domicilio: !!o.dom, turnosOnline: !!o.turnos, telefono: `26155${String(mp).padStart(5, '0')}`, email: `${nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${apellido.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@mail.com`, alta: 2008 + (mp % 17), dni: `${20 + (mp % 20)}.${String(mp * 7).padStart(3, '0').slice(0, 3)}.${String(mp).padStart(3, '0').slice(-3)}`, bio: mp === 1342 ? 'Clínica de pequeños animales con orientación en dermatología. Atención con turno.' : null, foto: FOTOS[mp] || null } });
  }

  // ── Establecimientos
  const estBy = {};
  for (const [codigo, nombre, direccion, dep, tel, guardia, lat, lng, tipo, especies, x = {}] of ESTABS) {
    const e = await prisma.establecimiento.create({ data: {
      codigo, nombre, direccion, departamento: dep, telefono: tel, guardia, lat, lng, tipo, especiesJson: J(especies || ['Perros', 'Gatos']), real: codigo.startsWith('g'),
      guardiaNota: x.guardiaNota, guardiaDias: x.guardiaDias, turnosOnline: !!x.turnos,
      dtId: x.dt ? vetBy[x.dt].id : null, habilitacion: x.dt ? `HAB-${2400 + int(0, 599)}` : null, venceHab: x.dt ? day(int(20, 500)) : null,
    } });
    for (const mp of x.team || []) await prisma.equipoVet.create({ data: { estId: e.id, vetId: vetBy[mp].id } });
    estBy[codigo] = e;
  }

  // ── Servicios por consultorio con turnos
  const SERV = [['Consulta general', 30, 12000, '#2d6b5a'], ['Vacunación', 20, 9500, '#3b6ea5'], ['Control dermatológico', 30, 15000, '#8a6d3b'], ['Cirugía programada (prequirúrgico)', 45, 18000, '#7c1c6f'], ['Certificado para viajar', 30, 14000, '#b26a00'], ['Desparasitación', 15, 6000, '#5b5b9a']];
  const servBy = {};
  for (const e of Object.values(estBy).filter(e => e.turnosOnline)) {
    servBy[e.id] = [];
    for (const [n, d, p, c] of SERV) servBy[e.id].push(await prisma.servicio.create({ data: { estId: e.id, nombre: n, duracionMin: d, precio: p, color: c } }));
  }

  // ── Colegio: cuotas, trámites, inscripciones, noticias, denuncias, casos
  const periodos = ['Noviembre 2026', 'Octubre 2026', 'Septiembre 2026', 'Agosto 2026', 'Julio 2026', 'Junio 2026'];
  for (const v of Object.values(vetBy)) {
    for (let i = 0; i < periodos.length; i++) {
      const vence = new Date(2026, 10 - i, 10);
      const debe = (v.mp === 552 && i < 6) || (v.mp === 1099 && i < 2) || (v.mp === 1010 && i < 1) || i === 0 && rnd() < 0.55;
      await prisma.cuota.create({ data: { vetId: v.id, periodo: periodos[i], monto: i < 3 ? 18500 : 17200, vence, estado: debe ? 'Pendiente' : 'Pagada', pagadaEn: debe ? null : new Date(2026, 10 - i, int(1, 10)), medio: debe ? null : pick(['Tarjeta', 'Transferencia', 'Débito automático']) } });
    }
  }
  const lucia = vetBy[1342];
  await prisma.tramite.create({ data: { numero: 'T-2026-0412', vetId: lucia.id, tipo: 'Renovación de habilitación de establecimiento', estado: 'Inspección programada', pasosJson: J(['Solicitud enviada', 'Documentación revisada', 'Inspección programada (12/11, 10:00)', 'Resolución de Comisión Directiva', 'Habilitación emitida']), actual: 2 } });
  await prisma.tramite.create({ data: { numero: 'T-2026-0377', vetId: lucia.id, tipo: 'Registro de especialidad · Dermatología', estado: 'Resuelto', pasosJson: J(['Solicitud enviada', 'Revisión de antecedentes', 'Aprobado por Comisión Directiva']), actual: 3 } });
  for (const [n, a, u, et, f] of [['Lautaro', 'Méndez', 'UMaza', 0, null], ['Franco', 'Aguilera', 'UNRC', 0, null], ['Agostina', 'Rivas', 'UNLPam', 1, 'Certificado de antecedentes'], ['Daniela', 'Echegaray', 'UMaza', 1, 'Certificado de antecedentes'], ['Brenda', 'Saavedra', 'UNRC', 2, null], ['Matías', 'Peralta', 'UBA', 3, null]])
    await prisma.inscripcion.create({ data: { nombre: n, apellido: a, universidad: u, etapa: et, faltante: f, dni: `4${int(0, 4)}.${int(100, 999)}.${int(100, 999)}`, email: `${n.toLowerCase()}@mail.com`, createdAt: day(-int(1, 20)) } });
  for (const [t, c, r, d] of [
    ['Masterclass: Distress Respiratorio Felino', 'Formación', 'Viernes 27 de noviembre. Manejo del gato con disnea y tips de diagnóstico y tratamiento, organizado por ForVet, con beneficio para matriculados.', -2],
    ['Convenio La Colonia: preventa de vacaciones 2026/27', 'Convenios', 'Preventa exclusiva para matriculados y su grupo familiar.', -2],
    ['Jornadas Veterinarias del Interior', 'Formación', 'Encuentro de actualización para colegas de los departamentos del interior provincial.', -10],
    ['Comunicado: Botiquín Veterinario', 'Comunicados', 'Información importante para matriculados.', -30],
    ['Jornada de capacitación para productores caprinos', 'Formación', 'Capacitación abierta a productores, junto a la subcomisión de Rumiantes.', -100],
    ['Oferta laboral en frigorífico', 'Bolsa de trabajo', 'Se busca médico/a veterinario/a para inspección en frigorífico.', -111],
  ]) await prisma.noticia.create({ data: { titulo: t, categoria: c, resumen: r, fecha: day(d) } });
  for (const [t, l, e, o, d] of [['Vacunación sin matrícula', 'Feria de Las Heras', 'En investigación', 'Anónima', -2], ['Establecimiento no habilitado', 'Maipú, Coquimbito', 'Recibida', 'Vecino/a', -6], ['Ejercicio ilegal (aplicación de antiparasitarios)', 'Guaymallén, Rodeo de la Cruz', 'Derivada a Tribunal de Disciplina', 'Matriculado/a', -14]])
    await prisma.denuncia.create({ data: { numero: `D-2026-00${80 + int(1, 7)}${d * -1}`, tipo: t, lugar: l, descripcion: '', estado: e, origen: o, createdAt: day(d) } });
  for (const [s, e, d, n, sp] of [[45, 'Leptospirosis canina', 'Guaymallén', 3, 'Perros'], [44, 'Brucelosis caprina', 'Lavalle', 5, 'Caprinos'], [44, 'Rabia (murciélago positivo)', 'Godoy Cruz', 1, 'Fauna'], [43, 'Parvovirus (brote en refugio)', 'Las Heras', 9, 'Perros'], [43, 'Sarna sarcóptica', 'San Rafael', 4, 'Perros']])
    await prisma.casoEpi.create({ data: { semana: s, evento: e, departamento: d, casos: n, especie: sp, vetId: pick(Object.values(vetBy)).id } });

  // ── Municipios que contratan el servicio de zoonosis
  const gc = await prisma.municipio.create({ data: { slug: 'godoy-cruz', nombre: 'Godoy Cruz', nombreCredencial: 'Identidad Sanitaria Animal', sigla: 'ISA', color: '#1f5e7a' } });
  const gm = await prisma.municipio.create({ data: { slug: 'guaymallen', nombre: 'Guaymallén', nombreCredencial: 'Credencial Mascota Guaymallén', sigla: 'CMG', color: '#2d6b5a' } });

  // ── Tutores y animales
  const tutores = [];
  const sofia = await prisma.tutor.create({ data: { dni: '35111456', nombre: 'Sofía Ríos', telefono: '261 555 1234', email: 'sofia.rios@mail.com', departamento: 'Godoy Cruz' } });
  tutores.push(sofia);
  for (let i = 0; i < NOMBRES.length; i++) tutores.push(await prisma.tutor.create({ data: { dni: String(28000000 + i * 371113), nombre: NOMBRES[i], telefono: `261 555 ${String(2000 + i * 37).slice(-4)}`, email: `${NOMBRES[i].split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@mail.com`, departamento: pick(['Capital', 'Godoy Cruz', 'Guaymallén', 'Las Heras', 'Capital', 'Godoy Cruz']) } }));

  let libN = 1000;
  const lib = esp => (esp === 'Equino' ? 'EQ-' : 'MZA-') + String(++libN).padStart(6, '0');
  const parque = estBy.e1;
  const clinicaDe = t => (t.departamento === 'Capital' || t.departamento === 'Godoy Cruz' || rnd() < 0.5 ? parque : estBy.e12);

  // Animales "estrella" de la demo
  const luna = await prisma.animal.create({ data: { libreta: 'MZA-000231', nombre: 'Luna', especie: 'Canino', raza: 'Mestiza', sexo: 'Hembra', nacimiento: new Date('2022-03-10'), pelaje: 'Atigrada', microchip: '032097000123456', castrado: true, tutorId: sofia.id, vetCabeceraId: lucia.id, municipioId: gc.id, credencialNro: 4217, peso: 10.2 } });
  const michi = await prisma.animal.create({ data: { libreta: 'MZA-000198', nombre: 'Michi', especie: 'Felino', raza: 'Europeo de pelo corto', sexo: 'Macho', nacimiento: new Date('2020-08-01'), pelaje: 'Gris', microchip: '032097000198877', castrado: true, tutorId: sofia.id, vetCabeceraId: vetBy[1301].id, municipioId: gc.id, credencialNro: 4218, peso: 4.8 } });
  const rocco = await prisma.animal.create({ data: { libreta: 'MZA-000145', nombre: 'Rocco', especie: 'Canino', raza: 'Bulldog francés', sexo: 'Macho', nacimiento: new Date('2021-01-20'), pelaje: 'Atigrado', castrado: false, tutorId: tutores[3].id, vetCabeceraId: lucia.id, mordedor: true, peso: 12.5 } });
  const tormenta = await prisma.animal.create({ data: { libreta: 'EQ-000017', nombre: 'Tormenta', especie: 'Equino', raza: 'Criollo', sexo: 'Hembra', nacimiento: new Date('2018-10-05'), pelaje: 'Zaina', microchip: '032098000555017', tutorId: tutores[5].id, vetCabeceraId: vetBy[1015].id } });
  const E = (animal, tipo, f, titulo, o = {}) => prisma.evento.create({ data: { animalId: animal.id, tipo, fecha: typeof f === 'number' ? day(f) : new Date(f), titulo, ...o } });
  const L = { vetId: lucia.id, estId: parque.id };
  await E(luna, 'vac', 0, 'Antirrábica', { ...L, detalle: 'Laboratorio de ejemplo · lote RB-24-0912', lote: 'RB-24-0912', sticker: 'S-1342-000231', proximo: day(365) });
  await E(luna, 'vac', -21, 'Séxtuple (refuerzo anual)', { ...L, detalle: 'Laboratorio de ejemplo · lote SX-26-311', proximo: day(344) });
  await E(luna, 'des', -21, 'Desparasitación interna', { ...L, detalle: 'Peso 10,2 kg', peso: 10.2, proximo: day(70) });
  await E(luna, 'con', -21, 'Control anual', { ...L, detalle: 'Sin hallazgos. Peso estable.', diagnostico: 'Paciente sano', peso: 10.2, temperatura: 38.6 });
  await E(luna, 'con', -159, 'Dermatitis leve en abdomen', { ...L, detalle: 'Se indica shampoo medicado y control en 15 días.', diagnostico: 'Dermatitis alérgica de contacto', tratamiento: 'Shampoo clorhexidina 2% cada 3 días', publico: false });
  await E(luna, 'via', -39, 'Certificado de viaje', { ...L, detalle: 'Certificado de salud para viajar · Chile' });
  await E(luna, 'cas', '2023-05-22', 'Castración (ovariohisterectomía)', { vetId: vetBy[1204].id, estId: parque.id, detalle: 'Sin complicaciones' });
  await E(luna, 'chip', '2022-06-15', 'Microchip colocado', { ...L, detalle: '032 097 000 123 456' });
  const F = { vetId: vetBy[1301].id, estId: estBy.e12.id };
  await E(michi, 'vac', -251, 'Triple felina', { ...F, proximo: day(114) });
  await E(michi, 'vac', -342, 'Antirrábica', { ...F, sticker: 'S-1301-000088', proximo: day(23) });
  await E(michi, 'des', -251, 'Desparasitación interna y externa', { ...F, proximo: day(-159) });
  await E(michi, 'cas', '2020-12-10', 'Castración', F);
  await E(rocco, 'con', -6, 'Otitis externa', { ...L, diagnostico: 'Otitis externa bacteriana', tratamiento: 'Limpieza y gotas óticas 10 días' });
  await E(rocco, 'inc', -178, 'Mordedura leve a otro perro en una plaza', { ...L, detalle: 'Sin lesiones a personas. Se recomienda bozal en espacios públicos.' });
  await E(rocco, 'vac', -424, 'Antirrábica', { vetId: vetBy[1188].id, estId: estBy.e2.id, proximo: day(-59) });
  const V = { vetId: vetBy[1015].id, estId: estBy.e5.id };
  await E(tormenta, 'vac', -80, 'Influenza equina', { ...V, proximo: day(102) });
  await E(tormenta, 'vac', -80, 'Encefalomielitis equina', { ...V, proximo: day(285) });
  await E(tormenta, 'lab', -90, 'AIE (anemia infecciosa equina): negativo', { ...V, detalle: 'Laboratorio de red de ejemplo · protocolo 26-4471', proximo: day(275) });
  await E(tormenta, 'chip', -220, 'Microchip colocado', { ...V, detalle: '032 098 000 555 017' });
  for (const [c, t] of [[parque, sofia], [estBy.e12, sofia], [parque, tutores[3]], [estBy.e5, tutores[5]]]) await prisma.cliente.upsert({ where: { estId_tutorId: { estId: c.id, tutorId: t.id } }, update: {}, create: { estId: c.id, tutorId: t.id } });

  // Pacientes generados para los consultorios
  const pacientes = [luna, rocco];
  for (let i = 1; i < tutores.length; i++) {
    const t = tutores[i], est = clinicaDe(t);
    await prisma.cliente.upsert({ where: { estId_tutorId: { estId: est.id, tutorId: t.id } }, update: {}, create: { estId: est.id, tutorId: t.id } });
    const n = int(1, 2);
    for (let k = 0; k < n; k++) {
      const gato = est.codigo === 'e12' || rnd() < 0.3;
      const a = await prisma.animal.create({ data: { libreta: lib('x'), nombre: gato ? pick(GATOS) : pick(PERROS), especie: gato ? 'Felino' : 'Canino', raza: gato ? pick(RAZAS_G) : pick(RAZAS_P), sexo: pick(['Macho', 'Hembra']), nacimiento: day(-int(200, 4000)), castrado: rnd() < 0.6, tutorId: t.id, vetCabeceraId: est.dtId, microchip: rnd() < 0.4 ? `032097${String(int(100000000, 999999999))}` : null, municipioId: t.departamento === 'Godoy Cruz' ? gc.id : t.departamento === 'Guaymallén' ? gm.id : null, peso: gato ? int(3, 6) : int(5, 32) } });
      if (a.municipioId) await prisma.animal.update({ where: { id: a.id }, data: { credencialNro: 4219 + a.id } });
      const W = { vetId: est.dtId, estId: est.id };
      const ar = -int(10, 420);
      await E(a, 'vac', ar, 'Antirrábica', { ...W, proximo: day(ar + 365), sticker: `S-${est.codigo === 'e1' ? 1342 : 1301}-${String(100 + a.id).padStart(6, '0')}` });
      const dz = -int(5, 120);
      await E(a, 'des', dz, 'Desparasitación interna', { ...W, proximo: day(dz + 90) });
      for (let c = 0; c < int(1, 3); c++) await E(a, 'con', -int(3, 300), pick(['Control general', 'Gastroenteritis', 'Otitis', 'Control de piel', 'Cojera miembro posterior', 'Control post vacuna']), { ...W, diagnostico: 'Ver evolución', peso: a.peso, temperatura: 38 + rnd() });
      if (est.id === parque.id) pacientes.push(a);
    }
  }

  // ── Turnos de la semana en el Consultorio Parque (y en Felinos)
  const svP = servBy[parque.id], diego = vetBy[1204];
  for (let d = -14; d <= 6; d++) {
    const dd = day(d);
    if (dd.getDay() === 0) continue;
    const slots = dd.getDay() === 6 ? [[9, 0], [9, 30], [10, 30], [11, 0], [12, 0]] : [[9, 0], [9, 30], [10, 0], [11, 30], [12, 0], [17, 0], [17, 30], [18, 30], [19, 0], [20, 0]];
    for (const [hh, mm] of slots) {
      if (rnd() < 0.35) continue;
      const a = pick(pacientes), s = pick(svP), past = d < 0 || (d === 0 && hh < new Date().getHours());
      await prisma.turno.create({ data: { estId: parque.id, vetId: rnd() < 0.7 ? lucia.id : diego.id, animalId: a.id, servicioId: s.id, duracionMin: s.duracionMin, inicio: at(dd, hh, mm), estado: past ? pick(['atendido', 'atendido', 'atendido', 'ausente']) : pick(['confirmado', 'confirmado', 'pendiente']), origen: pick(['web', 'manual', 'app', 'web']) } });
    }
  }
  for (const [e, svc] of Object.entries(servBy)) {
    if (Number(e) === parque.id) continue;
    const est = Object.values(estBy).find(x => x.id === Number(e));
    for (let k = 0; k < 6; k++) { const dd = day(int(1, 5)); if (dd.getDay() === 0) continue; await prisma.turno.create({ data: { estId: est.id, vetId: est.dtId, inicio: at(dd, pick([9, 10, 11, 17, 18]), pick([0, 30])), servicioId: pick(svc).id, estado: 'confirmado', origen: 'web', tutorNombre: pick(NOMBRES), mascota: pick(PERROS) } }); }
  }

  // ── Inventario / pet shop del Consultorio Parque
  const PROD = [
    ['Alimento perro adulto 15 kg', 'Alimentos', 52000, 38000, 12, 4], ['Alimento perro cachorro 3 kg', 'Alimentos', 16500, 11800, 9, 4], ['Alimento gato adulto 7,5 kg', 'Alimentos', 41000, 30000, 6, 3], ['Alimento renal felino 2 kg', 'Alimentos', 24000, 17500, 2, 3],
    ['Pipeta antipulgas perro 10–20 kg', 'Antiparasitarios', 9800, 6200, 30, 10], ['Comprimido antiparasitario interno', 'Antiparasitarios', 3200, 1900, 55, 20], ['Collar antiparasitario', 'Antiparasitarios', 14500, 9800, 3, 5],
    ['Vacuna antirrábica (dosis)', 'Vacunas', 4200, 2600, 40, 15, 160], ['Vacuna séxtuple (dosis)', 'Vacunas', 7800, 5100, 18, 10, 45], ['Vacuna triple felina (dosis)', 'Vacunas', 7400, 4900, 7, 8, 90],
    ['Amoxicilina + clavulánico 250 mg x 10', 'Medicamentos', 8900, 5600, 14, 5, 300], ['Meloxicam 1 mg x 10', 'Medicamentos', 5600, 3300, 20, 6, 400], ['Shampoo clorhexidina 2%', 'Higiene', 11200, 7400, 8, 4], ['Gotas óticas', 'Medicamentos', 7300, 4600, 4, 5, 200],
    ['Correa reforzada', 'Accesorios', 9500, 5200, 11, 3], ['Cama mediana', 'Accesorios', 32000, 21000, 4, 2], ['Rascador gatos', 'Accesorios', 27500, 18000, 2, 2], ['Chapita identificatoria con QR', 'Accesorios', 6500, 2800, 40, 10],
  ];
  const prodP = [];
  for (const [n, c, p, co, st, mi, ven] of PROD) prodP.push(await prisma.producto.create({ data: { estId: parque.id, nombre: n, categoria: c, sku: `PQ-${String(prodP.length + 1).padStart(4, '0')}`, precio: p, costo: co, stock: st, stockMin: mi, vence: ven ? day(ven) : null } }));
  for (const [n, c, p, co, st, mi] of PROD.filter(x => x[1] !== 'Accesorios').slice(0, 8)) await prisma.producto.create({ data: { estId: estBy.e12.id, nombre: n, categoria: c, sku: `FE-${int(1000, 9999)}`, precio: p, costo: co, stock: st, stockMin: mi } });

  // ── Proveedores, compras y cuenta corriente
  const provs = [];
  for (const [n, cuit, rubro] of [['Distribuidora Cuyo Pet SRL', '30-71234567-8', 'Alimentos y accesorios'], ['Droguería Veterinaria Andina SA', '30-70987654-3', 'Medicamentos y vacunas'], ['Laboratorio de ejemplo SA', '30-69999888-1', 'Vacunas']])
    provs.push(await prisma.proveedor.create({ data: { estId: parque.id, nombre: n, cuit, rubro, telefono: `261 4${int(100000, 999999)}` } }));
  for (let i = 0; i < 6; i++) {
    const pr = provs[i % 3], f = day(-int(3, 80)), total = int(120, 600) * 1000;
    await prisma.compra.create({ data: { estId: parque.id, proveedorId: pr.id, fecha: f, comprobante: `Factura A 0003-${String(int(1000, 9999)).padStart(8, '0')}`, total, itemsJson: '[]' } });
    await prisma.movCC.create({ data: { estId: parque.id, proveedorId: pr.id, fecha: f, concepto: 'Compra de mercadería', debe: total } });
    if (i < 4) await prisma.movCC.create({ data: { estId: parque.id, proveedorId: pr.id, fecha: day(-int(1, 3)), concepto: 'Pago a proveedor', haber: total } });
  }

  // ── Ventas de los últimos 6 meses (facturación, caja, cuentas corrientes)
  const clientesP = await prisma.cliente.findMany({ where: { estId: parque.id } });
  let numero = 1200;
  for (let d = -180; d <= 0; d++) {
    const dd = day(d);
    if (dd.getDay() === 0) continue;
    const n = d === 0 ? 4 : int(1, 5);
    for (let k = 0; k < n; k++) {
      const items = [];
      if (rnd() < 0.7) { const s = pick(svP); items.push({ servicioId: s.id, descripcion: s.nombre, cantidad: 1, precio: s.precio }); }
      if (rnd() < 0.6) { const p = pick(prodP); items.push({ productoId: p.id, descripcion: p.nombre, cantidad: int(1, 2), precio: p.precio }); }
      if (!items.length) continue;
      const total = items.reduce((s, x) => s + x.cantidad * x.precio, 0);
      const cli = rnd() < 0.75 ? pick(clientesP) : null;
      const medio = cli && rnd() < 0.15 ? 'Cuenta corriente' : pick(['Efectivo', 'Tarjeta', 'Transferencia', 'Mercado Pago', 'Tarjeta']);
      const comp = pick(['Factura B', 'Factura B', 'Factura C', 'Ticket']);
      const v = await prisma.venta.create({ data: { estId: parque.id, clienteId: cli?.id, numero: ++numero, comprobante: comp, fecha: at(dd, int(9, 20), int(0, 59)), total, medioPago: medio, cae: comp.startsWith('Factura') ? `7${String(10 ** 12 + numero * 7919).slice(0, 13)}` : null, items: { create: items } } });
      if (medio === 'Cuenta corriente') {
        await prisma.movCC.create({ data: { estId: parque.id, clienteId: cli.id, fecha: v.fecha, concepto: `${comp} N° ${String(v.numero).padStart(8, '0')}`, debe: total } });
        if (d < -20 && rnd() < 0.7) await prisma.movCC.create({ data: { estId: parque.id, clienteId: cli.id, fecha: day(d + int(5, 15)), concepto: 'Cobro · Transferencia', haber: total } });
      }
    }
  }

  // ── Mensajes con tutores
  const conv = [[sofia, [[0, 'Hola, ¿Luna puede bañarse después de la vacuna?', -1], [1, 'Hola Sofía. Esperá 48 h después de la vacuna y después sí, con normalidad.', -1], [0, '¡Gracias! ¿Me reservan el control de Michi?', 0]]], [tutores[3], [[1, 'Hola Diego, ¿cómo sigue Rocco con las gotas? Si mañana sigue rascándose traelo.', -2], [0, 'Mucho mejor, gracias. Lo llevo el jueves.', -1]]], [tutores[6], [[0, '¿Tienen alimento renal para gatos?', 0]]]];
  for (const [t, ms] of conv) for (const [desde, texto, d] of ms) await prisma.mensaje.create({ data: { estId: parque.id, tutorId: t.id, desdeClinica: !!desde, texto, fecha: at(day(d), int(9, 19), int(0, 59)), leido: !!desde || d < 0 } });

  // ── Recetas
  await prisma.receta.create({ data: { codigo: 'RV-2026-000412', animalId: rocco.id, vetId: lucia.id, tipo: 'Antimicrobiano', itemsJson: J([{ medicamento: 'Amoxicilina + ácido clavulánico 250 mg', posologia: '1 comprimido cada 12 h durante 10 días', cantidad: '20 comprimidos' }]), fecha: day(-6), vence: day(24) } });
  await prisma.receta.create({ data: { codigo: 'RV-2026-000398', animalId: luna.id, vetId: lucia.id, tipo: 'Común', itemsJson: J([{ medicamento: 'Shampoo medicado con clorhexidina 2%', posologia: 'Un baño cada 3 días durante 2 semanas', cantidad: '1 frasco' }]), estado: 'Dispensada', fecha: day(-21), vence: day(9), dispensadaEn: day(-21), farmacia: 'Farmacia veterinaria de ejemplo · Capital' } });

  // ── Zoonosis municipal: atenciones, campañas, mordeduras, peligrosos
  for (const mu of [gc, gm]) {
    const camp = [];
    for (const [n, tp, l, d, st] of [['Antirrábica gratuita · B° La Gloria', 'Antirrábica', 'Plaza B° La Gloria', -40, 'Cerrada'], ['Castración masiva · Delegación Este', 'Castración', 'Delegación municipal Este', -15, 'Cerrada'], ['Antirrábica · Feria del sábado', 'Antirrábica', 'Feria municipal', 6, 'Programada']])
      camp.push(await prisma.campania.create({ data: { municipioId: mu.id, nombre: n, tipo: tp, lugar: l, fecha: day(d), estado: st } }));
    for (let i = 0; i < 70; i++) {
      const t = await prisma.tutor.create({ data: { dni: String(40000000 + mu.id * 100000 + i * 13), nombre: `${pick(['Ana', 'Luis', 'Marta', 'Jorge', 'Elena', 'Raúl', 'Nora', 'Oscar', 'Inés', 'Hugo'])} ${pick(['Pérez', 'López', 'Gil', 'Vera', 'Ruiz', 'Sosa', 'Arce', 'Ponce'])}`, departamento: mu.nombre } });
      const gato = rnd() < 0.3;
      const a = await prisma.animal.create({ data: { libreta: lib('x'), nombre: gato ? pick(GATOS) : pick(PERROS), especie: gato ? 'Felino' : 'Canino', raza: 'Mestizo', sexo: pick(['Macho', 'Hembra']), nacimiento: day(-int(200, 3000)), tutorId: t.id, municipioId: mu.id, credencialNro: 5000 + mu.id * 1000 + i, castrado: rnd() < 0.5, peligroso: !gato && rnd() < 0.05 } });
      const f = -int(1, 360), c = f < -30 && f > -50 ? camp[0] : f < -10 && f > -20 ? camp[1] : null;
      await E(a, 'vac', f, 'Antirrábica', { origen: c ? 'campania' : 'zoonosis', municipioId: mu.id, campaniaId: c?.id, proximo: day(f + 365) });
      if (rnd() < 0.35) await E(a, 'cas', -int(1, 360), 'Castración', { origen: 'zoonosis', municipioId: mu.id });
    }
    const perros = await prisma.animal.findMany({ where: { municipioId: mu.id, especie: 'Canino' }, take: 12 });
    for (let i = 0; i < 6; i++) {
      const a = perros[i * 2], f = day(-int(1, 200));
      await prisma.mordedura.create({ data: { municipioId: mu.id, animalId: a.id, fecha: f, lugar: pick(['Vía pública', 'Domicilio del tutor', 'Plaza', 'Escuela']), victima: pick(['Menor de 9 años', 'Adulto, vecino', 'Repartidor', 'Adulta mayor']), descripcion: 'Lesión leve en miembro inferior.', estado: f > day(-10) ? 'En observación' : 'Cerrada', observacionHasta: new Date(+f + 10 * 864e5) } });
      await prisma.animal.update({ where: { id: a.id }, data: { mordedor: true } });
    }
  }

  // ── Usuarios de la demo (contraseña: demo1234)
  await prisma.user.create({ data: { email: 'admin@demo.colvet', password: pass, nombre: 'Mesa de Entradas', rol: 'ADMIN' } });
  await prisma.user.create({ data: { email: 'lucia.ferreyra@demo.colvet', password: pass, nombre: 'Dra. Lucía Ferreyra', rol: 'VET', vetId: lucia.id } });
  await prisma.user.create({ data: { email: 'diego.ojeda@demo.colvet', password: pass, nombre: 'Dr. Diego Ojeda', rol: 'VET', vetId: diego.id } });
  await prisma.user.create({ data: { email: 'micaela.arancibia@demo.colvet', password: pass, nombre: 'Dra. Micaela Arancibia', rol: 'VET', vetId: vetBy[1301].id } });
  await prisma.user.create({ data: { email: 'zoonosis@godoycruz.demo', password: pass, nombre: 'Zoonosis Godoy Cruz', rol: 'MUNICIPIO', municipioId: gc.id } });
  await prisma.user.create({ data: { email: 'zoonosis@guaymallen.demo', password: pass, nombre: 'Zoonosis Guaymallén', rol: 'MUNICIPIO', municipioId: gm.id } });
  await prisma.user.create({ data: { email: 'sofia.rios@demo.colvet', password: pass, nombre: 'Sofía Ríos', rol: 'TUTOR', tutorId: sofia.id } });

  const counts = await Promise.all(['vet', 'establecimiento', 'animal', 'evento', 'turno', 'venta', 'producto', 'mensaje'].map(m => prisma[m].count().then(c => `${m}: ${c}`)));
  console.log('Seed OK →', counts.join(' · '));
}

// En Node se ejecuta como script. En el navegador (versión de la demo para Claude) se importa y se llama a main().
export { main };
if (typeof window === 'undefined') main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
