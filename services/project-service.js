const db = require('../config/db');

class ProjectService {

  // ==============================
  // VALIDACIÓN
  // ==============================
  static validate(data) {
    const {
      nombre,
      empleados_por_skill,
      fecha_inicio,
      fecha_fin,
      cantidad_maxima_jornadas
    } = data;

    if (!nombre) return 'El nombre es obligatorio';

    if (!Array.isArray(empleados_por_skill) || empleados_por_skill.length === 0) {
      return 'Las skills son obligatorias';
    }

    for (const s of empleados_por_skill) {
      if (!s.skill || typeof s.skill !== 'string' || !s.skill.trim()) {
        return 'Cada skill debe tener un nombre válido';
      }
    }

    if (!fecha_inicio || !fecha_fin) {
      return 'Las fechas son obligatorias';
    }

    if (
      typeof cantidad_maxima_jornadas !== 'number' ||
      cantidad_maxima_jornadas < 0
    ) {
      return 'La cantidad máxima de jornadas debe ser válida';
    }

    return null;
  }

  // ==============================
  // PARSE JSON
  // ==============================
  static parseJSON(data) {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return Array.isArray(data) ? data : [];
  }

  // ==============================
  // CALCULAR EMPLEADOS REQUERIDOS
  // (skills repetidas = 1 empleado)
  // ==============================
  static calculateTotalEmployees(empleados_por_skill) {
    const parsed = Array.isArray(empleados_por_skill)
      ? empleados_por_skill
      : [];

    return parsed.length;
  }

  // ==============================
  // FORMATEAR PARA BD
  // ==============================
  static toDBFormat(data) {
    const empleadosPorSkillArray = Array.isArray(data.empleados_por_skill)
      ? data.empleados_por_skill
      : data.empleados_por_skill
        ? [data.empleados_por_skill]
        : [];

    return {
      ...data,
      descripcion: data.descripcion || null,

      empleados_por_skill: JSON.stringify(empleadosPorSkillArray),

      cantidad_maxima_jornadas: data.cantidad_maxima_jornadas || 0,
      cantidad_actual_jornadas: data.cantidad_actual_jornadas || 0,

      cantidad_actual_empleados: data.cantidad_actual_empleados || 0,
      total_empleados_requeridos: this.calculateTotalEmployees(empleadosPorSkillArray),

      coste: data.coste || 0
    };
  }

  // ==============================
  // CREATE PROJECT
  // ==============================
  static async save(data) {
    const error = this.validate(data);
    if (error) throw new Error(error);

    const project = this.toDBFormat(data);

    const query = `
      INSERT INTO proyecto (
        nombre,
        descripcion,
        empleados_por_skill,
        cantidad_maxima_jornadas,
        cantidad_actual_jornadas,
        cantidad_actual_empleados,
        fecha_inicio,
        fecha_fin,
        coste,
        total_empleados_requeridos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      project.nombre,
      project.descripcion,
      project.empleados_por_skill,
      project.cantidad_maxima_jornadas,
      project.cantidad_actual_jornadas,
      project.cantidad_actual_empleados,
      project.fecha_inicio,
      project.fecha_fin,
      project.coste,
      project.total_empleados_requeridos
    ];

    const [result] = await db.pool.execute(query, values);
    return result;
  }

  // ==============================
  // GET ALL
  // ==============================
  static async getAll() {
    const [rows] = await db.pool.execute(`SELECT * FROM proyecto`);

    return rows.map(p => {
      let jornadas = 0;

      if (p.fecha_inicio) {
        const inicio = new Date(p.fecha_inicio);
        const hoy = new Date();

        const diffTime = hoy - inicio;
        jornadas = Math.max(
          0,
          Math.floor(diffTime / (1000 * 60 * 60 * 24))
        );
      }

      return {
        ...p,
        cantidad_actual_jornadas: jornadas, // ✅ recalculado siempre
        empleados_por_skill: this.parseJSON(p.empleados_por_skill)
      };
    });
  }

  // ==============================
  // GET BY ID
  // ==============================
  static async getById(id) {
    const [rows] = await db.pool.execute(
      `SELECT * FROM proyecto WHERE id_proyecto = ?`,
      [id]
    );

    if (!rows.length) return null;

    return {
      ...rows[0],
      empleados_por_skill: this.parseJSON(rows[0].empleados_por_skill)
    };
  }

  // ==============================
  // DELETE
  // ==============================
  static async deleteById(id) {
    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `DELETE FROM empleado_proyecto WHERE id_proyecto = ?`,
        [id]
      );

      await connection.execute(
        `DELETE FROM empleado_optimo WHERE id_proyecto = ?`,
        [id]
      );

      const [result] = await connection.execute(
        `DELETE FROM proyecto WHERE id_proyecto = ?`,
        [id]
      );

      await connection.commit();
      return result.affectedRows > 0;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==============================
  // ASIGNAR EMPLEADO
  // ==============================
  static async assignEmployee(idEmpleado, idProyecto, asignado) {

    const [existing] = await db.pool.execute(
      `SELECT * FROM empleado_proyecto 
       WHERE id_empleado = ? AND id_proyecto = ?`,
      [idEmpleado, idProyecto]
    );

    if (asignado) {

      if (existing.length > 0) {
        return { alreadyAssigned: true };
      }

      const [[proyecto]] = await db.pool.execute(
        `SELECT * FROM proyecto WHERE id_proyecto = ?`,
        [idProyecto]
      );

      if (!proyecto) {
        throw new Error('Proyecto no existe');
      }

      await db.pool.execute(
        `INSERT INTO empleado_proyecto (id_empleado, id_proyecto)
         VALUES (?, ?)`,
        [idEmpleado, idProyecto]
      );

      // INCREMENTAR CONTADOR
      await db.pool.execute(
        `UPDATE proyecto 
         SET cantidad_actual_empleados = cantidad_actual_empleados + 1
         WHERE id_proyecto = ?`,
        [idProyecto]
      );

      return { assigned: true };
    }

    // UNASSIGN
    if (existing.length === 0) {
      return { alreadyUnassigned: true };
    }

    await db.pool.execute(
      `DELETE FROM empleado_proyecto 
       WHERE id_empleado = ? AND id_proyecto = ?`,
      [idEmpleado, idProyecto]
    );

    // DECREMENTAR CONTADOR
    await db.pool.execute(
      `UPDATE proyecto 
       SET cantidad_actual_empleados = cantidad_actual_empleados - 1
       WHERE id_proyecto = ?`,
      [idProyecto]
    );

    return { unassigned: true };
  }
}

module.exports = ProjectService;