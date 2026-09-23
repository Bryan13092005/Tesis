const { pool } = require('../config/supabase');

async function verificarSistemaOnline(req, res, next) {
    try {
        const resultado = await pool.query(`
            SELECT temperatura, humedad, gas, humedad_planta, estado_gas
            FROM "valorActual_sensores"
            WHERE fecha_hora >= NOW() - INTERVAL '2 minutes'
            ORDER BY fecha_hora DESC
            LIMIT 1
        `);

        if (resultado.rows.length === 0) {
            return res.status(503).json({
                success: false,
                online: false,
                error: 'El sistema está offline. No hay datos recientes de sensores.'
            });
        }

        const lectura = resultado.rows[0];
        const hayValorNumerico = [
            lectura.temperatura,
            lectura.humedad,
            lectura.gas,
            lectura.humedad_planta
        ].some((valor) => valor !== null && valor !== undefined && Number.isFinite(Number(valor)));
        const hayEstadoGas = ['NORMAL', 'ALERTA'].includes(lectura.estado_gas);

        if (!hayValorNumerico && !hayEstadoGas) {
            return res.status(503).json({
                success: false,
                online: false,
                error: 'El sistema está offline. Los datos de sensores no son válidos.'
            });
        }

        next();
    } catch (error) {
        console.error('Error verificando disponibilidad del sistema:', error);
        return res.status(503).json({
            success: false,
            online: false,
            error: 'No se pudo verificar si el sistema está online.'
        });
    }
}

module.exports = verificarSistemaOnline;
