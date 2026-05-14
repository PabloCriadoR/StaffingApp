const DB = require('../config/db');

class EmployeeService {

  static async save(cv, nombre, apellido1, apellido2) {
    const sql = `
      INSERT INTO empleado 
      (nombre, apellido1, apellido2, email, skills, experiencia, cliente_principal, precio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const skillsArray = Array.isArray(cv.skills)
      ? cv.skills
      : cv.skills
        ? [cv.skills]
        : [];

    await DB.pool.execute(sql, [
      nombre,
      apellido1,
      apellido2,
      cv.email,
      JSON.stringify(skillsArray),
      cv.years_experience,
      cv.main_client || null,
      cv.precio || 0 
    ]);
  }

  static async getAll() {
    const sql = `
      SELECT 
        id,
        nombre,
        apellido1,
        apellido2,
        email,
        skills,
        experiencia,
        cliente_principal,
        precio
      FROM empleado
    `;

    const [rows] = await DB.pool.execute(sql);
    return rows.map(this.parseEmployee);
  }

  static async getById(id) {
    const sql = `
      SELECT 
        id,
        nombre,
        apellido1,
        apellido2,
        email,
        skills,
        experiencia,
        cliente_principal,
        precio
      FROM empleado
      WHERE id = ?
    `;

    const [rows] = await DB.pool.execute(sql, [id]);

    if (!rows.length) return null;

    return this.parseEmployee(rows[0]);
  }

  static async deleteById(id) {
    const sql = `DELETE FROM empleado WHERE id = ?`;
    const [result] = await DB.pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  static parseEmployee(e) {
    let skillsParsed;

    if (Array.isArray(e.skills)) {
      skillsParsed = e.skills;
    } else if (typeof e.skills === 'string') {
      try {
        skillsParsed = JSON.parse(e.skills);
        if (!Array.isArray(skillsParsed)) {
          skillsParsed = [skillsParsed];
        }
      } catch {
        skillsParsed = e.skills
          ? e.skills.split(',').map(s => s.trim())
          : [];
      }
    } else {
      skillsParsed = [];
    }

    return {
      ...e,
      skills: skillsParsed
    };
  }
}

module.exports = EmployeeService;