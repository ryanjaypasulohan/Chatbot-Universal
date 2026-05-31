import { generateEmbedding, storeEmbedding } from './index.js';

async function test() {
  console.log('Testing embedding generation...');
  
  const sampleText = 'This is a test of the AI chatbot embedding system.';
  
  try {
    const embedding = await generateEmbedding(sampleText);
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    console.log(`First 5 values: ${embedding.slice(0, 5).join(', ')}`);
    
    // Note: To test storing, you'd need a real page_id from your database.
    // We'll test storage when we build the crawler.
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();