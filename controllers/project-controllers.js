const ProjectService = require('../services/project-service');

class ProjectController {

  static async createProject(req, res) {
    try {
      const result = await ProjectService.save(req.body);

      res.json({
        status: 'ok',
        message: 'Proyecto creado correctamente',
        id: result.insertId
      });

    } catch (error) {
      console.error('ERROR CREATE PROJECT:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          status: 'error',
          message: 'El proyecto ya existe'
        });
      }

      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async getAllProjects(req, res) {
    try {
      const projects = await ProjectService.getAll();

      res.json({
        status: 'ok',
        data: projects
      });

    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async assignEmployee(req, res) {
    try {
      const { idEmpleado, idProyecto, asignado } = req.body;

      if (!idEmpleado || !idProyecto || typeof asignado !== 'boolean') {
        return res.status(400).json({
          status: 'error',
          message: 'Datos inválidos'
        });
      }

      const result = await ProjectService.assignEmployee(
        idEmpleado,
        idProyecto,
        asignado
      );

      res.json({
        status: 'ok',
        data: result
      });

    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async deleteProject(req, res) {
    try {
      const deleted = await ProjectService.deleteById(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          message: 'Proyecto no encontrado'
        });
      }

      res.json({
        status: 'ok',
        message: 'Proyecto eliminado'
      });

    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = ProjectController;