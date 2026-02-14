import { Redis } from "ioredis";
import { redisConnection } from "../config/redis.js";
import { sendDocumentProcessedEmail, sendDocumentErrorEmail } from "./email.service.js";
import { User } from "../models/user.model.js";
import logger, { logError } from "../utils/logger.js";

/**
 * Batch Notification Service
 * 
 * Raggruppa notifiche email per documenti uploadati insieme.
 * Invia una singola email riassuntiva invece di N email separate.
 */

const BATCH_TIMEOUT = 30000; // 30 secondi - tempo per considerare batch completato
const BATCH_PREFIX = "batch:";

/**
 * Crea un nuovo batch di upload
 * @param {number} userId - ID utente
 * @param {number} documentCount - Numero documenti nel batch
 * @returns {string} batchId
 */
export function createBatch(userId, documentCount) {
  const batchId = `${userId}_${Date.now()}`;
  return batchId;
}

/**
 * Registra un documento in un batch
 * @param {string} batchId - ID batch
 * @param {number} documentId - ID documento
 * @param {string} documentName - Nome documento
 */
export async function registerDocumentInBatch(batchId, documentId, documentName) {
  const key = `${BATCH_PREFIX}${batchId}`;
  
  // Aggiungi documento alla lista
  await redisConnection.hset(key, `doc:${documentId}`, JSON.stringify({
    id: documentId,
    name: documentName,
    status: 'pending',
    addedAt: Date.now()
  }));
  
  // Set expiry (2 ore per sicurezza)
  await redisConnection.expire(key, 7200);
}

/**
 * Marca documento come completato in un batch
 * @param {number} documentId - ID documento
 * @param {number} userId - ID utente
 * @param {string} documentName - Nome documento
 * @param {string} status - 'done' o 'failed'
 * @param {string} errorMessage - Messaggio errore (opzionale)
 */
export async function markDocumentComplete(documentId, userId, documentName, status = 'done', errorMessage = null) {
  // Cerca tutti i batch dell'utente (escludi chiavi :timeout)
  const pattern = `${BATCH_PREFIX}${userId}_*`;
  const allKeys = await redisConnection.keys(pattern);
  
  // Filtra solo le chiavi batch principali (no :timeout)
  const keys = allKeys.filter(key => !key.includes(':timeout'));
  
  let batchId = null;
  let batchKey = null;
  
  // Trova il batch che contiene questo documento
  for (const key of keys) {
    const exists = await redisConnection.hexists(key, `doc:${documentId}`);
    if (exists) {
      batchKey = key;
      batchId = key.replace(BATCH_PREFIX, '');
      break;
    }
  }
  
  // Se non c'è batch, invia email singola (upload singolo)
  if (!batchKey) {
    return await sendSingleEmail(userId, documentId, documentName, status, errorMessage);
  }
  
  // Aggiorna status documento nel batch
  await redisConnection.hset(batchKey, `doc:${documentId}`, JSON.stringify({
    id: documentId,
    name: documentName,
    status,
    errorMessage,
    completedAt: Date.now()
  }));
  
  // Controlla se tutti i documenti sono completati
  const allDocs = await redisConnection.hgetall(batchKey);
  const docs = Object.values(allDocs).map(d => JSON.parse(d));
  
  const pending = docs.filter(d => d.status === 'pending');
  
  // Se ci sono ancora documenti pending, aspetta
  if (pending.length > 0) {
    // Set timer per forzare invio dopo timeout (SOLO se non esiste già)
    const timeoutKey = `${batchKey}:timeout`;
    const hasTimeout = await redisConnection.exists(timeoutKey);
    
    if (!hasTimeout) {
      await redisConnection.set(timeoutKey, Date.now().toString(), 'PX', BATCH_TIMEOUT);
      
      // Dopo timeout, controlla di nuovo e invia se necessario
      setTimeout(async () => {
        await checkAndSendBatchEmail(batchKey, userId);
      }, BATCH_TIMEOUT);
    }
    
    return { batched: true, pending: pending.length };
  }
  
  // Tutti completati - invia email batch immediatamente
  await sendBatchEmail(batchKey, userId);
  
  return { batched: true, sent: true };
}

/**
 * Invia email singola (documento uploadato da solo)
 */
async function sendSingleEmail(userId, documentId, documentName, status, errorMessage) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email) return;
    
    if (status === 'done') {
      await sendDocumentProcessedEmail(user.email, user.name, documentName, documentId);
    } else {
      await sendDocumentErrorEmail(user.email, user.name, documentName, documentId, errorMessage);
    }
    
    return { batched: false, sent: true };
  } catch (error) {
    logError(error, { 
      operation: "sendSingleEmail",
      userId,
      documentId,
      documentName,
      status
    });
    return { batched: false, sent: false };
  }
}

/**
 * Controlla stato batch e invia email solo se necessario (chiamata da timeout)
 */
async function checkAndSendBatchEmail(batchKey, userId) {
  try {
    // Verifica se il batch esiste ancora
    const exists = await redisConnection.exists(batchKey);
    if (!exists) {
      logger.debug("Batch already sent", { batchKey });
      return;
    }
    
    // Ricontrolla stato documenti
    const allDocs = await redisConnection.hgetall(batchKey);
    if (!allDocs || Object.keys(allDocs).length === 0) {
      logger.debug("Batch is empty", { batchKey });
      return;
    }
    
    const docs = Object.values(allDocs).map(d => JSON.parse(d));
    const pending = docs.filter(d => d.status === 'pending');
    
    // Invia email con stato attuale (alcuni potrebbero essere ancora pending)
    logger.info("Batch timeout - sending email with pending documents", { 
      batchKey, 
      pendingCount: pending.length,
      totalCount: docs.length
    });
    
    await sendBatchEmail(batchKey, userId);
  } catch (error) {
    logError(error, { 
      operation: "checkAndSendBatchEmail",
      batchKey,
      userId
    });
  }
}

/**
 * Invia email riassuntiva per batch
 */
async function sendBatchEmail(batchKey, userId) {
  try {
    // Get tutti i documenti
    const allDocs = await redisConnection.hgetall(batchKey);
    if (!allDocs || Object.keys(allDocs).length === 0) return;
    
    const docs = Object.values(allDocs).map(d => JSON.parse(d));
    
    const user = await User.findById(userId);
    if (!user || !user.email) return;
    
    const completed = docs.filter(d => d.status === 'done');
    const failed = docs.filter(d => d.status === 'failed');
    const pending = docs.filter(d => d.status === 'pending');
    
    // Invia email batch
    await sendBatchSummaryEmail(user.email, user.name, {
      completed,
      failed,
      pending,
      total: docs.length
    });
    
    // Cleanup batch
    await redisConnection.del(batchKey);
    await redisConnection.del(`${batchKey}:timeout`);
    
    logger.info("Batch email sent", { 
      userId,
      completedCount: completed.length,
      failedCount: failed.length,
      pendingCount: pending.length,
      totalCount: docs.length
    });
  } catch (error) {
    logError(error, { 
      operation: "sendBatchEmail",
      batchKey,
      userId
    });
  }
}

/**
 * Template e invio email batch
 */
async function sendBatchSummaryEmail(userEmail, userName, summary) {
  const nodemailer = await import("nodemailer");
  
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  
  const html = getBatchEmailTemplate(userName, summary);
  
  const subject = summary.failed.length > 0 
    ? `📊 ${summary.completed.length}/${summary.total} documenti processati`
    : `✅ ${summary.total} documenti processati con successo`;
  
  const mailOptions = {
    from: `"SmartLegal" <${process.env.EMAIL_FROM}>`,
    to: userEmail,
    subject,
    html,
  };
  
  await transporter.sendMail(mailOptions);
}

/**
 * Template HTML per email batch
 */
function getBatchEmailTemplate(userName, summary) {
  const { completed, failed, pending, total } = summary;
  const dashboardUrl = process.env.FRONTEND_URL;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
    }
    .summary-box {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
      text-align: center;
    }
    .summary-number {
      font-size: 48px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 10px;
    }
    .summary-text {
      font-size: 18px;
      color: #666;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
      gap: 15px;
    }
    .stat-card {
      flex: 1;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card.success {
      background-color: #f0fdf4;
      border: 2px solid #86efac;
    }
    .stat-card.error {
      background-color: #fef2f2;
      border: 2px solid #fecaca;
    }
    .stat-card.pending {
      background-color: #fffbeb;
      border: 2px solid #fde68a;
    }
    .stat-number {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .stat-card.success .stat-number { color: #16a34a; }
    .stat-card.error .stat-number { color: #dc2626; }
    .stat-card.pending .stat-number { color: #f59e0b; }
    .stat-label {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }
    .document-list {
      margin: 25px 0;
    }
    .document-item {
      padding: 12px 15px;
      margin: 8px 0;
      border-radius: 8px;
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      font-size: 14px;
      color: #333;
    }
    .document-item.failed {
      border-left-color: #dc2626;
      background-color: #fef2f2;
    }
    .document-item.pending {
      border-left-color: #f59e0b;
      background-color: #fffbeb;
    }
    .document-icon {
      margin-right: 8px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin: 25px 0 15px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
      margin-top: 20px;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .footer {
      background-color: #f8f9fa;
      padding: 25px 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">📊</div>
      <h1>Batch Processing Completato</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Ciao ${userName},</p>
      
      <div class="summary-box">
        <div class="summary-number">${total}</div>
        <div class="summary-text">Documenti processati</div>
      </div>
      
      <div class="stats">
        ${completed.length > 0 ? `
        <div class="stat-card success">
          <div class="stat-number">${completed.length}</div>
          <div class="stat-label">✅ Successo</div>
        </div>
        ` : ''}
        
        ${failed.length > 0 ? `
        <div class="stat-card error">
          <div class="stat-number">${failed.length}</div>
          <div class="stat-label">❌ Errori</div>
        </div>
        ` : ''}
        
        ${pending.length > 0 ? `
        <div class="stat-card pending">
          <div class="stat-number">${pending.length}</div>
          <div class="stat-label">⏳ In corso</div>
        </div>
        ` : ''}
      </div>
      
      ${completed.length > 0 ? `
      <div class="section-title">✅ Documenti Pronti</div>
      <div class="document-list">
        ${completed.slice(0, 10).map(doc => `
          <div class="document-item">
            <span class="document-icon">📄</span>${doc.name}
          </div>
        `).join('')}
        ${completed.length > 10 ? `
          <div class="document-item" style="border-left-color: #ccc; font-style: italic;">
            ... e altri ${completed.length - 10} documenti
          </div>
        ` : ''}
      </div>
      ` : ''}
      
      ${failed.length > 0 ? `
      <div class="section-title">❌ Documenti con Errori</div>
      <div class="document-list">
        ${failed.map(doc => `
          <div class="document-item failed">
            <span class="document-icon">⚠️</span>${doc.name}
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      ${pending.length > 0 ? `
      <div class="section-title">⏳ Ancora in Processing</div>
      <div class="document-list">
        ${pending.map(doc => `
          <div class="document-item pending">
            <span class="document-icon">⏱️</span>${doc.name}
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      <center>
        <a href="${dashboardUrl}/documents" class="button">Vai ai Documenti</a>
      </center>
    </div>
    
    <div class="footer">
      <p>
        Questa è una notifica automatica da <strong>SmartLegal</strong><br>
        <a href="${dashboardUrl}">Vai alla Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
