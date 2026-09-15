const { pool } = require('../../config/supabase');

const agregarAcceso = async (req, res) => {
    try {
        const { tipo, valor, usosPermitidos } = req.body;

        // 1. Validar que los campos obligatorios vengan en la petición
        if (!tipo || !valor || usosPermitidos === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Los campos tipo, valor y usosPermitidos son requeridos.'
            });
        }

        // 2. Validar que la regla de negocio de usosPermitidos sea correcta
        // Si no es null Y tampoco es mayor a 0, significa que es 0 o un número negativo.
        if (usosPermitidos !== null && usosPermitidos <= 0) {
            return res.status(400).json({
                success: false,
                error: 'El campo usosPermitidos debe ser null (ilimitado) o un número entero mayor a 0.'
            });
        }


        if (tipo !== 'rfid' && tipo !== 'pin') {
            return res.status(400).json({
                success: false,
                error: 'Tipo de acceso no válido. Debe ser "rfid" o "pin"'
            });
        }

        let valorFinal;

        switch (tipo) {
            case 'rfid':
                // Validación para RFID (exige los 8 dígitos hexadecimales seguidos)
                if (!/^[0-9A-Fa-f]{8}$/.test(valor)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Formato de RFID no válido. Debe ser un valor hexadecimal de 8 dígitos continuos (ej. 713FB027)'
                    });
                }

                // Formateamos de dos en dos y lo pasamos a mayúsculas
                valorFinal = valor.toUpperCase().match(/.{1,2}/g).join(' ');
                break;

            case 'pin':
                // Validación para PIN (exige al menos 4 dígitos numéricos continuos)
                // Esto ya garantiza que el valor sea puramente numérico (ej: "0000", "123456")
                if (!/^\d{4,}$/.test(valor)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Formato de PIN no válido. Debe contener al menos 4 dígitos numéricos continuos'
                    });
                }
                
                valorFinal = valor; // Mantenemos el PIN como String para no perder ceros a la izquierda
                break;
        }

        const query = `INSERT INTO credenciales (puerta_id, tipo, identificador, activo, usosPermitidos) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        
        const values = ['aee70eea-9efa-4d1f-9cbe-f94c62a51758', tipo, valorFinal, true, usosPermitidos];

        const resultado = await pool.query(query, values);

        if (resultado.rows.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo agregar el acceso'
            });
        }
        
        return res.status(201).json({
            success: true,
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al agregar acceso:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}


const obtenerAccesos = async (req, res) => {
    try {
        //Se obtienen todos porque el admin podrá ver en su panel todos los accesos, sin importar si están activos o no.
        const resultado = await pool.query('SELECT * FROM credenciales');

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron accesos disponibles'
            });
        }

        return res.status(200).json({
            success: true,
            data: resultado.rows
        });

    } catch (error) {
        console.error('Error al obtener accesos:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const cambiarEstadoAcceso = async (req, res) => {
    try {
        const accesoId = req.params.id;

        if (!accesoId) {
            return res.status(400).json({
                success: false,
                error: 'El ID del acceso es requerido'
            });
        }

        const { activo } = req.body;

        if (activo === undefined) {
            return res.status(400).json({
                success: false,
                error: 'El campo activo es requerido'
            });
        }

         if (typeof activo !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El nuevo estado debe ser un valor booleano.'
            });
        }

        const query = `UPDATE credenciales SET activo = $1 WHERE id = $2 RETURNING *`;
        const values = [activo, accesoId];

        const resultado = await pool.query(query, values);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Acceso no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al cambiar estado del acceso:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const eliminarAcceso = async (req, res) => {
    try {
        const accesoId = req.params.id;

        if (!accesoId) {
            return res.status(400).json({
                success: false,
                error: 'El ID del acceso es requerido'
            });
        }

        const query = `DELETE FROM credenciales WHERE id = $1 RETURNING *`;
        const values = [accesoId];

        const resultado = await pool.query(query, values);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Acceso no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Acceso eliminado exitosamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al eliminar acceso:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

//no se pueden actualizar accesos, solo se pueden agregar, eliminar y cambiar su estado (activo/inactivo). Por eso no hay un método de actualizar acceso.

module.exports = {
    agregarAcceso,
    obtenerAccesos,
    cambiarEstadoAcceso,
    eliminarAcceso
}