// Mapa Leaflet (tiles de CARTO/OSM). Marcadores por tipo: guardia activa, pasiva, turnos online, establecimiento.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { guardiaColor } from '../lib/format.js';
import { CLAUDE } from '../lib/base.js';

// Dentro de Claude el visor no deja cargar imágenes externas (los mosaicos del mapa): se dibuja un fondo propio
// con los departamentos de Mendoza como referencia y los marcadores reales encima.
const ZONAS_LL = [['Gran Mendoza', -32.93, -68.95], ['Zona Este', -33.2, -68.2], ['Valle de Uco', -33.6, -69.45], ['Zona Sur', -34.9, -68.6]];
const DEPTOS_LL = [['Capital', -32.889, -68.846], ['Godoy Cruz', -32.935, -68.86], ['Guaymallén', -32.9, -68.785], ['Las Heras', -32.85, -68.835], ['Luján de Cuyo', -33.04, -68.88], ['Maipú', -32.98, -68.77], ['Lavalle', -32.72, -68.59], ['San Martín', -33.08, -68.47], ['Rivadavia', -33.19, -68.46], ['Junín', -33.14, -68.5], ['Santa Rosa', -33.25, -68.15], ['La Paz', -33.46, -67.55], ['Tunuyán', -33.58, -69.02], ['Tupungato', -33.37, -69.15], ['San Carlos', -33.77, -69.05], ['San Rafael', -34.62, -68.33], ['General Alvear', -34.98, -67.7], ['Malargüe', -35.47, -69.58]];

const kind = e => (e.guardia === 'activa' ? '24' : e.guardia === 'pasiva' ? 'P' : e.turnosOnline ? 'T' : '');

export default function MapView({ items, selected, onSelect, popup, height = '100%', center = [-32.93, -68.82], zoom = 11, scrollWheel = true, circles }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), marks = useRef({});
  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: scrollWheel }).setView(center, zoom);
    if (CLAUDE) {
      el.current.classList.add('map-offline');
      const label = (n, lat, lng, cls) => L.marker([lat, lng], { interactive: false, keyboard: false, icon: L.divIcon({ className: cls, html: n, iconSize: null }) });
      const zonas = L.layerGroup(ZONAS_LL.map(([n, lat, lng]) => label(n, lat, lng, 'dep-label zona-label')));
      const deptos = L.layerGroup(DEPTOS_LL.map(([n, lat, lng]) => label(n, lat, lng, 'dep-label')));
      const sync = () => { const z = map.current.getZoom(); if (z >= 9) { zonas.remove(); deptos.addTo(map.current); } else { deptos.remove(); zonas.addTo(map.current); } };
      map.current.on('zoomend', sync); sync();
      map.current.attributionControl.setPrefix('Vista sin calles (dentro de Claude)');
    } else L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current.stop(); map.current.off(); map.current.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!map.current) return;
    layer.current.clearLayers(); marks.current = {};
    (items || []).forEach(e => {
      const icon = L.divIcon({ className: '', html: `<div class="mk" style="background:${guardiaColor(e)}"><b>${kind(e)}</b></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
      const m = L.marker([e.lat, e.lng], { icon }).addTo(layer.current);
      if (popup) m.bindPopup(() => popup(e));
      m.on('click', () => onSelect?.(e));
      marks.current[e.codigo] = m;
    });
    (circles || []).forEach(c => L.circle(c.ll, { radius: c.r, color: c.color || '#c0392b', fillColor: c.color || '#c0392b', fillOpacity: 0.25, weight: 1 }).addTo(layer.current).bindPopup(c.label));
    if (items?.length > 1 && !circles) map.current.fitBounds(L.latLngBounds(items.map(e => [e.lat, e.lng])).pad(0.15), { maxZoom: 13, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, circles]);
  useEffect(() => {
    const m = selected && marks.current[selected];
    if (m && map.current) { map.current.setView(m.getLatLng(), 14); m.openPopup(); }
  }, [selected]);
  return <div ref={el} style={{ height, width: '100%', background: '#e9e4e8' }} />;
}

export function locate(cb) {
  const fallback = () => cb([-32.8895, -68.8458], false);
  if (!navigator.geolocation) return fallback();
  navigator.geolocation.getCurrentPosition(p => cb([p.coords.latitude, p.coords.longitude], true), fallback, { timeout: 4000 });
}
export function dist(a, b) {
  const R = 6371, dLa = ((b[0] - a[0]) * Math.PI) / 180, dLo = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
