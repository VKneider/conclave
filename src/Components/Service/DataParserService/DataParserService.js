const DELIMITER_GUESS_SAMPLE = 500;

export default class DataParserService {
  detectFormat(text) {
    if (!text || !text.trim()) return 'unknown';
    const s = text.trim();
    if (s[0] === '[' || s[0] === '{') return 'json';
    const first = s.slice(0, DELIMITER_GUESS_SAMPLE);
    if (first.includes('\t')) return 'tsv';
    if (first.includes(',')) return 'csv';
    return 'plain';
  }

  parseTeams(text, format) {
    const fmt = format || this.detectFormat(text);
    if (fmt === 'json') return this._parseTeamsJSON(text);
    if (fmt === 'csv') return this._parseTeamsDelimited(text, ',');
    if (fmt === 'tsv') return this._parseTeamsDelimited(text, '\t');
    return { teams: [], errors: ['Formato no reconocido. Usa CSV o JSON.'] };
  }

  parseMembers(text, format) {
    const fmt = format || this.detectFormat(text);
    if (fmt === 'json') return this._parseMembersJSON(text);
    if (fmt === 'csv') return this._parseMembersDelimited(text, ',');
    if (fmt === 'tsv') return this._parseMembersDelimited(text, '\t');
    return { members: [], errors: ['Formato no reconocido. Usa CSV o JSON.'] };
  }

  // ── Teams: delimited ──────────────────────────────

  _parseTeamsDelimited(text, delim) {
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return { teams: [], errors: ['Se espera encabezado + al menos una fila.'] };
    const header = lines[0].split(delim).map((h) => h.trim().toLowerCase());
    const errors = [];
    const teams = [];
    const idIdx = header.indexOf('id');
    const nameIdx = header.indexOf('nombre');
    const minIdx = header.indexOf('min');
    const maxIdx = header.indexOf('max');
    const capIdx = header.indexOf('capacidad');
    const lidIdx = header.indexOf('lider');
    const asigIdx = header.indexOf('asignable');
    const numIdx = header.indexOf('numero');
    const seenIds = new Set();

    for (let i = 1; i < lines.length; i++) {
      const cols = this._splitLine(lines[i], delim);
      const nombre = cols[nameIdx] || '';
      if (!nombre) { errors.push(`Fila ${i}: falta el nombre`); continue; }

      let id;
      if (idIdx >= 0 && cols[idIdx]) {
        id = cols[idIdx].trim();
      } else {
        id = this._slug(nombre);
      }
      if (seenIds.has(id)) { errors.push(`Fila ${i}: ID duplicado «${id}»`); continue; }
      seenIds.add(id);

      const lider = lidIdx >= 0 && lidIdx < cols.length ? cols[lidIdx] || null : null;
      const asignable = asigIdx >= 0 && asigIdx < cols.length ? cols[asigIdx].toLowerCase() !== 'false' : true;
      teams.push({
        id,
        nombre,
        lider,
        asignable,
        numero: numIdx >= 0 && numIdx < cols.length ? parseInt(cols[numIdx], 10) || null : null,
        capacidad: capIdx >= 0 && capIdx < cols.length ? parseInt(cols[capIdx], 10) || null : null,
        min: minIdx >= 0 && minIdx < cols.length ? parseInt(cols[minIdx], 10) || null : null,
        max: maxIdx >= 0 && maxIdx < cols.length ? parseInt(cols[maxIdx], 10) || null : null,
      });
    }
    return { teams, errors };
  }

  // ── Members: delimited ────────────────────────────

  _parseMembersDelimited(text, delim) {
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return { members: [], errors: ['Se espera encabezado + al menos una fila.'] };
    const header = lines[0].split(delim).map((h) => h.trim().toLowerCase());
    const errors = [];
    const members = [];
    const idIdx = header.indexOf('id');
    const nameIdx = header.indexOf('nombre');
    const sexIdx = header.indexOf('sexo');
    const edadIdx = header.indexOf('edad');
    const fijoIdx = header.indexOf('fijo');
    const rolIdx = header.indexOf('rolfijo');
    let nextId = 1;
    const seenIds = new Set();
    const seenNumbers = new Set();

    for (let i = 1; i < lines.length; i++) {
      const cols = this._splitLine(lines[i], delim);
      const nombre = cols[nameIdx] || '';
      if (!nombre) { errors.push(`Fila ${i}: falta el nombre`); continue; }

      let id;
      if (idIdx >= 0 && cols[idIdx]) {
        const raw = cols[idIdx].trim();
        id = parseInt(raw, 10);
        if (isNaN(id)) { errors.push(`Fila ${i}: ID debe ser numérico, se encontró «${raw}»`); continue; }
        if (seenIds.has(id)) { errors.push(`Fila ${i}: ID duplicado «${id}»`); continue; }
        if (id < 1) { errors.push(`Fila ${i}: ID debe ser positivo`); continue; }
        seenIds.add(id);
        seenNumbers.add(id);
      } else {
        while (seenNumbers.has(nextId)) nextId++;
        id = nextId++;
        seenNumbers.add(id);
      }

      members.push({
        id,
        nombre,
        sexo: sexIdx >= 0 && sexIdx < cols.length ? cols[sexIdx].toUpperCase().slice(0, 1) || '' : '',
        edad: edadIdx >= 0 && edadIdx < cols.length ? parseInt(cols[edadIdx], 10) || null : null,
        fijo: fijoIdx >= 0 && fijoIdx < cols.length ? cols[fijoIdx].toLowerCase() === 'true' : false,
        rolFijo: rolIdx >= 0 && rolIdx < cols.length ? cols[rolIdx] || null : null,
      });
    }
    return { members, errors };
  }

  // ── JSON parsers ──────────────────────────────────

  _parseTeamsJSON(text) {
    const errors = [];
    let data;
    try { data = JSON.parse(text); } catch (e) { return { teams: [], errors: ['JSON inválido: ' + e.message] }; }
    if (!Array.isArray(data)) return { teams: [], errors: ['Se espera un array de equipos.'] };
    const seenIds = new Set();
    const teams = data.filter((t, i) => {
      if (!t || !t.nombre) { errors.push(`Índice ${i}: falta el nombre`); return false; }
      if (!t.id) t.id = this._slug(t.nombre);
      if (seenIds.has(t.id)) { errors.push(`Índice ${i}: ID duplicado «${t.id}»`); return false; }
      seenIds.add(t.id);
      return true;
    });
    return { teams, errors };
  }

  _parseMembersJSON(text) {
    const errors = [];
    let data;
    try { data = JSON.parse(text); } catch (e) { return { members: [], errors: ['JSON inválido: ' + e.message] }; }
    if (!Array.isArray(data)) return { members: [], errors: ['Se espera un array de miembros.'] };
    let nextId = 1;
    const seenIds = new Set();
    const members = data.filter((m, i) => {
      if (!m || !m.nombre) { errors.push(`Índice ${i}: falta el nombre`); return false; }
      if (!m.id) { while (seenIds.has(nextId)) nextId++; m.id = nextId; }
      if (seenIds.has(m.id)) { errors.push(`Índice ${i}: ID duplicado «${m.id}»`); return false; }
      seenIds.add(m.id);
      return true;
    });
    return { members, errors };
  }

  // ── Validation ────────────────────────────────────

  validateTeams(teams) {
    const errors = [];
    const names = new Set();
    const ids = new Set();
    teams.forEach((t, i) => {
      if (!t.id) errors.push({ index: i, field: 'id', message: 'ID requerido' });
      else if (ids.has(t.id)) errors.push({ index: i, field: 'id', message: `ID duplicado: ${t.id}` });
      else ids.add(t.id);
      if (!t.nombre) errors.push({ index: i, field: 'nombre', message: 'Nombre requerido' });
      else if (names.has(t.nombre)) errors.push({ index: i, field: 'nombre', message: `Nombre duplicado: ${t.nombre}` });
      else names.add(t.nombre);
      if (t.min != null && t.max != null && t.min > t.max) errors.push({ index: i, field: 'min', message: `min (${t.min}) > max (${t.max})` });
    });
    return errors;
  }

  validateMembers(members) {
    const errors = [];
    const names = new Set();
    const ids = new Set();
    members.forEach((m, i) => {
      if (!m.id) errors.push({ index: i, field: 'id', message: 'ID requerido' });
      else if (ids.has(m.id)) errors.push({ index: i, field: 'id', message: `ID duplicado: ${m.id}` });
      else ids.add(m.id);
      if (!m.nombre) errors.push({ index: i, field: 'nombre', message: 'Nombre requerido' });
      else if (names.has(m.nombre)) errors.push({ index: i, field: 'nombre', message: `Nombre duplicado: ${m.nombre}` });
      else names.add(m.nombre);
    });
    return errors;
  }

  // ── Examples ──────────────────────────────────────

  exampleTeamsCSV() {
    return ['id,nombre,min,max,capacidad,lider,asignable', 'transporte,Transporte,4,6,6,,true', 'banda-en-vivo,Banda en Vivo,6,10,10,,true', 'bienvenida,Bienvenida,8,12,12,,true', 'cafeteria,Cafetería,4,6,6,,true', 'anfitriones,Anfitriones,2,2,2,,true'].join('\n');
  }

  exampleMembersCSV() {
    return ['id,nombre,sexo,edad,rolFijo,fijo', '1,Juan Pérez,M,25,,false', '2,María García,F,30,,false', '3,Carlos López,M,28,,false'].join('\n');
  }

  // ── Helpers ───────────────────────────────────────

  _slug(name) {
    return (name || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'unnamed';
  }

  _splitLine(line, delim) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === delim && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  }
}
