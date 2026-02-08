require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get a sample signal to see the schema
  const { data: signals, error } = await supabase
    .from('signals')
    .select('*')
    .limit(3);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('Sample signals:');
  signals.forEach(s => {
    console.log(JSON.stringify(s, null, 2));
    console.log('---');
  });
}

main();
