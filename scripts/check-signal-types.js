require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get unique signal types from existing signals
  const { data } = await supabase.from('signals').select('signal_type');
  const types = [...new Set(data.map(s => s.signal_type))];
  console.log('Existing signal types:', types);
}

main();
