// Normas y protocolos sobre identificación y libreta sanitaria de animales que usa la portada y /identidad-animal.
// Resumen orientativo para la demo: antes de usarlo en producción hay que validar el texto vigente con el Colegio.
export const ESTADO = {
  vigente: ['Vigente', 'b-ok'],
  discusion: ['En discusión', 'b-warn'],
  plazo: ['Con plazo', 'b-grey'],
  protocolo: ['Protocolo', 'b-grey'],
};

export const NORMAS = [
  {
    k: 'ley7825', estado: 'vigente', ambito: 'Mendoza',
    t: 'Ejercicio profesional veterinario (Ley 7825)',
    d: 'Sólo un/a veterinario/a con matrícula vigente en el Colegio puede vacunar, certificar y recetar.',
    hace: 'Cada registro de la libreta queda firmado con la matrícula, y la firma se valida en el momento contra el padrón.',
    demo: ['/verificar/1342', 'Verificar una matrícula'],
  },
  {
    k: 'luscyf', estado: 'vigente', ambito: 'Nacional · adhesión voluntaria',
    t: 'Libreta Única Sanitaria Canina y Felina (LUSCyF)',
    d: 'Libreta en papel con stickers numerados de vacunación. En Mendoza su uso es voluntario.',
    hace: 'La versión digital guarda el número de sticker de cada vacuna, así que convive con la libreta en papel.',
    demo: ['/libreta/MZA-000231', 'Ver la libreta de Luna'],
  },
  {
    k: 'rupac', estado: 'discusion', ambito: 'Mendoza · Legislatura',
    t: 'Registro provincial de animales de compañía (proyecto)',
    d: 'Proyecto en comisión en el Senado provincial: microchip desde los 3 meses, colocado y validado por matriculados; libreta digital asociada al chip; registro de mordeduras. Prevé 180 días para reglamentar y 365 para registrar.',
    hace: 'Ya usa el chip como identificador, lo valida un/a matriculado/a y registra las mordeduras. Si la ley se aprueba, la exportación al registro sale de los mismos datos.',
    demo: ['/libreta/MZA-000198', 'Ver un animal con chip'],
  },
  {
    k: 'lsed', estado: 'plazo', ambito: 'Nacional · SENASA',
    t: 'Libreta Sanitaria Equina Digital (SENASA)',
    d: 'Reemplaza a la libreta equina en papel: microchip para los equinos que se trasladan desde marzo de 2027, y desde el 1/1/2028 sólo vale la digital.',
    hace: 'Módulo equino con chip, anemia infecciosa y movimientos. Queda pendiente la homologación con SENASA.',
    demo: ['/libreta/EQ-000017', 'Ver a Tormenta (equino)'],
  },
  {
    k: 'cvi', estado: 'vigente', ambito: 'Nacional · SENASA',
    t: 'Certificado para viajar con mascotas',
    d: 'Para viajar al exterior, SENASA emite el Certificado Veterinario Internacional a partir del certificado de salud firmado por un/a veterinario/a matriculado/a.',
    hace: 'El certificado de salud se arma con las vacunas de la libreta y lleva QR para verificar la firma.',
    demo: ['/viajar', 'Viajar con tu mascota'],
  },
  {
    k: 'mordedura', estado: 'protocolo', ambito: 'Salud pública',
    t: 'Mordeduras: observación antirrábica de 10 días',
    d: 'El animal que mordió queda en observación 10 días bajo control veterinario, y se avisa a zoonosis.',
    hace: 'Al registrar una mordedura, el animal queda marcado, empieza la cuenta de 10 días y el municipio la ve en su panel.',
    demo: ['/muni/mordeduras', 'Panel de mordeduras', 'muni'],
  },
  {
    k: 'recetas', estado: 'vigente', ambito: 'Nacional y provincial',
    t: 'Recetas veterinarias y registro de prescriptores',
    d: 'Los psicotrópicos, los antimicrobianos y el cannabis de uso veterinario exigen receta de un/a matriculado/a. El cannabis también exige estar inscripto en el registro de prescriptores.',
    hace: 'Receta con QR que la farmacia verifica y en la que registra la dispensa. Tiene la marca de prescriptor habilitado.',
    demo: ['/receta/RV-2026-000412', 'Verificar una receta'],
  },
  {
    k: 'caba', estado: 'discusion', ambito: 'Otras jurisdicciones',
    t: 'Proyectos similares en otras jurisdicciones',
    d: 'En CABA y otras provincias se discuten registros con microchip y libreta digital. Los datos deberían poder pasar de una jurisdicción a otra.',
    hace: 'Usa el estándar de chip ISO 11784/11785 y una API abierta, así que un animal que se muda no tiene que registrarse de nuevo.',
    demo: ['/datos', 'Datos abiertos y API'],
  },
];

// Ciclo de vida de la identidad del animal.
export const CICLO = [
  { n: '01', t: 'Alta', d: 'Un/a veterinario/a matriculado/a coloca o lee el microchip y abre la libreta. El animal recibe un número único y un QR.', demo: 'Hoy en la demo', ok: true },
  { n: '02', t: 'Cuidados', d: 'Vacunas, desparasitaciones, castración y controles. Cada registro va firmado y queda en la misma libreta, aunque la familia cambie de veterinaria.', demo: 'Hoy en la demo', ok: true },
  { n: '03', t: 'Credencial', d: 'La familia lleva la credencial en el celular (con la marca del municipio si este usa el servicio). El QR muestra sólo lo público.', demo: 'Hoy en la demo', ok: true },
  { n: '04', t: 'Cambios', d: 'Aviso de extravío, mudanza, cambio de tutor/a. La transferencia la confirman las dos partes.', demo: 'Extravío en la demo · transferencia propuesta', ok: false },
  { n: '05', t: 'Baja', d: 'El fallecimiento lo registra un/a veterinario/a. La libreta queda cerrada y se conserva para la estadística.', demo: 'Propuesta', ok: false },
];

// Qué ve cada actor.
export const VISIBILIDAD = [
  ['Cualquiera que escanea el QR', 'Nombre, especie, vacunas vigentes, parte del número de chip y la matrícula de quien firmó.'],
  ['La familia (app del tutor/a)', 'Toda la libreta, turnos, recordatorios y mensajes con su veterinaria.'],
  ['Veterinarios/as matriculados/as', 'La historia clínica completa, incluidos los registros que no son públicos.'],
  ['Zoonosis del municipio', 'Vacunación antirrábica, castraciones, mordeduras y campañas de su territorio.'],
  ['Registro provincial (si se aprueba)', 'Identificación del animal y del tutor/a, en el formato que fije la reglamentación.'],
];
