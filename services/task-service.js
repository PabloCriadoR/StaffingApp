const db = require('../config/db');

class TaskService {

  // ==============================
  // NORMALIZACIÓN
  // ==============================
  static normalize(data) {
    return {
      nombre: data.nombre,
      descripcion: data.descripcion || null,

      duracion_estimada: Number(data.duracion_estimada),

      id_proyecto: Number(data.id_proyecto),
      id_empleado: data.id_empleado ? Number(data.id_empleado) : null,

      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,

      estado: data.estado?.trim() || 'Pendiente',
      prioridad: data.prioridad?.trim() || 'Media'
    };
  }

  // ==============================
  // VALIDACIÓN
  // ==============================
  static validate(data) {
    const {
      nombre,
      duracion_estimada,
      id_proyecto,
      fecha_inicio,
      fecha_fin
    } = data;

    if (!nombre) return 'El nombre es obligatorio';

    if (isNaN(duracion_estimada)) {
      return 'La duración estimada debe ser válida';
    }

    if (isNaN(id_proyecto)) {
      return 'El id_proyecto es obligatorio';
    }

    if (!fecha_inicio || !fecha_fin) {
      return 'Las fechas son obligatorias';
    }

    return null;
  }

  // ==============================
  // GUARDAR TAREA
  // ==============================
  static async save(data) {
    const task = this.normalize(data);

    const error = this.validate(task);
    if (error) throw new Error(error);

    const query = `
      INSERT INTO tareas (
        nombre,
        descripcion,
        duracion_estimada,
        id_proyecto,
        id_empleado,
        fecha_inicio,
        fecha_fin,
        estado,
        prioridad
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      task.nombre,
      task.descripcion,
      task.duracion_estimada,
      task.id_proyecto,
      task.id_empleado,
      task.fecha_inicio,
      task.fecha_fin,
      task.estado,
      task.prioridad
    ];

    const [result] = await db.pool.execute(query, values);
    return result;
  }

  // ==============================
  // GET ALL TAREAS
  // ==============================
  static async getAll() {
    const query = `
      SELECT 
        t.id_tarea,
        t.nombre,
        t.descripcion,
        t.duracion_estimada,
        t.fecha_inicio,
        t.fecha_fin,
        t.estado,
        t.prioridad,

        p.nombre AS nombre_proyecto,

        CONCAT(
          e.nombre, ' ', e.apellido1, ' ',
          IFNULL(e.apellido2, '')
        ) AS nombre_empleado

      FROM tareas t
      LEFT JOIN proyecto p ON t.id_proyecto = p.id_proyecto
      LEFT JOIN empleado e ON t.id_empleado = e.id
    `;

    const [rows] = await db.pool.execute(query);
    return rows;
  }

  // ==============================
  // BORRAR TAREA
  // ==============================
  static async deleteById(id) {
    const [result] = await db.pool.execute(
      `DELETE FROM tareas WHERE id_tarea = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

module.exports = TaskService;