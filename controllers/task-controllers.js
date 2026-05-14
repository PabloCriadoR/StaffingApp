const TaskService = require('../services/task-service.js');

class TaskController {

  // ==============================
  // CREAR TAREA
  // ==============================
  static async createTask(req, res) {
    try {
      const result = await TaskService.save(req.body);

      res.json({
        status: 'ok',
        message: 'Tarea creada correctamente',
        id: result.insertId
      });

    } catch (error) {
      console.error('ERROR CREATE TASK:', error);

      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // ==============================
  // GET DE LAS TAREAS
  // ==============================
  static async getAllTasks(req, res) {
    try {
      const tasks = await TaskService.getAll();

      res.json({
        status: 'ok',
        data: tasks
      });

    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // ==============================
  // BRORRAR TAREA
  // ==============================
  static async deleteTask(req, res) {
    try {
        const deleted = await TaskService.deleteById(req.params.id);

        if (!deleted) {
        return res.status(404).json({
            status: 'error',
            message: 'Tarea no encontrada'
        });
        }

        res.json({
        status: 'ok',
        message: 'Tarea eliminada correctamente'
        });

    } catch (error) {
        console.error('ERROR DELETE TASK:', error);

        res.status(500).json({
        status: 'error',
        message: error.message
        });
    }
    }
}

module.exports = TaskController;