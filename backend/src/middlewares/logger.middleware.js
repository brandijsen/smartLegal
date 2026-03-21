import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import { sanitizeRequestPath } from "../utils/logSanitize.js";

function safePath(req) {
  const raw = (req.originalUrl || req.url || req.path || "").split("?")[0];
  return sanitizeRequestPath(raw);
}

/**
 * Middleware for automatic HTTP request logging
 * Adds:
 * - Unique request ID to track the entire operation
 * - Request start log with method, path, user
 * - Request end log with status code and duration
 * - Automatic error logging
 */
export const requestLogger = (req, res, next) => {
  // Generate unique ID for this request
  req.requestId = uuidv4();
  const startTime = Date.now();

  // Base context for this request
  const requestContext = {
    requestId: req.requestId,
    method: req.method,
    path: safePath(req),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
  };

  // Add userId if authenticated
  if (req.user) {
    requestContext.userId = req.user.id;
    requestContext.userEmail = req.user.email;
  }

  // Log request start (debug only to avoid verbosity)
  logger.debug("Incoming request", requestContext);

  // Intercept response to log when it completes
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend; // Restore original method

    const duration = Date.now() - startTime;
    const responseContext = {
      ...requestContext,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    // Log based on status code and method
    if (res.statusCode >= 500) {
      // Server errors: always ERROR
      logger.error("Request failed with server error", responseContext);
    } else if (res.statusCode >= 400) {
      // Client errors: WARN
      logger.warn("Request failed with client error", responseContext);
    } else if (req.method !== 'GET') {
      // POST/PUT/DELETE success: INFO (important operations)
      logger.info("Request completed", responseContext);
    } else {
      // GET success: DEBUG (verbose, hidden by default)
      logger.debug("Request completed", responseContext);
    }

    // Warn if request is slow (> 3 seconds)
    if (duration > 3000) {
      logger.warn("Slow request detected", {
        ...responseContext,
        threshold: "3000ms",
      });
    }

    return originalSend.call(this, data);
  };

  // Uncaught error handling in this request handler
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
 * Centralized error handling middleware
 * Catches all unhandled errors and logs them uniformly
 * MUST be registered AFTER all routes
 */
export const errorHandler = (err, req, res, next) => {
  // Full error context
  const errorContext = {
    requestId: req.requestId,
    method: req.method,
    path: safePath(req),
    userId: req.user?.id,
    userEmail: req.user?.email,
    errorName: err.name,
    errorMessage: err.message,
    errorCode: err.code,
    stack: err.stack,
  };

  // Log the error
  logger.error("Unhandled error in request", errorContext);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Response to client (do NOT expose stack trace in production)
  const response = {
    message: err.message || "Internal server error",
    requestId: req.requestId, // For client-side debugging
  };

  // In development only, add extra details
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(statusCode).json(response);
};

/**
 * Creates a logger with context for the current request
 * Useful in controllers to automatically have requestId and userId
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
