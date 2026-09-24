const { pool } = require('../../config/supabase');
const {supabaseAdminClient} = require('../../config/supabaseAdmin');

const verUsuarios = async (req, res) => {
    try{
        const query = `SELECT * FROM perfiles`;
        const resultado = await pool.query(query);

        const { data: authData, error: authError } = await supabaseAdminClient.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });

        if (authError) {
            return res.status(400).json({
                success: false,
                error: `Error al obtener usuarios de Supabase Auth: ${authError.message}`
            });
        }

        const perfiles = new Map(resultado.rows.map((perfil) => [perfil.id, perfil]));
        const usuarios = authData.users.map((usuario) => ({
            ...perfiles.get(usuario.id),
            id: usuario.id,
            uuid: usuario.id,
            email: usuario.email,
            user_metadata: {
                ...usuario.user_metadata,
                uuid: usuario.id
            },
            created_at: usuario.created_at,
            last_sign_in_at: usuario.last_sign_in_at
        }));

        return res.status(200).json({
            success: true,
            data: usuarios
        });

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
            "SELECT COUNT(*) FROM perfiles WHERE rol = 'admin'"
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
        const { nombre, apellido, email, password, rol } = req.body;

        // ==========================================
        // ACTUALIZAR PERFIL EN POSTGRES
        // ==========================================

        if (nombre !== undefined || apellido !== undefined || rol !== undefined) {
            const nuevoNombre = nombre !== undefined ? nombre : null;
            const nuevoApellido = apellido !== undefined ? apellido : null;
            const nuevoRol = rol !== undefined ? rol : null;

            await pool.query(
                `UPDATE perfiles
                SET nombre = $1,
                    apellido = $2,
                    rol = COALESCE($3, rol)
                WHERE id = $4`,
                [nuevoNombre, nuevoApellido, nuevoRol, usuarioId]
            );
        }

        // ==========================================
        // ACTUALIZAR EMAIL / PASSWORD EN SUPABASE AUTH
        // ==========================================

        const cambiosAuth = {};

        if (nombre !== undefined || apellido !== undefined || rol !== undefined) {
            const { data: authUser, error: authUserError } = await supabaseAdminClient.auth.admin.getUserById(usuarioId);

            if (authUserError) {
                return res.status(400).json({
                    success: false,
                    error: `Error al obtener los metadatos de Supabase Auth: ${authUserError.message}`
                });
            }

            cambiosAuth.user_metadata = {
                ...authUser.user.user_metadata,
                uuid: usuarioId,
                ...(nombre !== undefined ? { nombre } : {}),
                ...(apellido !== undefined ? { apellido } : {}),
                ...(rol !== undefined ? { rol } : {})
            };
        }

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
        const esAdministrador = ['admin', 'administrador'].includes(String(rol).toLowerCase());
        const permisosNormalizados = esAdministrador ? 'ALL' : permisos;
        // Validaciones básicas de entrada
        if (!nombre || !apellido || !email || !password || !rol || !permisosNormalizados) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos (nombre, apellido, email, password, rol, permisos) son requeridos.'
            });
        }

        // permisos :[
        //     acceso1,
        //     acceso2,
        //     ...
        // ]
        
        // ==========================================
        // CREAR USUARIO EN SUPABASE AUTH
        // ==========================================

        const { data, error: supabaseError } = await supabaseAdminClient.auth.admin.createUser({
            email,
            password,
            user_metadata: {
                nombre,
                apellido,
                rol,
                permisos: esAdministrador ? 'ALL' : JSON.stringify(permisosNormalizados),
            },
            email_confirm: true
        });

        if (supabaseError) {
            return res.status(400).json({
                success: false,
                error: `Error al crear usuario en Supabase Auth: ${supabaseError.message}`
            });
        }

        const { data: usuarioActualizado, error: metadataError } = await supabaseAdminClient.auth.admin.updateUserById(
            data.user.id,
            {
                user_metadata: {
                    ...data.user.user_metadata,
                    uuid: data.user.id
                }
            }
        );

        if (metadataError) {
            return res.status(400).json({
                success: false,
                error: `Usuario creado, pero no se pudieron guardar sus metadatos: ${metadataError.message}`
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            usuario: usuarioActualizado.user
        });
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

const cambiarPermisosUsuario = async (req, res) => {
    const usuarioId = req.params.id;
    const { nuevosPermisos } = req.body;

    if(!nuevosPermisos) {
        return res.status(400).json({
            success: false,
            error: 'Los nuevos permisos son requeridos.'
        });
    }

    // ==========================================
    // ACTUALIZAR PERMISOS EN SUPABASE
    // ==========================================

    try{
        const { data: authUser, error: authUserError } = await supabaseAdminClient.auth.admin.getUserById(usuarioId);

        if (authUserError) {
            return res.status(400).json({
                success: false,
                error: `Error al obtener los metadatos de Supabase Auth: ${authUserError.message}`
            });
        }

        const perfil = await pool.query(
            'SELECT rol FROM perfiles WHERE id = $1',
            [usuarioId]
        );
        const esAdministrador = ['admin', 'administrador'].includes(String(perfil.rows[0]?.rol).toLowerCase());
        const permisosNormalizados = esAdministrador ? 'ALL' : nuevosPermisos;

        await pool.query(
            `UPDATE perfiles
            SET "permisosAcceso" = $1
            WHERE id = $2 RETURNING *`,
            [esAdministrador ? 'ALL' : JSON.stringify(permisosNormalizados), usuarioId]
        );

        const { error: metadataError } = await supabaseAdminClient.auth.admin.updateUserById(usuarioId, {
            user_metadata: {
                ...authUser.user.user_metadata,
                uuid: usuarioId,
                permisos: esAdministrador ? 'ALL' : JSON.stringify(permisosNormalizados)
            }
        });

        if (metadataError) {
            return res.status(400).json({
                success: false,
                error: `Perfil actualizado, pero no se pudieron guardar los metadatos: ${metadataError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Permisos del usuario actualizados correctamente.'
        });

    } catch (error) {
        console.error('Error actualizando permisos en Postgres:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor al actualizar permisos'
        });
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
    cambiarMiClave,
    cambiarPermisosUsuario
};