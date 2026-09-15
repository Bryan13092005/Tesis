const { pool } = require('../config/supabase');
const { sensoresActuales } = require('./sensores.service');

setInterval(async () => {

    try {

        if (
            sensoresActuales.temperatura === null &&
            sensoresActuales.humedad === null &&
            sensoresActuales.gas === null &&
            sensoresActuales.humedad_planta === null
        ) {
            console.log('Todavía no hay datos de sensores para guardar.');
            return;
        }

        await pool.query(`
            INSERT INTO historial_sensores (
                temperatura,
                humedad,
                gas,
                humedad_planta
            )
            VALUES ($1, $2, $3, $4)
        `, [
            sensoresActuales.temperatura,
            sensoresActuales.humedad,
            sensoresActuales.gas,
            sensoresActuales.humedad_planta
        ]);

        console.log('📊 Historial de sensores guardado');

    } catch (error) {
        console.error('Error guardando historial:', error);
    }

}, 60000);