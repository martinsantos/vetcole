// Ilustraciones propias (SVG) de animales para la portada y las páginas públicas.
// Se dibujan con formas simples y la paleta de la demo; pesan poco y funcionan sin cargar imágenes externas.
const INK = '#2a2420';

function Frame({ bg, size, title, children, round = true }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={title} style={{ display: 'block', maxWidth: '100%', height: 'auto' }}>
      {round ? <circle cx="100" cy="100" r="100" fill={bg} /> : <rect width="200" height="200" rx="28" fill={bg} />}
      {children}
    </svg>
  );
}

export const Perro = ({ size = 160, bg = '#e3efe9', fur = '#c98b52', dark = '#7a4a26' }) => (
  <Frame bg={bg} size={size} title="Perro">
    <path d="M56 66 C30 74 24 126 44 144 C58 156 70 134 70 112 Z" fill={dark} />
    <path d="M144 66 C170 74 176 126 156 144 C142 156 130 134 130 112 Z" fill={dark} />
    <ellipse cx="100" cy="104" rx="50" ry="56" fill={fur} />
    <ellipse cx="80" cy="90" rx="17" ry="19" fill={dark} opacity=".28" />
    <ellipse cx="100" cy="130" rx="30" ry="24" fill="#f4e3cf" />
    <circle cx="81" cy="94" r="6.5" fill={INK} /><circle cx="119" cy="94" r="6.5" fill={INK} />
    <circle cx="83" cy="92" r="2" fill="#fff" /><circle cx="121" cy="92" r="2" fill="#fff" />
    <path d="M89 116 Q100 109 111 116 Q107 127 100 128 Q93 127 89 116 Z" fill={INK} />
    <path d="M100 128 V135 M100 135 Q91 142 84 137 M100 135 Q109 142 116 137" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M94 139 Q100 152 106 139 Z" fill="#e8737a" />
  </Frame>
);

export const Gato = ({ size = 160, bg = '#f2eaf0', fur = '#8f8a86', dark = '#5f5a57' }) => (
  <Frame bg={bg} size={size} title="Gato">
    <path d="M54 82 L62 30 L98 62 Z" fill={fur} /><path d="M146 82 L138 30 L102 62 Z" fill={fur} />
    <path d="M62 74 L66 44 L88 64 Z" fill="#e8a6b0" /><path d="M138 74 L134 44 L112 64 Z" fill="#e8a6b0" />
    <ellipse cx="100" cy="112" rx="58" ry="50" fill={fur} />
    <path d="M92 66 L94 80 M100 64 V80 M108 66 L106 80" stroke={dark} strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="78" cy="106" rx="10" ry="11" fill="#c9d94e" /><ellipse cx="122" cy="106" rx="10" ry="11" fill="#c9d94e" />
    <ellipse cx="78" cy="106" rx="2.8" ry="8.5" fill={INK} /><ellipse cx="122" cy="106" rx="2.8" ry="8.5" fill={INK} />
    <path d="M93 124 L107 124 L100 132 Z" fill="#e8909a" />
    <path d="M100 132 Q94 139 87 135 M100 132 Q106 139 113 135" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M70 126 L36 120 M70 132 L38 136 M130 126 L164 120 M130 132 L162 136" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9" />
  </Frame>
);

export const Caballo = ({ size = 160, bg = '#fbe7c6', fur = '#8a5634', dark = '#3d2618' }) => (
  <Frame bg={bg} size={size} title="Caballo">
    <path d="M74 50 L66 14 L92 40 Z" fill={fur} /><path d="M126 50 L134 14 L108 40 Z" fill={fur} />
    <path d="M70 56 C70 30 130 30 130 56 L124 146 C121 176 79 176 76 146 Z" fill={fur} />
    <path d="M82 30 C92 18 108 18 118 30 C112 44 104 50 100 62 C96 50 88 44 82 30 Z" fill={dark} />
    <path d="M96 66 L104 66 L106 120 L94 120 Z" fill="#f4ece2" />
    <circle cx="78" cy="84" r="6" fill={INK} /><circle cx="122" cy="84" r="6" fill={INK} />
    <circle cx="79.5" cy="82.5" r="1.8" fill="#fff" /><circle cx="123.5" cy="82.5" r="1.8" fill="#fff" />
    <ellipse cx="100" cy="152" rx="27" ry="20" fill="#5b3a26" />
    <ellipse cx="89" cy="152" rx="4.5" ry="6" fill={INK} /><ellipse cx="111" cy="152" rx="4.5" ry="6" fill={INK} />
  </Frame>
);

export const Cabra = ({ size = 160, bg = '#dde9f2', fur = '#efe8dc', dark = '#8d806c' }) => (
  <Frame bg={bg} size={size} title="Cabra">
    <path d="M84 56 C76 26 50 20 40 38" stroke={dark} strokeWidth="11" fill="none" strokeLinecap="round" />
    <path d="M116 56 C124 26 150 20 160 38" stroke={dark} strokeWidth="11" fill="none" strokeLinecap="round" />
    <ellipse cx="46" cy="86" rx="24" ry="10" fill={fur} transform="rotate(18 46 86)" /><ellipse cx="154" cy="86" rx="24" ry="10" fill={fur} transform="rotate(-18 154 86)" />
    <path d="M64 64 Q100 42 136 64 L122 146 Q100 166 78 146 Z" fill={fur} />
    <ellipse cx="80" cy="92" rx="9" ry="7" fill="#d9b24a" /><ellipse cx="120" cy="92" rx="9" ry="7" fill="#d9b24a" />
    <rect x="74" y="90" width="12" height="4" rx="2" fill={INK} /><rect x="114" y="90" width="12" height="4" rx="2" fill={INK} />
    <ellipse cx="100" cy="140" rx="18" ry="12" fill="#d8cdbd" />
    <path d="M95 140 Q100 144 105 140" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M92 156 Q100 186 108 156 Z" fill={dark} />
  </Frame>
);

export const Vaca = ({ size = 160, bg = '#efe6d6', fur = '#fbfaf7', spot = '#2f2a28' }) => (
  <Frame bg={bg} size={size} title="Vaca">
    <path d="M70 56 C62 40 66 30 76 28" stroke="#d8c7a0" strokeWidth="9" fill="none" strokeLinecap="round" />
    <path d="M130 56 C138 40 134 30 124 28" stroke="#d8c7a0" strokeWidth="9" fill="none" strokeLinecap="round" />
    <ellipse cx="44" cy="80" rx="22" ry="11" fill={spot} transform="rotate(14 44 80)" /><ellipse cx="156" cy="80" rx="22" ry="11" fill={fur} stroke="#d9d2c6" strokeWidth="2" transform="rotate(-14 156 80)" />
    <rect x="60" y="50" width="80" height="108" rx="38" fill={fur} />
    <path d="M60 86 C60 62 78 50 98 52 C92 66 84 74 64 96 Z" fill={spot} />
    <ellipse cx="124" cy="112" rx="12" ry="9" fill={spot} />
    <circle cx="82" cy="94" r="6" fill={INK} /><circle cx="118" cy="94" r="6" fill={INK} />
    <circle cx="83.5" cy="92.5" r="1.8" fill="#fff" /><circle cx="119.5" cy="92.5" r="1.8" fill="#fff" />
    <rect x="66" y="126" width="68" height="40" rx="20" fill="#f0b3b6" />
    <ellipse cx="86" cy="146" rx="5" ry="6.5" fill="#8a4b52" /><ellipse cx="114" cy="146" rx="5" ry="6.5" fill="#8a4b52" />
  </Frame>
);

export const Loro = ({ size = 160, bg = '#e3efe9' }) => (
  <Frame bg={bg} size={size} title="Loro">
    <path d="M38 150 H166" stroke="#7a5a3c" strokeWidth="8" strokeLinecap="round" />
    <path d="M104 150 L94 194 L110 194 Z" fill="#2e6fb4" />
    <ellipse cx="104" cy="112" rx="34" ry="44" fill="#3a9a4a" />
    <path d="M86 98 C80 130 96 152 120 150 C112 136 108 118 110 100 Z" fill="#2a7a38" />
    <circle cx="112" cy="66" r="30" fill="#4bb35a" />
    <path d="M136 62 C150 64 154 80 144 88 C142 80 138 76 132 76 Z" fill="#e9c44c" />
    <path d="M132 76 C140 78 142 84 140 90 C136 86 132 84 130 82 Z" fill="#3b3734" />
    <circle cx="118" cy="60" r="9" fill="#fff" /><circle cx="120" cy="60" r="4.5" fill={INK} />
    <path d="M88 52 C92 40 104 36 114 38" stroke="#e05a3a" strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M92 150 C94 144 100 144 102 150 M108 150 C110 144 116 144 118 150" stroke="#9a9086" strokeWidth="4" fill="none" strokeLinecap="round" />
  </Frame>
);

// Veterinaria con estetoscopio (figura simple) para las entradas de profesionales.
export const Vet = ({ size = 160, bg = '#f2eaf0' }) => (
  <Frame bg={bg} size={size} title="Veterinaria">
    <path d="M40 200 C40 150 66 128 100 128 C134 128 160 150 160 200 Z" fill="#fbfaf7" />
    <path d="M86 128 L100 160 L114 128 Z" fill="#2d6b5a" />
    <circle cx="100" cy="82" r="34" fill="#e2b48d" />
    <path d="M64 82 C62 48 86 38 104 40 C124 42 140 58 136 86 C130 70 116 60 100 60 C86 62 74 70 64 82 Z" fill="#4a3426" />
    <circle cx="88" cy="86" r="4" fill={INK} /><circle cx="112" cy="86" r="4" fill={INK} />
    <path d="M90 100 Q100 108 110 100" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M78 132 C70 160 82 176 98 176 C112 176 118 168 118 158" stroke="#3d3d3d" strokeWidth="4" fill="none" />
    <circle cx="118" cy="154" r="7" fill="#9aa3ab" stroke="#3d3d3d" strokeWidth="3" />
    <path d="M122 132 L122 148" stroke="#3d3d3d" strokeWidth="4" />
  </Frame>
);

// Municipio (edificio con bandera) para la entrada de zoonosis.
export const Municipio = ({ size = 160, bg = '#dde9f2' }) => (
  <Frame bg={bg} size={size} title="Municipio">
    <rect x="44" y="96" width="112" height="70" fill="#fbfaf7" />
    <path d="M36 98 L100 58 L164 98 Z" fill="#1f5e7a" />
    {[60, 84, 108, 132].map(x => <rect key={x} x={x} y="108" width="10" height="50" fill="#c9d6de" />)}
    <rect x="36" y="164" width="128" height="10" fill="#9fb4c0" />
    <path d="M100 58 V26" stroke="#3d3d3d" strokeWidth="3" />
    <path d="M100 26 L126 32 L100 40 Z" fill="#7cb6d8" />
    <circle cx="100" cy="84" r="8" fill="#e3efe9" stroke="#2d6b5a" strokeWidth="3" />
  </Frame>
);

// Mosaico de la portada: animales con notas de cuidado.
export function HeroMosaic() {
  const tiles = [
    { A: Perro, nota: 'Luna · antirrábica al día', pos: { gridColumn: '1 / span 2', gridRow: '1 / span 2' } },
    { A: Gato, nota: 'Michi · control en 23 días', pos: { gridColumn: '3', gridRow: '1' } },
    { A: Caballo, nota: 'Libreta equina SENASA', pos: { gridColumn: '3', gridRow: '2' } },
    { A: Cabra, nota: 'Campaña rural · Lavalle', pos: { gridColumn: '1', gridRow: '3' } },
    { A: Vaca, nota: 'Visita a campo', pos: { gridColumn: '2', gridRow: '3' } },
    { A: Loro, nota: 'Exóticos · turno online', pos: { gridColumn: '3', gridRow: '3' } },
  ];
  return (
    <div className="mosaic" aria-label="Ilustraciones de animales">
      {tiles.map(({ A, nota, pos }, i) => (
        <figure key={i} className={`mtile ${i === 0 ? 'big' : ''}`} style={pos}>
          <A size={i === 0 ? 300 : 140} />
          <figcaption>{nota}</figcaption>
        </figure>
      ))}
    </div>
  );
}
