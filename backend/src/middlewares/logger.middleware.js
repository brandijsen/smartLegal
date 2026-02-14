import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Middleware per logging automatico di tutte le richieste HTTP
 * Aggiunge:
 * - Request ID unico per tracciare l'intera operazione
 * - Log di inizio richiesta con metodo, path, user
 * - Log di fine richiesta con status code e durata
 * - Log automatico degli errori
 */
export const requestLogger = (req, res, next) => {
  // Genera un ID unico per questa richiesta
  req.requestId = uuidv4();
  const startTime = Date.now();

  // Context base per questa richiesta
  const requestContext = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
  };

  // Aggiungi userId se autenticato
  if (req.user) {
    requestContext.userId = req.user.id;
    requestContext.userEmail = req.user.email;
  }

  // Log inizio richiesta (solo in debug per non essere troppo verbose)
  logger.debug("Incoming request", requestContext);

  // Intercetta la risposta per loggare quando finisce
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend; // Ripristina il metodo originale

    const duration = Date.now() - startTime;
    const responseContext = {
      ...requestContext,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    // Log in base allo status code e metodo
    if (res.statusCode >= 500) {
      // Errori server: sempre ERROR
      logger.error("Request failed with server error", responseContext);
    } else if (res.statusCode >= 400) {
      // Errori client: WARN
      logger.warn("Request failed with client error", responseContext);
    } else if (req.method !== 'GET') {
      // POST/PUT/DELETE con successo: INFO (operazioni importanti)
      logger.info("Request completed", responseContext);
    } else {
      // GET con successo: DEBUG (verbose, nascosto di default)
      logger.debug("Request completed", responseContext);
    }

    // Warn se la richiesta è lenta (> 3 secondi)
    if (duration > 3000) {
      logger.warn("Slow request detected", {
        ...responseContext,
        threshold: "3000ms",
      });
    }

    return originalSend.call(this, data);
  };

  // Gestione errori non catturati in questo request handler
  res.on("error", (error) => {
    logger.error("Response stream error", {
      ...requestContext,
      error: error.message,
      stack: error.stack,
    });
  });

  next();
};

/**
 * Middleware di error handling centralizzato
 * Cattura tutti gli errori non gestiti e li logga in modo uniforme
 * Deve essere registrato DOPO tutte le routes
 */
export const errorHandler = (err, req, res, next) => {
  // Context completo dell'errore
  const errorContext = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    userEmail: req.user?.email,
    errorName: err.name,
    errorMessage: err.message,
    errorCode: err.code,
    stack: err.stack,
  };

  // Log l'errore
  logger.error("Unhandled error in request", errorContext);

  // Determina lo status code
  const statusCode = err.statusCode || err.status || 500;

  // Risposta al client (NON esporre stack trace in produzione)
  const response = {
    message: err.message || "Internal server error",
    requestId: req.requestId, // Per debugging lato client
  };

  // Solo in development, aggiungi dettagli extra
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(statusCode).json(response);
};

/**
 * Crea un logger con contesto specifico per la richiesta corrente
 * Utile nei controller per avere automaticamente requestId e userId
 */
export function getRequestLogger(req) {
  const context = {
    requestId: req.requestId,
    userId: req.user?.id,
    userEmail: req.user?.email,
  };

  return {
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    error: (message, meta = {}) => logger.error(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { ...context, ...meta }),
  };
}
