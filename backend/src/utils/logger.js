import winston from "winston";
import path from "path";
import fs from "fs";

// Crea la directory logs se non esiste
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formato personalizzato per i log
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Formato più leggibile per la console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Aggiungi metadati rilevanti
    if (Object.keys(metadata).length > 0) {
      // Escludi stack trace dalla console per brevità (già nei file)
      const { stack, ...rest } = metadata;
      if (Object.keys(rest).length > 0) {
        msg += ` ${JSON.stringify(rest)}`;
      }
    }
    
    return msg;
  })
);

// Crea il logger principale
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: customFormat,
  defaultMeta: {
    service: "smartlegal-backend",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    // Log di tutti i livelli su file combinato
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Log solo errori su file separato
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Console output (solo in development o se richiesto)
    ...(process.env.NODE_ENV !== "production" || process.env.CONSOLE_LOGS === "true"
      ? [
          new winston.transports.Console({
            format: consoleFormat,
          }),
        ]
      : []),
  ],
  // Non uscire su errori di log (gestione graceful)
  exitOnError: false,
});

/**
 * Helper per creare log context-aware
 * Usa questo per aggiungere contesto specifico ai log
 */
export function createLogContext(context = {}) {
  return {
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    error: (message, meta = {}) => logger.error(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { ...context, ...meta }),
  };
}

/**
 * Log errori con stack trace completo e contesto
 */
export function logError(error, context = {}) {
  logger.error(error.message || "Unknown error", {
    ...context,
    stack: error.stack,
    errorName: error.name,
    errorCode: error.code,
  });
}

/**
 * Log operazioni di business con contesto utente/documento
 */
export function logOperation(operation, details = {}, level = "info") {
  logger[level](`Operation: ${operation}`, {
    operation,
    ...details,
  });
}

/**
 * Log performance/timing per operazioni lente
 */
export function logPerformance(operation, duration, threshold = 1000) {
  const level = duration > threshold ? "warn" : "info";
  logger[level](`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    slow: duration > threshold,
  });
}

/**
 * Log autenticazione e sicurezza
 */
export function logAuth(action, details = {}) {
  logger.info(`Auth: ${action}`, {
    action,
    type: "authentication",
    ...details,
  });
}

/**
 * Log job queue e processing asincrono
 */
export function logJob(jobName, status, details = {}) {
  const level = status === "failed" ? "error" : "info";
  logger[level](`Job: ${jobName} - ${status}`, {
    jobName,
    status,
    type: "job",
    ...details,
  });
}

/**
 * Log chiamate API esterne (OpenAI, email, ecc)
 */
export function logExternalAPI(service, operation, details = {}) {
  logger.info(`External API: ${service} - ${operation}`, {
    service,
    operation,
    type: "external_api",
    ...details,
  });
}

/**
 * Log validazione e quality checks
 */
export function logValidation(documentId, flags = [], details = {}) {
  const level = flags.some(f => f.severity === "critical") ? "warn" : "info";
  logger[level]("Validation completed", {
    documentId,
    flagCount: flags.length,
    criticalFlags: flags.filter(f => f.severity === "critical").length,
    type: "validation",
    ...details,
  });
}

// Gestione graceful degli stream quando il processo termina
process.on("exit", () => {
  logger.end();
});

process.on("SIGINT", () => {
  logger.end();
  process.exit(0);
});

export default logger;
