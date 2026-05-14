const FilterService = require('../services/filter-service');

class FilterController {

  static async getEmployeesByProject(req, res) {
    try {
      const { idProyecto } = req.body;

      if (!idProyecto) {
        return res.status(400).json({
          status: 'error',
          message: 'idProyecto es obligatorio'
        });
      }

      const employees = await FilterService.getEmployeesByProject(idProyecto);

      res.json({
        status: 'ok',
        data: employees
      });

    } catch (error) {
      console.error('ERROR FILTER:', error);

      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = FilterController;