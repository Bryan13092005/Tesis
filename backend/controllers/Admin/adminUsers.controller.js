const { pool } = require('../../config/supabase');
const supabaseAdminClient = require('../../config/supabaseAdmin');

const verUsuarios = async (req, res) => {
    try{
        const query = `SELECT * FROM perfiles`;
        const resultado = await pool.query(query);
        res.status(200).json({
            success: true,
            data: resultado.rows
        });

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron usuarios'
            });
        }

    }catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}

const eliminarUsuario = async (req, res) => {
    try {
        const usuarioId = req.params.id;

        if (!usuarioId) {
            return res.status(400).json({
                success: false,
                error: 'El ID del usuario es requerido'
            });
        }

        const { data, error: supabaseError } = await supabaseAdminClient.auth.admin.deleteUser(usuarioId);

        if (supabaseError) {
            return res.status(400).json({
                success: false,
                error: `Error al eliminar de Supabase Auth: ${supabaseError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Usuario y perfil eliminados correctamente mediante cascada/trigger.'
        });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const eliminarMiUsuario = async (req, res) => {
    try {
        const usuarioId = req.user.id; // ID del administrador que hace la petición

        // 1. Contamos cuántos administradores quedan en total en el sistema
        const resultado = await pool.query(
            "SELECT COUNT(*) FROM perfiles WHERE rol = 'ADMINISTRADOR'"
        );

        // pg mapea el COUNT(*) en la propiedad rows[0].count como un string
        const totalAdmins = parseInt(resultado.rows[0].count, 10);

        // 2. Si solo queda 1 administrador (él mismo), denegamos el borrado
        if (totalAdmins <= 1) {
            return res.status(403).json({
                success: false,
                error: 'Operación denegada. No se puede eliminar el último administrador del sistema.'
            });
        }

        // 3. Eliminamos de Supabase Auth (el ON DELETE CASCADE de tu tabla limpiará el perfil en Postgres)
        const { error: supabaseError } = await supabaseAdminClient.auth.admin.deleteUser(usuarioId);

        if (supabaseError) {
            return res.status(400).json({
                success: false,
                error: `Error al eliminar de Supabase Auth: ${supabaseError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Administrador eliminado exitosamente en cascada.'
        });

    } catch (error) {
        console.error('Error al eliminar administrador:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const cambiarClaveUsuario = async (req, res) => {
    try {
        // ID del usuario al que se le cambiará la clave y la nueva contraseña
        const { usuarioId, nuevaPassword } = req.body;

        // Validaciones básicas de entrada
        if (!usuarioId || !nuevaPassword) {
            return res.status(400).json({
                success: false,
                error: 'El ID del usuario y la nueva contraseña son requeridos.'
            });
        }

        if (nuevaPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña debe tener al menos 6 caracteres.'
            });
        }

        // Ejecución administrativa en Supabase Auth
        const { data, error: supabaseError } = await supabaseAdminClient.auth.admin.updateUserById(
            usuarioId,
            { password: nuevaPassword }
        );

        if (supabaseError) {
            return res.status(400).json({
                success: false,
                error: `Error al actualizar en Supabase Auth: ${supabaseError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'La contraseña del usuario ha sido actualizada exitosamente por el administrador.'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña de usuario:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const actualizarPerfilUsuario = async (req, res) => {
    try {
        const usuarioId = req.params.id;
        const { nombre, apellido, email, password } = req.body;

        // ==========================================
        // ACTUALIZAR PERFIL EN POSTGRES
        // ==========================================

        if (nombre !== undefined || apellido !== undefined) {
            const nuevoNombre = nombre !== undefined ? nombre : null;
            const nuevoApellido = apellido !== undefined ? apellido : null;

            await pool.query(
                `UPDATE perfiles
                SET nombre = $1,
                    apellido = $2
                WHERE id = $3`,
                [nuevoNombre, nuevoApellido, usuarioId]
            );
        }

        // ==========================================
        // ACTUALIZAR EMAIL / PASSWORD EN SUPABASE AUTH
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
                    error: `Error al actualizar en Supabase Auth: ${error.message}`
                });
            }
        }

        // ==========================================
        // RESPUESTA
        // ==========================================

        return res.status(200).json({
            success: true,
            message: 'Perfil del usuario actualizado exitosamente.'
        });

    } catch (error) {
        console.error('Error al actualizar perfil del usuario:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const cambiarEstadoUsuario = async (req, res) => {
    try {
        const usuarioId = req.params.id;
        const { nuevoEstado } = req.body;

        if (typeof nuevoEstado !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El nuevo estado debe ser un valor booleano.'
            });
        }

        const resultado = await pool.query(
            'UPDATE perfiles SET estado = $1 WHERE id = $2 RETURNING *',
            [nuevoEstado, usuarioId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            message: `El estado del usuario ha sido actualizado a ${nuevoEstado ? 'activo' : 'bloqueado'}.`,
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const crearUsuario = async (req, res) => {
    try {
        const { nombre, apellido, email, password, rol, permisos} = req.body;
        // Validaciones básicas de entrada
        if (!nombre || !apellido || !email || !password || !rol) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos (nombre, apellido, email, password, rol) son requeridos.'
            });
        }

        // permisos :{
        //     acceso1: true,
        //     acceso2: false,
        //     ...
        // }
        
        // ==========================================
        // CREAR USUARIO EN SUPABASE AUTH
        // ==========================================

        const { data, error: supabaseError } = await supabaseAdminClient.auth.admin.createUser({
            email,
            password,
            user_metadata: { nombre, apellido, rol, permisos }
        });

        if (supabaseError) {
            return res.status(400).json({
                success: false,
                error: `Error al crear usuario en Supabase Auth: ${supabaseError.message}`
            });
        }
    }catch (error) {
        console.error('Error al crear usuario:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const cambiarMiClave = async (req, res) => {
    try {
        const usuarioId = req.user.id; // ID del usuario autenticado
        const { nuevaPassword } = req.body;

        // Validaciones básicas de entrada
        if (!nuevaPassword) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña es requerida.'
            });
        }

        if (nuevaPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña debe tener al menos 6 caracteres.'
            });
        }

        // Ejecución administrativa en Supabase Auth
        const { data, error: supabaseError } = await supabaseAdminClient.auth.admin.updateUserById(
            usuarioId,
            { password: nuevaPassword }
        );

        if (supabaseError) {
            return res.status(400).json({
                success: false,
                error: `Error al actualizar en Supabase Auth: ${supabaseError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Tu contraseña ha sido actualizada exitosamente.'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña del usuario:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}



module.exports = {
    verUsuarios,
    eliminarUsuario,
    eliminarMiUsuario,
    cambiarClaveUsuario,
    actualizarPerfilUsuario,
    cambiarEstadoUsuario,
    crearUsuario,
    cambiarMiClave
};