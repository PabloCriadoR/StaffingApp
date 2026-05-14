class CVService {
  static TECH_SKILLS = [
    'node', 'node.js', 'express', 'nestjs',
    'angular', 'react', 'vue',
    'sap', 'sap hana', 'sap btp', 'cap', 'successfactors',
    'typescript', 'javascript', 'java', 'python',
    'docker', 'kubernetes',
    'aws', 'azure',
    'postgresql', 'mongodb', 'mysql',
    'diseño ux',
  ];

  // MESES (JS: 0–11)
  static MONTHS = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11
  };

  // =============================
  // NORMALIZACIÓN
  // =============================
  static normalizeText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/[•]/g, '-')
      .replace(/[–—]/g, '-')
      .replace(/\t/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // =============================
  // EMAIL
  // =============================
  static extractEmail(text) {
    return (
      text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ||
      null
    );
  }

  // =============================
  // NOMBRE
  // =============================
  static extractName(text) {
    const forbidden = [
      'curriculum',
      'vitae',
      'información',
      'personal',
      'experience',
      'educación',
      'skills',
      'experiencia',
      'laboral'
    ];

    const lines = text.split('\n').slice(0, 20);

    for (const line of lines) {
      const original = line.trim();
      if (!original) continue;

      const lower = original.toLowerCase();
      if (forbidden.some(word => lower.includes(word))) continue;

      if (!/^[a-záéíóúñ\s]+$/i.test(original)) continue;

      const words = original.split(' ').filter(w => w.length > 1);
      if (words.length < 2 || words.length > 4) continue;

      const valid = words.every(w =>
        /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(w)
      );

      if (valid) return original;
    }

    return null;
  }

  // =============================
  // SKILLS
  // =============================
  static extractSkills(text) {
    const normalized = this.normalizeText(text).toLowerCase();
    const found = new Set();

    for (const skill of this.TECH_SKILLS) {
      const regex = new RegExp(`\\b${skill.replace('.', '\\.')}\\b`, 'i');
      if (regex.test(normalized)) {
        found.add(skill);
      }
    }

    return [...found];
  }

// =============================
// EXPERIENCIA (DESDE CABECERA)
// =============================
static extractExperienceSection(text) {
    const normalized = this.normalizeText(text);
    const lower = normalized.toLowerCase();

    const startKeywords = [
      'experiencia laboral',
      'experiencia profesional',
      'professional experience',
      'work experience'
    ];

    let startIndex = -1;

    for (const keyword of startKeywords) {
      const index = lower.indexOf(keyword);
      if (index !== -1) {
        startIndex = index;
        break;
      }
    }

    return startIndex === -1
      ? normalized
      : normalized.slice(startIndex);
  }
static extractExperienceBlocks(text) {
    const normalized = this.normalizeText(text);

    const regex =
      /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(20\d{2})\s*[-–]\s*(actualidad|presente|(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(20\d{2}))/gi;

    const matches = [...normalized.matchAll(regex)];
    console.log('[DEBUG] matches fechas:', matches.length);

    const blocks = [];

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
      const block = normalized.slice(start, end).trim();

      if (block.length > 20) {
        blocks.push(block);
        console.log('[DEBUG] bloque detectado:\n', block);
      }
    }

    console.log('[DEBUG] total bloques:', blocks.length);
    return blocks;
  }

  // =============================
  // PARSEAR BLOQUE
  // =============================
  static parseExperienceBlock(block) {
    const regex =
      /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(20\d{2})\s*[-–]\s*(actualidad|presente|(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(20\d{2}))/i;

    const match = block.match(regex);
    if (!match) return null;

    const startDate = new Date(
      Number(match[2]),
      this.MONTHS[match[1].toLowerCase()],
      1
    );

    const endDate = /actualidad|presente/i.test(match[3])
      ? new Date()
      : new Date(
          Number(match[5]),
          this.MONTHS[match[4].toLowerCase()] + 1,
          0
        );

    console.log('[DEBUG] periodo parseado:', { startDate, endDate });

    return { startDate, endDate };
  }

  // =============================
  // DIFERENCIA EN MESES
  // =============================
  static diffMonths(start, end) {
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    console.log('[DEBUG] diffMonths:', months, start, end);
    return months;
  }

  // =============================
  // EXPERIENCIA TOTAL (HEURÍSTICA CORRECTA)
  // =============================
  static estimateExperienceByDates(text) {
    console.log('========== START EXPERIENCE CALC ==========');

    const EDUCATION_KEYWORDS = [
      'licenciatura',
      'grado',
      'master',
      'máster',
      'doctorado',
      'universidad'
    ];

    const JOB_KEYWORDS = [
      'desarrollador',
      'developer',
      'investigador',
      'ingeniero',
      'engineer',
      'backend',
      'frontend',
      'software',
      'programador'
    ];

    const experienceText = this.extractExperienceSection(text);
    const blocks = this.extractExperienceBlocks(experienceText);

    const periods = blocks
      .filter(block => {
        const lower = block.toLowerCase();
        const isEducation =
          EDUCATION_KEYWORDS.some(w => lower.includes(w)) &&
          !JOB_KEYWORDS.some(w => lower.includes(w));

        if (isEducation) {
          console.log('[DEBUG] bloque descartado (educación real):\n', block);
        }

        return !isEducation;
      })
      .map(block => this.parseExperienceBlock(block))
      .filter(Boolean);

    console.log('[DEBUG] periods finales:', periods);

    if (!periods.length) return null;

    periods.sort((a, b) => a.startDate - b.startDate);

    let totalMonths = 0;
    let currentStart = periods[0].startDate;
    let currentEnd = periods[0].endDate;

    for (let i = 1; i < periods.length; i++) {
      const p = periods[i];
      if (p.startDate <= currentEnd) {
        if (p.endDate > currentEnd) currentEnd = p.endDate;
      } else {
        totalMonths += this.diffMonths(currentStart, currentEnd);
        currentStart = p.startDate;
        currentEnd = p.endDate;
      }
    }

    totalMonths += this.diffMonths(currentStart, currentEnd);

    const years = totalMonths / 12;

    console.log('[DEBUG] totalMonths:', totalMonths);
    console.log('[DEBUG] years:', years);
    console.log('========== END EXPERIENCE CALC ==========');

    return years > 0 && years < 50
      ? Math.round(years * 10) / 10
      : null;
  }

  // =============================
  // SPLIT NOMBRE
  // =============================
  static splitName(fullName) {
    if (!fullName) return { nombre: null, apellido1: null, apellido2: null };

    const parts = fullName.trim().split(' ');
    if (parts.length === 2) return { nombre: parts[0], apellido1: parts[1], apellido2: null };
    if (parts.length === 3) return { nombre: parts[0], apellido1: parts[1], apellido2: parts[2] };

    const apellido2 = parts.pop();
    const apellido1 = parts.pop();
    return { nombre: parts.join(' '), apellido1, apellido2 };
  }
}

module.exports = CVService;