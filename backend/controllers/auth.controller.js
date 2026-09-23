const { pool } = require('../config/supabase');
const { supabaseAdminClient } = require('../config/supabaseAdmin');

const actualizarPerfil=async(req, res)=> {

    try {

        const usuarioId = req.user.id;

        const {
            nombre,
            apellido,
            email,
            password
        } = req.body;

        // ==========================================
        // ACTUALIZAR PERFIL
        // ==========================================

        if (nombre !== undefined || apellido !== undefined) {

            const actual = await pool.query(
                `
                SELECT nombre, apellido
                FROM perfiles
                WHERE id = $1
                `,
                [usuarioId]
            );

            if (actual.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Perfil no encontrado'
                });
            }

            const nuevoNombre =
                nombre !== undefined
                    ? nombre
                    : actual.rows[0].nombre;

            const nuevoApellido =
                apellido !== undefined
                    ? apellido
                    : actual.rows[0].apellido;

            await pool.query(
                `
                UPDATE perfiles
                SET
                    nombre = $1,
                    apellido = $2
                WHERE id = $3
                `,
                [
                    nuevoNombre,
                    nuevoApellido,
                    usuarioId
                ]
            );
        }


        // ==========================================
        // ACTUALIZAR EMAIL / PASSWORD
        // ==========================================

        const cambiosAuth = {};

        if (email !== undefined) {
            cambiosAuth.email = email;
        }

        if (password !== undefined) {
            cambiosAuth.password = password;
        }

        if (Object.keys(cambiosAuth).length > 0) {

            const { error } = await supabaseAdminClient.auth.admin.updateUserById(
                usuarioId,
                cambiosAuth
            );

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        }


        // ==========================================
        // RESPUESTA
        // ==========================================

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente'
        });

    } catch (error) {

        console.error(
            'Error actualizando perfil:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}

module.exports = {
    actualizarPerfil
};