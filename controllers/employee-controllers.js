const EmployeeService = require('../services/employee-service');

class EmployeeController {
  static async getAllEmployees(req, res) {
    try {
      const employees = await EmployeeService.getAll();

      res.json({
        status: 'ok',
        data: employees
      });

    } catch (error) {
      console.error('ERROR GET EMPLOYEES:', error);

      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
  
  static async deleteEmployee(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID requerido' });
    }

    const deleted = await EmployeeService.deleteById(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    return res.json({ message: 'Empleado eliminado correctamente' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar empleado' });
  }
}
}

module.exports = EmployeeController;