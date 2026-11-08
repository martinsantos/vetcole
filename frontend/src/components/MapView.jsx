// Mapa Leaflet (tiles de CARTO/OSM). Marcadores por tipo: guardia activa, pasiva, turnos online, establecimiento.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { guardiaColor } from '../lib/format.js';

const kind = e => (e.guardia === 'activa' ? '24' : e.guardia === 'pasiva' ? 'P' : e.turnosOnline ? 'T' : '');

export default function MapView({ items, selected, onSelect, popup, height = '100%', center = [-32.93, -68.82], zoom = 11, scrollWheel = true, circles }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), marks = useRef({});
  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: scrollWheel }).setView(center, zoom);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    layer.current.clearLayers(); marks.current = {};
    (items || []).forEach(e => {
      const icon = L.divIcon({ className: '', html: `<div class="mk" style="background:${guardiaColor(e)}"><b>${kind(e)}</b></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
      const m = L.marker([e.lat, e.lng], { icon }).addTo(layer.current);
      if (popup) m.bindPopup(() => popup(e));
      m.on('click', () => onSelect?.(e));
      marks.current[e.codigo] = m;
    });
    (circles || []).forEach(c => L.circle(c.ll, { radius: c.r, color: c.color || '#c0392b', fillColor: c.color || '#c0392b', fillOpacity: 0.25, weight: 1 }).addTo(layer.current).bindPopup(c.label));
    if (items?.length > 1 && !circles) map.current.fitBounds(L.latLngBounds(items.map(e => [e.lat, e.lng])).pad(0.15), { maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, circles]);
  useEffect(() => {
    const m = selected && marks.current[selected];
    if (m) { map.current.setView(m.getLatLng(), 14); m.openPopup(); }
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
