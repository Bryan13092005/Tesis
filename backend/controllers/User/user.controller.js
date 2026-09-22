const { pool } = require('../../config/supabase');

const verPerfil = async (req, res) => {
    try {
        const usuarioId = req.user.id;

        const resultado = await pool.query(
            `
            SELECT nombre, apellido, rol, "permisosAcceso"
            FROM perfiles
            WHERE id = $1
            `,
            [usuarioId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Perfil no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

module.exports = {
    verPerfil
};