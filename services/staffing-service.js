const db = require('../config/db');

function normalizar(fecha) {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
}

function dentroDeRango(dia, inicio, fin) {
    return dia >= inicio && dia <= fin;
}

function generarSemana(fechaInicio) {
    const dias = [];
    const start = normalizar(fechaInicio);

    for (let i = 0; i < 5; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dias.push(normalizar(d));
    }

    return dias;
}

function calcularDias(inicio, fin) {
    return Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
}

class StaffingService {

    static async obtenerStaffingPorSemana(fechaInicio, fechaFin) {

        const query = `
            SELECT 
                e.id,
                e.nombre,
                e.apellido1,
                e.apellido2,

                t.id_tarea,
                t.nombre AS nombre_tarea,
                t.fecha_inicio,
                t.fecha_fin,
                t.duracion_estimada

            FROM empleado e

            LEFT JOIN tareas t 
                ON t.id_empleado = e.id
                AND t.fecha_inicio <= ?
                AND t.fecha_fin >= ?

            ORDER BY e.id;
        `;

        const [rows] = await db.pool.execute(query, [fechaFin, fechaInicio]);

        const semana = generarSemana(fechaInicio);

        const empleados = new Map();
        const tareasPorEmpleado = new Map();

        // Agrupar tareas
        rows.forEach(row => {

            if (!empleados.has(row.id)) {
                empleados.set(row.id, {
                    id: row.id,
                    nombre: row.nombre,
                    apellido1: row.apellido1,
                    apellido2: row.apellido2,
                    ocupado: semana.map(d => ({
                        dia: d.toISOString().split('T')[0],
                        porcentaje: 0,
                        tareas: []
                    }))
                });
            }

            if (row.id_tarea) {
                if (!tareasPorEmpleado.has(row.id)) {
                    tareasPorEmpleado.set(row.id, []);
                }
                tareasPorEmpleado.get(row.id).push(row);
            }
        });

        // Calcular carga REAL
        tareasPorEmpleado.forEach((tareas, idEmpleado) => {

            const emp = empleados.get(idEmpleado);

            tareas.forEach(tarea => {

                const inicio = normalizar(tarea.fecha_inicio);
                const fin = normalizar(tarea.fecha_fin);

                const diasReales = calcularDias(inicio, fin);

                // CLAVE
                const porcentajePorDia =
                    (tarea.duracion_estimada / diasReales) * 100;

                emp.ocupado.forEach(slot => {

                    const dia = normalizar(new Date(slot.dia));

                    if (dentroDeRango(dia, inicio, fin)) {

                        slot.porcentaje += porcentajePorDia;

                        slot.tareas.push(tarea.nombre_tarea);
                    }
                });
            });
        });

        // Redondeo
        empleados.forEach(emp => {
            emp.ocupado.forEach(slot => {
                slot.porcentaje = Math.round(slot.porcentaje * 100) / 100;
            });
        });

        return Array.from(empleados.values());
    }
}

module.exports = StaffingService;
