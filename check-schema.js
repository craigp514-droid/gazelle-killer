require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Check companies table structure
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .limit(2);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('Sample company record:');
  console.log(JSON.stringify(data[0], null, 2));
  
  // Check if there's a segments or industries table
  const { data: segments } = await supabase.from('segments').select('*').limit(10);
  console.log('\nSegments table:');
  console.log(JSON.stringify(segments, null, 2));
  
  const { data: industries } = await supabase.from('industries').select('*').limit(10);
  console.log('\nIndustries table:');
  console.log(JSON.stringify(industries, null, 2));
}

main();
