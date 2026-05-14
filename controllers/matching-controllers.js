const MatchingService = require('../services/matching-service.js');

class MatchingController {

  //* =========================================
  //* GET EMPLEADOS CANDIDATOS
  //* =========================================
  static async getEmployeeCandidates(req, res) {

    try {

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: 'El id del proyecto es obligatorio'
        });
      }

      const resultado =
        await MatchingService.getEmployeeCandidates(id);

      return res.json({
        total: resultado.candidatos.length,
        data: resultado
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error:
          error.message ||
          'Error obteniendo candidatos'
      });
    }
  }

  //* =========================================
  //* GET EQUIPOS ÓPTIMOS
  //* =========================================
  static async getOptimalTeams(req, res) {

    try {

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: 'El id del proyecto es obligatorio'
        });
      }

      const resultado =
        await MatchingService.getOptimalTeams(id);

      return res.json({
        total: resultado.equipos_optimos.length,
        data: resultado
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error:
          error.message ||
          'Error obteniendo equipos'
      });
    }
  }

  //* =========================================
  //* GENERAR Y GUARDAR RANKING
  //* =========================================
  static async generateAndSave(req, res) {

    try {

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: 'El id del proyecto es obligatorio'
        });
      }

      const resultado =
        await MatchingService.getEmployeeCandidates(id);

      await MatchingService.saveResults(
        id,
        resultado.candidatos
      );

      return res.json({
        message:
          'Ranking generado y guardado correctamente',
        total: resultado.candidatos.length,
        data: resultado
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error:
          error.message ||
          'Error generando ranking'
      });
    }
  }

  //* =========================================
  //* ASIGNAR EMPLEADOS
  //* =========================================
  static async assignEmployees(req, res) {

    try {

      const { idProyecto, empleados } = req.body;

      if (
        !idProyecto ||
        !Array.isArray(empleados)
      ) {
        return res.status(400).json({
          error: 'Datos inválidos'
        });
      }

      const result =
        await MatchingService.assignEmployeesToProject(
          idProyecto,
          empleados
        );

      return res.json({
        status: 'ok',
        data: result
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error: error.message
      });
    }
  }
}

module.exports = MatchingController;