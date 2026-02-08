require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get a company ID to test with
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1)
    .single();
  
  console.log('Test company:', company.name);
  
  // Try minimal insert
  const { data, error } = await supabase
    .from('signals')
    .insert({
      company_id: company.id,
      signal_type: 'funding_round',
      title: 'Test signal',
      signal_date: '2026-01-15'
    })
    .select();
  
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Success:', data);
    // Clean up
    await supabase.from('signals').delete().eq('id', data[0].id);
  }
}

main();
