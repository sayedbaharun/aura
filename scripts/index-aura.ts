/**
 * Aura Indexing Script
 *
 * Run this script to index all your Hikma-OS data into Pinecone.
 * This should be run:
 * - After initial setup
 * - When you want to refresh the entire index
 * - If you've made bulk changes to your data
 *
 * Usage:
 *   npm run aura:init    # Initialize Pinecone index
 *   npm run aura:index   # Index all data
 */

import { initializePineconeIndex } from '../server/aura/pinecone';
import { indexAllData } from '../server/aura/indexer';

async function main() {
  const command = process.argv[2];

  if (command === 'init') {
    console.log('🚀 Initializing Pinecone index...');
    await initializePineconeIndex();
    console.log('✅ Pinecone index initialized!');
  } else if (command === 'index') {
    console.log('🚀 Starting full data indexing...');
    console.log('This may take a few minutes depending on how much data you have.');
    console.log('');

    await indexAllData();

    console.log('');
    console.log('✅ All done! Your data is now indexed and Aura is ready to help.');
  } else {
    console.log('Usage:');
    console.log('  npm run aura:init    # Initialize Pinecone index');
    console.log('  npm run aura:index   # Index all your data');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
