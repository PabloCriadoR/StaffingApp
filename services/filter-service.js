const db = require('../config/db');

class FilterService {

  //* === NORMALIZADOR DE SKILLS (REUTILIZABLE) ===
  static parseSkills(skillsRaw) {
    let skills;

    // CASO 1: ya es array
    if (Array.isArray(skillsRaw)) {
      skills = skillsRaw;
    }

    // CASO 2: string
    else if (typeof skillsRaw === 'string') {
      try {
        skills = JSON.parse(skillsRaw);

        if (!Array.isArray(skills)) {
          skills = [skills];
        }

      } catch {
        skills = skillsRaw
        ? skillsRaw
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        : [];
      }
    }

    // CASO 3: null / undefined / raro
    else {
      skills = [];
    }

    return skills;
  }

  //* === LÓGICA PRINCIPAL ===
  static async getEmployeesByProject(idProyecto) {

    //* 1. Obtener skills del proyecto
    const [projectRows] = await db.pool.execute(
      `SELECT skills_requeridas FROM proyecto WHERE id_proyecto = ?`,
      [idProyecto]
    );

    if (projectRows.length === 0) {
      throw new Error('Proyecto no encontrado');
    }

    const projectSkills = this.parseSkills(
      projectRows[0].skills_requeridas
    );

    //* 2. Obtener empleados
    const [employees] = await db.pool.execute(
      `SELECT * FROM empleado`
    );

    //* 3. Matching
    const result = employees.map(emp => {

      const empSkills = this.parseSkills(emp.skills);

      const matches = projectSkills.filter(skill =>
        empSkills.includes(skill)
      );

      return {
        ...emp,
        skills: empSkills,
        match_count: matches.length,
        match_percentage: projectSkills.length
          ? (matches.length / projectSkills.length) * 100
          : 0,
        matched_skills: matches
      };
    });

    //* 4. Ordenar (mejor match primero)
    return result
      .filter(e => e.match_count > 0) //solo los que tienen alguna skill
      .sort((a, b) => b.match_count - a.match_count);
  }
}

module.exports = FilterService;