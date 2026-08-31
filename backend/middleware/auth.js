const supabase = require('../config/database');
const { pool } = require('../config/supabase.js');


// =====================================================
// VERIFICAR AUTENTICACIÓN
// =====================================================

async function verificarAuth(req, res, next) {

    try {

        const header = req.headers.authorization;

        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No autorizado'
            });
        }

        const token = header.substring(7);

        const {
            data: { user },
            error
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido o expirado'
            });
        }

        // Guardamos el usuario autenticado
        req.user = user;

        next();

    } catch (error) {

        console.error('Error verificando autenticación:', error);

        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}


// =====================================================
// AUTORIZAR ROL
// =====================================================

function autorizarRol(rolNecesario) {

    return async (req, res, next) => {

        try {

            // Verificamos que verificarAuth haya sido ejecutado
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuario no autenticado'
                });
            }

            const resultado = await pool.query(
                'SELECT rol, estado FROM perfiles WHERE id = $1',
                [req.user.id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Perfil de usuario no encontrado'
                });
            }

            const { rol, estado } = resultado.rows[0];


            // =============================================
            // USUARIO BLOQUEADO
            // =============================================

            if (!estado) {
                return res.status(403).json({
                    success: false,
                    error: 'Tu usuario está bloqueado'
                });
            }


            // =============================================
            // VERIFICAR ROL
            // =============================================

            if (rol !== rolNecesario) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para acceder a este recurso'
                });
            }


            // Guardamos el perfil para utilizarlo
            // posteriormente en el controller
            req.perfil = resultado.rows[0];

            next();

        } catch (error) {

            console.error('Error verificando rol:', error);

            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    };
}


module.exports = {
    verificarAuth,
    autorizarRol
};
