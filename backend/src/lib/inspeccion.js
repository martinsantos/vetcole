// Formulario de revisión de establecimientos veterinarios. Cada ítem se responde Cumple / No cumple / No aplica.
// Los ítems críticos que no se cumplen impiden la acreditación; los demás dejan observaciones con plazo de corrección.
// Es un modelo de demo para validar con el Colegio y su reglamento de habilitación de establecimientos.
export const CHECKLIST = [
  { id: 'doc', titulo: 'Documentación', items: [
    { id: 'doc_hab', t: 'Habilitación municipal del local vigente y a la vista', critico: true },
    { id: 'doc_dt', t: 'Director/a técnico/a con matrícula vigente en el Colegio', critico: true, auto: 'dt' },
    { id: 'doc_contrato', t: 'Contrato o declaración jurada de dirección técnica presentada' },
    { id: 'doc_hc', t: 'Historias clínicas o libreta digital al día' },
    { id: 'doc_seguro', t: 'Seguro de responsabilidad civil profesional' },
  ] },
  { id: 'ins', titulo: 'Instalaciones', items: [
    { id: 'ins_espera', t: 'Sala de espera separada del área de atención' },
    { id: 'ins_consultorio', t: 'Consultorio con camilla y superficies lavables', critico: true },
    { id: 'ins_agua', t: 'Agua fría y caliente en el área de atención', critico: true },
    { id: 'ins_luz', t: 'Iluminación y ventilación adecuadas' },
    { id: 'ins_internacion', t: 'Internación en sector separado (si ofrece internación)' },
    { id: 'ins_quirofano', t: 'Quirófano exclusivo y equipado (si realiza cirugías)', critico: true },
  ] },
  { id: 'bio', titulo: 'Bioseguridad', items: [
    { id: 'bio_residuos', t: 'Gestión de residuos patogénicos con operador habilitado', critico: true },
    { id: 'bio_corto', t: 'Descartadores para cortopunzantes' },
    { id: 'bio_frio', t: 'Cadena de frío de vacunas con registro de temperatura', critico: true },
    { id: 'bio_limpieza', t: 'Protocolo de limpieza y desinfección' },
  ] },
  { id: 'med', titulo: 'Medicamentos', items: [
    { id: 'med_senasa', t: 'Productos con registro SENASA y dentro de su vencimiento', critico: true },
    { id: 'med_psico', t: 'Psicotrópicos y estupefacientes bajo llave y con registro', critico: true },
    { id: 'med_recetas', t: 'Recetas archivadas o emitidas en forma electrónica' },
  ] },
  { id: 'pub', titulo: 'Atención al público', items: [
    { id: 'pub_oblea', t: 'Oblea o cartel del Colegio visible desde el exterior' },
    { id: 'pub_matricula', t: 'Matrícula de los profesionales exhibida' },
    { id: 'pub_horarios', t: 'Horarios de atención y guardia informados' },
  ] },
];
export const ITEMS = CHECKLIST.flatMap(s => s.items.map(i => ({ ...i, seccion: s.titulo })));

// Resultado según las respuestas: { itemId: { r: 'si' | 'no' | 'na', obs } }
export function evaluar(resp = {}) {
  const faltan = ITEMS.filter(i => !resp[i.id]?.r);
  const criticos = ITEMS.filter(i => i.critico && resp[i.id]?.r === 'no');
  const obs = ITEMS.filter(i => !i.critico && resp[i.id]?.r === 'no');
  const resultado = criticos.length ? 'No acreditado' : obs.length ? 'Acreditado con observaciones' : 'Acreditado';
  return { completo: !faltan.length, faltan: faltan.length, criticos: criticos.map(i => i.t), observaciones: obs.map(i => i.t), resultado, plazoDias: criticos.length ? 60 : obs.length ? 30 : null };
}
