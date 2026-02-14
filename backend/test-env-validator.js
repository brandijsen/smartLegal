// Test: simula .env mancante di variabile critica
import { validateEnv } from '../src/utils/envValidator.js';

// Backup
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;

// Simula variabili mancanti
delete process.env.OPENAI_API_KEY;
delete process.env.SMTP_HOST;

console.log('🧪 Testing env validator with missing variables...\n');

const result = validateEnv();

console.log('Validation result:', result);
console.log('\nMissing variables:');
result.missing.forEach(v => {
  console.log(`  ❌ ${v.name}: ${v.description}`);
});

// Ripristina
process.env.OPENAI_API_KEY = OPENAI_KEY;
process.env.SMTP_HOST = SMTP_HOST;

console.log('\n✅ Test completed (variables restored)');
