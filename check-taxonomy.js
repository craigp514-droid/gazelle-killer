require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get distinct industries and segments
  const { data: companies, error } = await supabase
    .from('companies')
    .select('industry, segment')
    .limit(1000);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  // Build taxonomy
  const taxonomy = {};
  companies.forEach(c => {
    if (!taxonomy[c.industry]) taxonomy[c.industry] = new Set();
    if (c.segment) taxonomy[c.industry].add(c.segment);
  });
  
  console.log('Current Industry → Segment Taxonomy:');
  console.log('=====================================');
  Object.keys(taxonomy).sort().forEach(ind => {
    console.log(`\n${ind}:`);
    [...taxonomy[ind]].sort().forEach(seg => {
      console.log(`  - ${seg}`);
    });
  });
}

main();
