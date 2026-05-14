const EmployeeService = require('./employee-service.js');
const ProjectService = require('./project-service.js');
const db = require('../config/db.js');

class MatchingService {

  //* =========================================
  //* CANDIDATOS
  //* =========================================
  static async getEmployeeCandidates(idProyecto) {

    const proyecto = await ProjectService.getById(idProyecto);
    if (!proyecto) throw new Error('Proyecto no encontrado');

    const skillsProyecto = this.parseSkillsProyecto(
      proyecto.empleados_por_skill
    );

    const empleados = await EmployeeService.getAll();

    const [asignados] = await db.pool.execute(
      'SELECT id_empleado FROM empleado_proyecto WHERE id_proyecto = ?',
      [idProyecto]
    );

    const empleadosAsignados = new Set(
      asignados.map(e => e.id_empleado)
    );

    const resultados = empleados.map(emp => {

      const coincidencias = this.getMatchingSkills(
        emp.skills,
        skillsProyecto
      );

      const porcentaje = skillsProyecto.length
        ? coincidencias.length / skillsProyecto.length
        : 0;

      const score = this.calculateScore(
        coincidencias.length,
        skillsProyecto.length,
        emp.experiencia,
        emp.precio
      );

      return {
        empleado: emp,
        num_skills_match: coincidencias.length,
        porcentaje_match: Number((porcentaje * 100).toFixed(2)),
        experiencia: emp.experiencia,
        precio: Number(emp.precio) || 0,
        score_total: score,
        skills_match: coincidencias,
        asignado: empleadosAsignados.has(emp.id),
      };
    });

    resultados.sort((a, b) => b.score_total - a.score_total);

    return {
      proyecto,
      total_skills: skillsProyecto.length,
      candidatos: resultados
    };
  }

  //* =========================================
  //* EQUIPOS ÓPTIMOS
  //* =========================================
  static async getOptimalTeams(idProyecto) {

    const proyecto = await ProjectService.getById(idProyecto);
    if (!proyecto) throw new Error('Proyecto no encontrado');

    const candidatosData =
      await this.getEmployeeCandidates(idProyecto);

    const presupuesto = Number(proyecto.coste || 0);
    const maxEmpleados =
      Number(proyecto.total_empleados_requeridos) || Infinity;

    const actuales =
      Number(proyecto.cantidad_actual_empleados) || 0;

    const plazasDisponibles =
      Math.max(0, maxEmpleados - actuales);

    const equipos_optimos = this.buildMultipleTeams(
      candidatosData.candidatos,
      presupuesto,
      plazasDisponibles,
      candidatosData.total_skills
    );

    return {
      proyecto,
      equipos_optimos
    };
  }

  //* =========================================
  //* ALGORITMO
  //* =========================================
  static buildMultipleTeams(
    candidatos,
    presupuesto,
    maxEmpleados,
    totalSkills
  ) {

    const presupuestoMax =
      presupuesto > 0 ? presupuesto : Infinity;

    // ✅ priorizar skills + score + precio
    const candidatosOrdenados = candidatos
      .map(c => ({
        ...c,
        numSkills: c.skills_match.length
      }))
      .sort((a, b) =>
        b.numSkills - a.numSkills ||
        b.score_total - a.score_total ||
        a.precio - b.precio
      );

    const equipos = [];

    for (let intento = 0; intento < 3; intento++) {

      let equipo = [];
      let coste = 0;
      let score = 0;
      let skillsCubiertas = new Set();

      for (let i = intento; i < candidatosOrdenados.length; i++) {

        const c = candidatosOrdenados[i];
        const precio = Number(c.precio) || 0;

        if (equipo.length >= maxEmpleados) break;

        if (coste + precio > presupuestoMax) continue;

        equipo.push(c);
        coste += precio;
        score += c.score_total;

        c.skills_match.forEach(s =>
          skillsCubiertas.add(s)
        );

        // ✅ parar si cubre todo
        if (skillsCubiertas.size === totalSkills) break;
      }

      const cobertura =
        totalSkills > 0
          ? skillsCubiertas.size / totalSkills
          : 1;

      // ✅ bonus / penalización
      if (cobertura === 1) {
        score += 100;
      } else {
        score -= (1 - cobertura) * 150;
      }

      if (equipo.length > 0) {
        equipos.push({
          equipo,
          coste_total: Number(coste.toFixed(2)), // ✅ CORRECTO
          presupuesto_total: presupuesto || null,
          dinero_restante: presupuesto
            ? Number((presupuesto - coste).toFixed(2))
            : null,
          uso_presupuesto: presupuesto
            ? Number((coste / presupuesto).toFixed(2))
            : null,
          score_total: Number(score.toFixed(2)),
          cobertura_skills:
            Number((cobertura * 100).toFixed(2))
        });
      }
    }

    equipos.sort((a, b) => b.score_total - a.score_total);

    // ✅ FALLBACK CORREGIDO
    if (equipos.length === 0 && candidatosOrdenados.length > 0) {

      const fallback = candidatosOrdenados.slice(0, maxEmpleados);

      let coste = 0;
      let score = 0;
      const skillsCubiertas = new Set();

      fallback.forEach(c => {
        coste += Number(c.precio) || 0;
        score += c.score_total;
        c.skills_match.forEach(s =>
          skillsCubiertas.add(s)
        );
      });

      const cobertura =
        totalSkills > 0
          ? skillsCubiertas.size / totalSkills
          : 1;

      return [{
        equipo: fallback,
        coste_total: Number(coste.toFixed(2)), // ✅ ARREGLADO
        score_total: Number(score.toFixed(2)),
        cobertura_skills:
          Number((cobertura * 100).toFixed(2)),
        fallback: true
      }];
    }

    return equipos.slice(0, 3);
  }

  //* =========================================
  //* ASIGNAR
  //* =========================================
  static async assignEmployeesToProject(idProyecto, empleadosIds) {

    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const idEmpleado of empleadosIds) {
        await connection.execute(
          `INSERT IGNORE INTO empleado_proyecto
           (id_empleado, id_proyecto)
           VALUES (?, ?)`,
          [idEmpleado, idProyecto]
        );
      }

      await connection.execute(
        `UPDATE proyecto
         SET cantidad_actual_empleados = (
           SELECT COUNT(*)
           FROM empleado_proyecto
           WHERE id_proyecto = ?
         )
         WHERE id_proyecto = ?`,
        [idProyecto, idProyecto]
      );

      await connection.commit();

      return { ok: true };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  //* =========================================
  //* SCORE
  //* =========================================
  static calculateScore(matches, totalSkills, experiencia, precio) {

    const pesoSkills = 0.6;
    const pesoExp = 0.25;
    const pesoPrecio = 0.15;

    const scoreSkills = totalSkills
      ? (matches / totalSkills) * 100
      : 0;

    const scoreExp = experiencia * 10;

    const maxPrecio = 1000;

    const scorePrecio = precio
      ? (1 - Math.min(precio, maxPrecio) / maxPrecio) * 100
      : 50;

    return Number(
      (
        scoreSkills * pesoSkills +
        scoreExp * pesoExp +
        scorePrecio * pesoPrecio
      ).toFixed(2)
    );
  }

  //* =========================================
  //* SKILLS
  //* =========================================
  static parseSkillsProyecto(data) {
    try {
      const parsed =
        typeof data === 'string'
          ? JSON.parse(data)
          : data;

      return parsed.map(s => s.skill.toLowerCase());
    } catch {
      return [];
    }
  }

  static getMatchingSkills(skillsEmpleado, skillsProyecto) {
    const skillsEmpLower =
      skillsEmpleado.map(s => s.toLowerCase());

    return skillsProyecto.filter(skill =>
      skillsEmpLower.includes(skill)
    );
  }
}

module.exports = MatchingService;