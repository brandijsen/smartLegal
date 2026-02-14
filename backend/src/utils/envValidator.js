/**
 * Environment Variables Validator
 * Controlla che tutte le variabili d'ambiente necessarie siano configurate
 * SICURO: Controlla solo l'esistenza, NON logga mai i valori
 */

// Lista delle variabili d'ambiente richieste
const REQUIRED_ENV_VARS = [
  // Server
  { name: "PORT", description: "Server port" },
  
  // Database
  { name: "DB_HOST", description: "MySQL host" },
  { name: "DB_USER", description: "MySQL user" },
  { name: "DB_PASS", description: "MySQL password" },
  { name: "DB_NAME", description: "MySQL database name" },
  { name: "DB_PORT", description: "MySQL port" },
  
  // JWT
  { name: "JWT_SECRET", description: "JWT secret key" },
  { name: "JWT_REFRESH_SECRET", description: "JWT refresh secret key" },
  
  // Redis
  { name: "REDIS_HOST", description: "Redis host" },
  { name: "REDIS_PORT", description: "Redis port" },
  
  // OpenAI
  { name: "OPENAI_API_KEY", description: "OpenAI API key for AI parsing" },
  
  // SMTP Email
  { name: "SMTP_HOST", description: "SMTP server host" },
  { name: "SMTP_PORT", description: "SMTP server port" },
  { name: "SMTP_USER", description: "SMTP username" },
  { name: "SMTP_PASS", description: "SMTP password" },
  { name: "EMAIL_FROM", description: "Email sender address" },
  
  // URLs
  { name: "FRONTEND_URL", description: "Frontend URL" },
  { name: "BASE_URL", description: "Backend base URL" },
];

// Variabili opzionali (con default o non critiche)
const OPTIONAL_ENV_VARS = [
  { name: "REDIS_PASSWORD", description: "Redis password (if required)" },
  { name: "GOOGLE_CLIENT_ID", description: "Google OAuth client ID" },
  { name: "GOOGLE_CLIENT_SECRET", description: "Google OAuth client secret" },
  { name: "GOOGLE_REDIRECT_URI", description: "Google OAuth redirect URI" },
  { name: "GOOGLE_FRONTEND_REDIRECT", description: "Google OAuth frontend redirect" },
];

/**
 * Valida tutte le variabili d'ambiente richieste
 * @returns {Object} { valid: boolean, missing: Array, warnings: Array }
 */
export function validateEnv() {
  const missing = [];
  const warnings = [];

  // Controlla variabili richieste (CRITICHE)
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];
    
    if (!value || value.trim() === "") {
      missing.push({
        name: envVar.name,
        description: envVar.description,
      });
    }
  }

  // Controlla variabili opzionali (WARNING)
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar.name];
    
    if (!value || value.trim() === "") {
      warnings.push({
        name: envVar.name,
        description: envVar.description,
      });
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Valida e termina il processo se ci sono errori critici
 * Chiamare all'avvio del server
 */
export function validateEnvOrExit() {
  console.log("🔍 Validating environment variables...");
  
  const result = validateEnv();

  // Mostra warnings per variabili opzionali
  if (result.warnings.length > 0) {
    console.log("\n⚠️  Optional environment variables not set:");
    result.warnings.forEach((envVar) => {
      console.log(`   - ${envVar.name}: ${envVar.description}`);
    });
    console.log("   (These are optional - server will run with limited features)\n");
  }

  // Se mancano variabili critiche, termina
  if (!result.valid) {
    console.error("\n❌ FATAL: Missing required environment variables:\n");
    result.missing.forEach((envVar) => {
      console.error(`   ✗ ${envVar.name}`);
      console.error(`     ${envVar.description}`);
    });
    console.error("\n💡 Fix: Add missing variables to your .env file");
    console.error("📄 Example: See .env.example for reference\n");
    
    // Termina il processo
    process.exit(1);
  }

  // Tutto OK
  console.log("✅ All required environment variables validated\n");
}

/**
 * Crea un file .env.example con tutte le variabili
 * Utile per documentazione e onboarding
 */
export function generateEnvExample() {
  const lines = [
    "# SmartLegal - Environment Variables",
    "# Copy this file to .env and fill in your values",
    "",
    "# Server",
    "PORT=5000",
    "",
    "# Database (MySQL)",
    "DB_HOST=127.0.0.1",
    "DB_USER=root",
    "DB_PASS=your_password",
    "DB_NAME=smartlegal",
    "DB_PORT=3306",
    "",
    "# JWT Secrets (generate random strings)",
    "JWT_SECRET=your_jwt_secret_here",
    "JWT_REFRESH_SECRET=your_jwt_refresh_secret_here",
    "",
    "# Redis",
    "REDIS_HOST=127.0.0.1",
    "REDIS_PORT=6379",
    "REDIS_PASSWORD=",
    "",
    "# OpenAI API",
    "OPENAI_API_KEY=sk-proj-your_openai_key_here",
    "",
    "# Email (SMTP)",
    "SMTP_HOST=smtp.gmail.com",
    "SMTP_PORT=587",
    "SMTP_USER=your_email@gmail.com",
    "SMTP_PASS=your_app_password",
    "EMAIL_FROM=your_email@gmail.com",
    "",
    "# URLs",
    "FRONTEND_URL=http://localhost:5173",
    "BASE_URL=http://localhost:5000",
    "",
    "# Google OAuth (Optional)",
    "GOOGLE_CLIENT_ID=",
    "GOOGLE_CLIENT_SECRET=",
    "GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback",
    "GOOGLE_FRONTEND_REDIRECT=http://localhost:5173/auth/google/success",
  ];

  return lines.join("\n");
}
