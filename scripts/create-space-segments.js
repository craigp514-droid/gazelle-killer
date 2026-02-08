require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NEW_SEGMENTS = [
  { name: 'Launch & Space Access', slug: 'launch-space-access', description: 'Rocket launch providers and space access services', icon: 'rocket', color: '#EF4444' },
  { name: 'Spacecraft Components & Subsystems', slug: 'spacecraft-components', description: 'Satellite and spacecraft component manufacturers', icon: 'cpu', color: '#F97316' },
  { name: 'Spacecraft & Satellite Systems', slug: 'spacecraft-satellite-systems', description: 'Complete satellite and spacecraft manufacturers', icon: 'satellite', color: '#F59E0B' },
  { name: 'Data, Software & Space Intelligence', slug: 'space-data-intelligence', description: 'Space data analytics, software, and intelligence platforms', icon: 'database', color: '#84CC16' },
  { name: 'In-Space Services, Logistics & Safety', slug: 'in-space-services', description: 'On-orbit servicing, debris removal, and space logistics', icon: 'truck', color: '#22C55E' },
  { name: 'Earth Observation & Geospatial Intelligence', slug: 'earth-observation', description: 'Remote sensing, imaging, and geospatial analytics', icon: 'globe', color: '#14B8A6' },
  { name: 'Space Stations, Habitats & Orbital Platforms', slug: 'space-stations-habitats', description: 'Commercial space stations and orbital platforms', icon: 'home', color: '#06B6D4' },
  { name: 'Communications, PNT & Connectivity', slug: 'space-communications', description: 'Satellite communications, positioning, navigation, and timing', icon: 'wifi', color: '#3B82F6' },
  { name: 'Human Spaceflight & Commercial Space', slug: 'human-spaceflight', description: 'Crewed missions, space tourism, and commercial astronaut services', icon: 'user', color: '#6366F1' },
  { name: 'Research, Workforce & Ecosystem', slug: 'space-research-ecosystem', description: 'Space research organizations, education, and ecosystem enablers', icon: 'book', color: '#8B5CF6' },
  { name: 'In-Space Manufacturing & Zero-G R&D', slug: 'in-space-manufacturing', description: 'Microgravity manufacturing and space-based R&D', icon: 'flask', color: '#A855F7' },
  { name: 'Space Resources & Off-World Infrastructure', slug: 'space-resources', description: 'Asteroid mining, ISRU, and lunar/planetary infrastructure', icon: 'gem', color: '#D946EF' },
  { name: 'Ground Infrastructure & Mission Operations', slug: 'ground-infrastructure', description: 'Ground stations, mission control, and launch facilities', icon: 'radio', color: '#EC4899' },
];

async function main() {
  // Get Space & Aerospace industry ID
  const { data: industry } = await supabase
    .from('industries')
    .select('id')
    .eq('slug', 'space-aerospace')
    .single();
  
  if (!industry) {
    console.error('Space & Aerospace industry not found!');
    return;
  }
  
  console.log('Found Space & Aerospace industry:', industry.id);
  console.log('Creating segments...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const seg of NEW_SEGMENTS) {
    // Check if exists
    const { data: existing } = await supabase
      .from('segments')
      .select('id')
      .eq('slug', seg.slug)
      .single();
    
    if (existing) {
      console.log(`⏭️  ${seg.name} (already exists)`);
      skipped++;
      continue;
    }
    
    // Get max display_order
    const { data: maxOrder } = await supabase
      .from('segments')
      .select('display_order')
      .eq('industry_id', industry.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    
    const nextOrder = (maxOrder?.display_order || 0) + 1;
    
    // Insert
    const { error } = await supabase
      .from('segments')
      .insert({
        ...seg,
        industry_id: industry.id,
        display_order: nextOrder + created
      });
    
    if (error) {
      console.log(`❌ Error creating ${seg.name}: ${error.message}`);
    } else {
      console.log(`✅ Created ${seg.name}`);
      created++;
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Done! Created: ${created}, Skipped: ${skipped}`);
}

main().catch(console.error);
