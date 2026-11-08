// Formatos es-AR y constantes de dominio compartidas.
export const money = n => '$ ' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
export const fdate = d => (d ? new Date(d).toLocaleDateString('es-AR') : '—');
export const fdt = d => (d ? new Date(d).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const ftime = d => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
export const fday = d => new Date(d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
export const isoDate = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
export const chipFmt = c => (c ? String(c).replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ') : '');
export const ini = n => String(n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const edad = nac => { const y = (Date.now() - new Date(nac)) / 3.156e10; if (y < 1) { const m = Math.max(1, Math.round(y * 12)); return `${m} ${m === 1 ? 'mes' : 'meses'}`; } const a = Math.floor(y); return `${a} ${a === 1 ? 'año' : 'años'}`; };
export const telFmt = t => (t && t.length === 10 ? `${t.slice(0, 3)} ${t.slice(3, 6)}-${t.slice(6)}` : t && t.length === 7 ? `0261 ${t.slice(0, 3)}-${t.slice(3)}` : t);

export const DEPTOS = ['Capital', 'Godoy Cruz', 'Guaymallén', 'Las Heras', 'Luján de Cuyo', 'Maipú', 'Lavalle', 'San Martín', 'Rivadavia', 'Junín', 'Santa Rosa', 'La Paz', 'Tunuyán', 'Tupungato', 'San Carlos', 'San Rafael', 'General Alvear', 'Malargüe'];
export const ZONAS = ['Gran Mendoza', 'Este', 'Valle de Uco', 'Sur'];
export const ESPECIES = ['Perros', 'Gatos', 'Exóticos', 'Equinos', 'Bovinos', 'Caprinos y ovinos', 'Aves', 'Porcinos'];
export const ESPECIALIDADES = ['Clínica de pequeños animales', 'Cirugía', 'Dermatología', 'Cardiología', 'Diagnóstico por imágenes', 'Oftalmología', 'Medicina felina', 'Animales exóticos y no convencionales', 'Equinos', 'Rumiantes', 'Producción caprina', 'Fisioterapia y rehabilitación', 'Anestesiología', 'Salud pública y bromatología', 'Etología y comportamiento'];

// Tipos de registro de la libreta / historia clínica
export const EVT = {
  vac: ['VAC', 'Vacuna', '#2d6b5a'], des: ['DES', 'Desparasitación', '#3b6ea5'], cas: ['CAS', 'Castración', '#7c1c6f'], chip: ['CHIP', 'Microchip', '#3f3a36'],
  con: ['CON', 'Consulta', '#8a6d3b'], lab: ['LAB', 'Análisis', '#5b5b9a'], inc: ['INC', 'Incidente / mordedura', '#c0392b'], via: ['VIAJE', 'Certificado de viaje', '#94580a'], cir: ['CIR', 'Cirugía', '#4f1047'],
};
export const estadoCls = c => ({ al_dia: 'b-ok', por_vencer: 'b-warn', vencida: 'b-bad', sin: 'b-bad' }[c] || 'b-grey');
export const guardiaColor = e => (e.guardia === 'activa' ? '#c0392b' : e.guardia === 'pasiva' ? '#e08a00' : e.turnosOnline ? '#2d6b5a' : '#7c1c6f');
export const statusCls = s => ({ activa: 'b-ok', abierto: 'b-ok', pasiva: 'b-warn' }[s?.code] || 'b-grey');
