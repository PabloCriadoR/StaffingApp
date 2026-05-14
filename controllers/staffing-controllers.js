const StaffingService = require('../services/staffing-service');

class StaffingController {

    static async obtenerStaffing(req, res) {

        try {

            const { fechaInicio, fechaFin } = req.body;

            if (!fechaInicio || !fechaFin) {
                return res.status(400).json({
                    message: 'fechaInicio y fechaFin son obligatorias'
                });
            }

            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);

            const diffDias = (fin - inicio) / (1000 * 60 * 60 * 24);

            // Debe ser exactamente 4 días (lunes-viernes = 5 días)
            if (diffDias !== 4) {
                return res.status(400).json({
                    message: 'El rango debe ser exactamente una semana laboral (lunes a viernes)'
                });
            }

            const resultado = await StaffingService.obtenerStaffingPorSemana(
                fechaInicio,
                fechaFin
            );

            return res.status(200).json(resultado);

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = StaffingController;