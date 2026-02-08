require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { count } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total signals in DB:', count);
  
  // Check if any have headline field (wrong)
  const { data: withHeadline } = await supabase
    .from('signals')
    .select('id')
    .not('title', 'is', null)
    .limit(1);
  
  console.log('Signals with title:', withHeadline?.length > 0 ? 'yes' : 'no');
}

main();
