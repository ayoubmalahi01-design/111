/** Pure domain rules shared by UI and tests. No training-program generation lives here. */
export const normalizeStudentNumber = value => String(value ?? '').trim().replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
export const splitStudentNumbers = value => [...new Set(String(value ?? '').split(/[\s,،;؛]+/).map(normalizeStudentNumber).filter(Boolean))];
export const nearestHigherScale = (rawValue, rules = []) => {
  const raw = Number(rawValue);
  if (!Number.isFinite(raw)) return null;
  return rules.filter(r => Number.isFinite(Number(r.rawValue)) && Number(r.rawValue) >= raw)
    .sort((a, b) => Number(a.rawValue) - Number(b.rawValue))[0] ?? null;
};
export const navetteMetrics = (speedKmh, durationSeconds, shuttlesCompleted = null) => {
  const kmh = Number(speedKmh);
  if (!Number.isFinite(kmh) || kmh <= 0) throw new Error('Invalid speed');
  const ms = kmh / 3.6;
  const seconds = durationSeconds == null || durationSeconds === '' ? null : Number(durationSeconds);
  const shuttles = shuttlesCompleted == null || shuttlesCompleted === '' ? null : Number(shuttlesCompleted);
  if (seconds != null && (!Number.isFinite(seconds) || seconds <= 0)) throw new Error('Invalid duration');
  if (shuttles != null && (!Number.isInteger(shuttles) || shuttles < 0)) throw new Error('Invalid shuttle count');
  return { speed_kmh: kmh, speed_ms: Number(ms.toFixed(3)), shuttle_seconds: Number((72 / kmh).toFixed(3)), distance_m: shuttles == null ? null : shuttles * 20, duration_seconds: seconds, shuttles_completed: shuttles };
};
export const bmi = (weightKg, heightM) => {
  const w = Number(weightKg), h = Number(heightM);
  return w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h) ? Number((w / (h * h)).toFixed(2)) : null;
};
export const validateScaleRules = rules => {
  if (!Array.isArray(rules) || !rules.length) throw new Error('Scale must contain at least one row');
  const seen = new Set();
  for (const r of rules) {
    const raw = Number(r.rawValue), score = Number(r.score);
    if (!Number.isFinite(raw) || !Number.isFinite(score)) throw new Error('Invalid scale row');
    if (seen.has(String(raw))) throw new Error('Duplicate raw value');
    seen.add(String(raw));
  }
  return [...rules].sort((a, b) => Number(a.rawValue) - Number(b.rawValue));
};
const splitDelimitedLine = (line, delimiter) => {
  const cells=[];let cell='',quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(ch===delimiter&&!quoted){cells.push(cell.trim());cell='';}
    else cell+=ch;
  }
  if(quoted)throw new Error('Unclosed quoted cell');
  cells.push(cell.trim());return cells;
};
export const parsePastedTable = (input, { minColumns = 2 } = {}) => {
  const lines = String(input ?? '').replace(/^\uFEFF/, '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  return lines.map((line, index) => {
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const cells = splitDelimitedLine(line,delimiter);
    if (cells.length < minColumns) throw new Error(`Invalid row ${index + 1}`);
    return cells;
  });
};
export const parseScalePaste = input => { const rows=parsePastedTable(input).filter((cells,i)=>!(i===0&&/^(raw|raw.?value|performance(?:\s+raw)?|النتيجة|الأداء(?:\s+الخام)?|résultat(?:\s+brut)?)$/i.test(cells[0]))); return validateScaleRules(rows.map((cells, i) => {
  const rawValue = Number(cells[0].replace(',', '.'));
  const score = Number(cells[1].replace(',', '.'));
  if (!Number.isFinite(rawValue) || !Number.isFinite(score)) throw new Error(`Invalid BARÈME row ${i + 1}`);
  return { rawValue, score };
})); };
export const parseStudentPaste = input => parsePastedTable(input).filter((cells,i)=>!(i===0&&/^(student.?number|number|code|matricule|numéro|رقم|الرقم|الكود|رقم التلميذ|رقم الطالب)$/i.test(cells[0])&&/^(name|full.?name|nom|nom complet|الاسم|الاسم الكامل)$/i.test(cells[1]||''))).map((cells, i) => {
  if (cells.length < 2 || !cells[0] || !cells[1]) throw new Error(`Missing student number/name at row ${i + 1}`);
  return { student_number: normalizeStudentNumber(cells[0]), full_name: cells[1], class_name: cells[2] || '' };
});
export const repsPerMinute = (reps, durationSeconds) => { const n=Number(reps),s=Number(durationSeconds);return Number.isFinite(n)&&n>=0&&Number.isFinite(s)&&s>0?Number((n*60/s).toFixed(2)):null; };
export const repsPerSecond = (reps,durationSeconds) => { const n=Number(reps),s=Number(durationSeconds);return Number.isFinite(n)&&n>=0&&Number.isFinite(s)&&s>0?Number((n/s).toFixed(4)):null; };
export const averageRepSeconds = (reps,durationSeconds) => { const n=Number(reps),s=Number(durationSeconds);return Number.isFinite(n)&&n>0&&Number.isFinite(s)&&s>0?Number((s/n).toFixed(4)):null; };
export const csvText = rows => {
  if (!rows?.length) return '';
  const columns = Object.keys(rows[0]);
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\ufeff' + [columns.map(cell).join(';'), ...rows.map(row => columns.map(k => cell(row[k])).join(';'))].join('\r\n');
};
