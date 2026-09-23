const { pool } = require('../../config/supabase');

const historialSensores=async(req,res)=>{//PERMISO: sesnsoresH
    const {fechaInicio,fechaFin}=req.query;

    let query = `
        SELECT *
        FROM historial_sensores
        WHERE 1=1
    `;

    let valores = [];

    if (fechaInicio) {
        query += ` AND fecha_hora >= $${valores.length + 1}`;
        valores.push(`${fechaInicio} 00:00:00-05`);
    }

    if (fechaFin) {
        query += ` AND fecha_hora < $${valores.length + 1}`;
        valores.push(`${fechaFin} 23:59:59.999999-05`);
    }

    query += ` ORDER BY fecha_hora ASC`;

    try{
        const respuesta = await pool.query(query,valores);

        if(respuesta.rows.length===0){
            return res.status(404).json({
                success: false,
                mensaje: 'Sin resultados'
            });
        }

        return res.status(200).json({
            success: true,
            resultado: respuesta.rows
        });

    }catch(err){
        console.log(err);
        return res.status(500).json({
            success: false,
            mensaje: 'error en DB'
        });
    }
}

const historialLuces=async(req,res)=>{//PERMISO: lucesH
    const {fechaInicio,fechaFin}=req.query;

    let query = `
        SELECT *
        FROM "historial_Luces"
        WHERE 1=1
    `;

    let valores = [];

    if (fechaInicio) {
        query += ` AND created_at >= $${valores.length + 1}`;
        valores.push(`${fechaInicio} 00:00:00-05`);
    }

    if (fechaFin) {
        query += ` AND created_at < $${valores.length + 1}`;
        valores.push(`${fechaFin} 23:59:59.999999-05`);
    }

    query += ` ORDER BY created_at ASC`;

    try{
        const respuesta = await pool.query(query,valores);

        if(respuesta.rows.length===0){
            return res.status(404).json({
                success: false,
                mensaje: 'Sin resultados'
            });
        }

        return res.status(200).json({
            success: true,
            resultado: respuesta.rows
        });

    }catch(err){
        console.log(err);
        return res.status(500).json({
            success: false,
            mensaje: 'error en DB'
        });
    }
}

const historialIngresos=async(req,res)=>{//PERMISO: ingresosH
    const {fechaInicio,fechaFin}=req.query;

    let query = `
        SELECT *
        FROM historial_ingresos
        WHERE 1=1
    `;

    let valores = [];

    if (fechaInicio) {
        query += ` AND fecha_hora >= $${valores.length + 1}`;
        valores.push(`${fechaInicio} 00:00:00-05`);
    }

    if (fechaFin) {
        query += ` AND fecha_hora < $${valores.length + 1}`;
        valores.push(`${fechaFin} 23:59:59.999999-05`);
    }

    query += ` ORDER BY fecha_hora ASC`;

    try{
        const respuesta = await pool.query(query,valores);

        if(respuesta.rows.length===0){
            return res.status(404).json({
                success: false,
                mensaje: 'Sin resultados'
            });
        }

        return res.status(200).json({
            success: true,
            resultado: respuesta.rows
        });

    }catch(err){
        console.log(err);
        return res.status(500).json({
            success: false,
            mensaje: 'error en DB'
        });
    }
}

const historialAcciones=async(req,res)=>{//PERMISO: seguroH
    const {fechaInicio,fechaFin}=req.query;

    let query = `
        SELECT *
        FROM historial_acciones
        WHERE 1=1
    `;

    let valores = [];

    if (fechaInicio) {
        query += ` AND fecha_hora >= $${valores.length + 1}`;
        valores.push(`${fechaInicio} 00:00:00-05`);
    }

    if (fechaFin) {
        query += ` AND fecha_hora < $${valores.length + 1}`;
        valores.push(`${fechaFin} 23:59:59.999999-05`);
    }

    query += ` ORDER BY fecha_hora ASC`;

    try{
        const respuesta = await pool.query(query,valores);

        if(respuesta.rows.length===0){
            return res.status(404).json({
                success: false,
                mensaje: 'Sin resultados'
            });
        }

        return res.status(200).json({
            success: true,
            resultado: respuesta.rows
        });

    }catch(err){
        console.log(err);
        return res.status(500).json({
            success: false,
            mensaje: 'error en DB'
        });
    }
}

module.exports={
    historialSensores,
    historialLuces,
    historialIngresos,
    historialAcciones
}