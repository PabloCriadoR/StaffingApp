const FileService = require('../services/file-service');
const CVService = require('../services/cv-service');
const EmployeeService = require('../services/employee-service');

class CVController {
  static async uploadCV(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).send('No se subió ningún archivo');
      }

      const text = await FileService.extractText(file);

      const normalized = CVService.normalizeText(text);

      const cv = {
        name: CVService.extractName(text),
        email: CVService.extractEmail(text),
        skills: CVService.extractSkills(normalized),
        years_experience: CVService.estimateExperienceByDates(text) // ahora se usa el texto original con contexto
      };

      //* === VALIDACIONES OBLIGATORIAS ===
      //* (Estas validaciones DEBEN estar dentro del endpoint,
      //* ya que dependen de cv y res)
      if (!cv.email) {
        return res.status(400).json({
          status: 'error',
          message: 'No se pudo extraer el email del CV'
        });
      }

      if (!cv.name) {
        return res.status(400).json({
          status: 'error',
          message: 'No se pudo extraer el nombre del CV'
        });
      }

      if (cv.years_experience === null) {
        return res.status(400).json({
          status: 'error',
          message: 'No se pudo calcular la experiencia del CV'
        });
      }

      //* === SEPARAR NOMBRE Y APELLIDOS ===
      const { nombre, apellido1, apellido2 } = CVService.splitName(cv.name);

      //* === DEBUG PREVIO A INSERT ===
      //* (Permite ver exactamente qué se va a mandar a MySQL)
      console.log('DATOS A INSERTAR', {
        nombre,
        apellido1,
        apellido2,
        email: cv.email,
        skills: cv.skills,
        experiencia: cv.years_experience,
      });

      await EmployeeService.save(cv, nombre, apellido1, apellido2);

      res.json({
        status: 'ok',
        message: 'Empleado creado correctamente',
        cv
      });

    } catch (error) {
      //* === ERROR REAL EN CONSOLA ===
      //* (Esto es CLAVE para detectar el 500)
      console.error('ERROR 500 REAL:', error);

      // Control de email duplicado
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          status: 'error',
          message: 'El empleado ya existe '
        });
      }

      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = CVController;