const { pool } = require('../config/supabase');

async function verificarModoSeguroActivo(req, res, next) {
    try {
        const resultado = await pool.query(
            `SELECT resultado
             FROM historial_acciones
             WHERE resultado IN ('BLOQUEADO', 'DESBLOQUEADO')
             ORDER BY fecha_hora DESC
             LIMIT 1`
        );

        if (resultado.rows[0]?.resultado === 'BLOQUEADO') {
            return res.status(423).json({
                success: false,
                bloqueado: true,
                error: 'El modo seguro está activado. No se puede abrir el garaje o la puerta principal.'
            });
        }

        next();
    } catch (error) {
        console.error('Error verificando el modo seguro:', error);
        return res.status(503).json({
            success: false,
            error: 'No se pudo verificar el estado del modo seguro.'
        });
    }
}

module.exports = verificarModoSeguroActivo;
