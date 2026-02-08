require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get signals from today's import (discovered today)
  const { data: signals, error } = await supabase
    .from('signals')
    .select('id, company_id, signal_type, title, signal_date, created_at, companies(name)')
    .gte('created_at', '2026-02-08')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('Recently imported signals:');
  signals.forEach(s => {
    console.log(`${s.companies?.name}: ${s.title?.slice(0, 50)}...`);
    console.log(`  signal_date: ${s.signal_date}`);
    console.log('');
  });
}

main();
