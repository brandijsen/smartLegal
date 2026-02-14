// Test Email Notifications
// Questo script testa l'invio di email di notifica

const API_BASE = 'http://localhost:5000/api';

// Devi avere un token JWT valido
// Puoi ottenerlo facendo login all'app

const testEmailSuccess = async (token) => {
  try {
    console.log('📧 Testing SUCCESS email notification...');
    
    const response = await fetch(`${API_BASE}/email/test-success`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success email sent!');
      console.log('   Message ID:', data.messageId);
    } else {
      console.log('❌ Failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

const testEmailError = async (token) => {
  try {
    console.log('📧 Testing ERROR email notification...');
    
    const response = await fetch(`${API_BASE}/email/test-error`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Error email sent!');
      console.log('   Message ID:', data.messageId);
    } else {
      console.log('❌ Failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Usage:
// 1. Login all'app e copia il JWT token dal localStorage o network tab
// 2. Esegui: node test-email-notifications.js YOUR_JWT_TOKEN

const token = process.argv[2];

if (!token) {
  console.log('❌ Fornisci un JWT token come parametro');
  console.log('Usage: node test-email-notifications.js YOUR_JWT_TOKEN');
  console.log('\nPer ottenere il token:');
  console.log('1. Vai su http://localhost:5173');
  console.log('2. Fai login');
  console.log('3. Apri DevTools > Application > Local Storage');
  console.log('4. Copia il valore di "token"');
  process.exit(1);
}

(async () => {
  await testEmailSuccess(token);
  console.log('');
  await testEmailError(token);
  
  console.log('\n✅ Test completati! Controlla la tua email.');
})();
