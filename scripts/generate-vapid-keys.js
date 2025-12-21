// =============================================================================
// VAPID KEY GENERATOR
// Run: node scripts/generate-vapid-keys.js
// =============================================================================

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n🔐 VAPID Keys Generated\n');
console.log('Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n');
console.log('Also add a secret for the push webhook:');
console.log(`PUSH_WEBHOOK_SECRET=${Buffer.from(Math.random().toString()).toString('base64').slice(0, 32)}`);
console.log('\n');
