const { createClient } = require('@supabase/supabase-js'); // Nota: el paquete es @supabase/supabase-js

const supabaseAdminClient = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabaseAdminClient };