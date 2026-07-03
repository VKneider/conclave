import pkg from 'lz-string';
const { compressToEncodedURIComponent } = pkg;

// Generates a plantilla with `t` temas and `o` opciones (pool)
function makePlantilla(t, o) {
  const temas = [];
  for (let i = 0; i < t; i++) {
    temas.push({
      id: `tema-${i}`,
      nombre: `Tema número ${i + 1} con nombre`,
      modo: 'votacion',
      orden: i + 1,
      min: null,
      max: null,
      participable: false,
      meta: { lider: null, numero: i + 1 },
    });
  }
  const opciones = [];
  for (let i = 0; i < o; i++) {
    opciones.push({
      id: i + 1,
      nombre: `Opción ${i + 1} con nombre descriptivo largo para probar`,
      temaId: temas[i % t].id,
      meta: { sexo: i % 2 === 0 ? 'M' : 'F', edad: 20 + (i % 40), fijo: false, rolFijo: null },
    });
  }
  return { nombre: 'Plantilla de prueba con nombre larguísimo para testear', atributos: [], temas, opciones };
}

function measure(label, plantilla) {
  const raw = JSON.stringify(plantilla);
  const rawBytes = new TextEncoder().encode(raw).length;
  const b64 = btoa(raw);
  const b64URI = encodeURIComponent(b64);
  const lzURI = compressToEncodedURIComponent(raw);
  console.log(`${label}:`);
  console.log(`  Temas: ${plantilla.temas.length}  Opciones: ${plantilla.opciones.length}`);
  console.log(`  Raw JSON:           ${raw.length} chars  ~${rawBytes} bytes`);
  console.log(`  base64 URI:         ${b64URI.length} chars`);
  console.log(`  lz-string URI:      ${lzURI.length} chars`);
  console.log(`  Compresión lz:      ${rawBytes > 0 ? ((1 - lzURI.length / rawBytes) * 100).toFixed(1) : '?'}% vs raw bytes`);
  console.log(`  Base de URL (~50):  ${(50 + b64URI.length).toLocaleString()} chars (b64) / ${(50 + lzURI.length).toLocaleString()} chars (lz)`);
  console.log();
  return { lzURI: lzURI.length, b64URI: b64URI.length, raw: raw.length };
}

// Browser URL limits (approx):
//   Chrome:    ~2MB (2,097,152 chars) — effectively unlimited
//   Firefox:   ~150KB (150,000 chars) — conservative
//   Safari:    ~100KB (100,000 chars) — conservative
//   IE11:      ~2,083 chars (pathetic)
//   Edge:      ~2KB (2,083 chars, old EdgeHTML)
//   Opera:     ~500KB
// Modern target: keep under 100KB for Safari, 150KB for Firefox

console.log('========================================');
console.log('  STRESS TEST — Plantilla en URL');
console.log('========================================\n');

// Escenarios reales
const scenarios = [
  { label: '--- Escenario: Plantilla chica (1 tema, 2 opciones)', t: 1, o: 2 },
  { label: '--- Escenario: Seed actual (7 temas, 15 opciones)', t: 7, o: 15 },
  { label: '--- Escenario: Equipo mediano (10 temas, 30 opciones)', t: 10, o: 30 },
  { label: '--- Escenario: Equipo grande (20 temas, 60 opciones)', t: 20, o: 60 },
  { label: '--- Escenario: Evento (30 temas, 100 opciones)', t: 30, o: 100 },
  { label: '--- Escenario: Mega (50 temas, 200 opciones)', t: 50, o: 200 },
  { label: '--- Escenario: Ultra (100 temas, 500 opciones)', t: 100, o: 500 },
  { label: '--- Escenario: Locura (200 temas, 1000 opciones)', t: 200, o: 1000 },
];

for (const s of scenarios) {
  const pl = makePlantilla(s.t, s.o);
  console.log(s.label);
  measure('', pl);
}

// Find approximate breaking point for lz-string
console.log('--- Buscando el límite teórico ---');
for (const [t, o] of [[500, 2500], [1000, 5000], [2000, 10000]]) {
  const pl = makePlantilla(t, o);
  const raw = JSON.stringify(pl);
  const lzURI = compressToEncodedURIComponent(raw);
  const totalURL = 50 + lzURI.length;
  console.log(`${t} temas / ${o} opciones → lz: ${lzURI.length} chars, URL total: ~${totalURL.toLocaleString()} chars (${(totalURL / 1024).toFixed(1)} KB)`);
  if (totalURL > 150_000) {
    console.log(`  ⚠ Supera el límite conservador de Safari (100KB) y Firefox (150KB)`);
  } else if (totalURL > 100_000) {
    console.log(`  ⚠ Supera el límite conservador de Safari (100KB) pero Firefox (150KB) todavía banca`);
  } else {
    console.log(`  ✓ Cabe dentro de todos los límites modernos`);
  }
}
