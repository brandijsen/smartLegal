import nodemailer from "nodemailer";
import { logExternalAPI, logError } from "../utils/logger.js";

// Configurazione transporter SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true per 465, false per altri ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verifica configurazione (opzionale, solo in dev)
if (process.env.NODE_ENV !== "production") {
  transporter.verify((error, success) => {
    if (error) {
      logError(error, { 
        operation: "smtp_verification",
        service: "email"
      });
    } else {
      logExternalAPI("smtp", "configuration_verified", {});
    }
  });
}

/**
 * Template HTML per email di successo
 */
const getSuccessEmailTemplate = (userName, documentName, documentId) => {
  const dashboardUrl = `${process.env.FRONTEND_URL}/documents/${documentId}`;
  
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
    .message {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .document-name {
      background-color: #f8f9fa;
      padding: 15px 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      margin: 20px 0;
      font-weight: 500;
      color: #333;
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
      <div class="icon">✅</div>
      <h1>Documento Processato</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Ciao ${userName},</p>
      
      <p class="message">
        Il tuo documento è stato processato con successo! Tutti i dati sono stati estratti e sono pronti per la revisione.
      </p>
      
      <div class="document-name">
        📄 ${documentName}
      </div>
      
      <p class="message">
        Puoi ora visualizzare i dati estratti, verificare l'accuratezza e procedere con l'archiviazione.
      </p>
      
      <center>
        <a href="${dashboardUrl}" class="button">Visualizza Documento</a>
      </center>
    </div>
    
    <div class="footer">
      <p>
        Questa è una notifica automatica da <strong>SmartLegal</strong><br>
        <a href="${process.env.FRONTEND_URL}">Vai alla Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Template HTML per email di errore
 */
const getErrorEmailTemplate = (userName, documentName, documentId, errorMessage) => {
  const dashboardUrl = `${process.env.FRONTEND_URL}/documents`;
  
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
      background: linear-gradient(135deg, #f43f5e 0%, #dc2626 100%);
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
    .message {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .document-name {
      background-color: #fef2f2;
      padding: 15px 20px;
      border-radius: 8px;
      border-left: 4px solid #f43f5e;
      margin: 20px 0;
      font-weight: 500;
      color: #333;
    }
    .error-box {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      padding: 15px 20px;
      border-radius: 8px;
      margin: 20px 0;
      color: #991b1b;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #f43f5e 0%, #dc2626 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .tips {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .tips h3 {
      color: #92400e;
      margin-top: 0;
      font-size: 16px;
    }
    .tips ul {
      margin: 10px 0;
      padding-left: 20px;
      color: #92400e;
    }
    .tips li {
      margin: 5px 0;
      font-size: 14px;
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
      <div class="icon">❌</div>
      <h1>Errore Processing</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Ciao ${userName},</p>
      
      <p class="message">
        Purtroppo si è verificato un errore durante il processing del tuo documento.
      </p>
      
      <div class="document-name">
        📄 ${documentName}
      </div>
      
      ${errorMessage ? `
      <div class="error-box">
        <strong>Dettagli errore:</strong><br>
        ${errorMessage}
      </div>
      ` : ''}
      
      <div class="tips">
        <h3>💡 Possibili soluzioni:</h3>
        <ul>
          <li>Verifica che il file sia un PDF valido e non corrotto</li>
          <li>Assicurati che il documento contenga testo estraibile (non solo immagini)</li>
          <li>Controlla che il file non sia protetto da password</li>
          <li>Se il problema persiste, contatta il supporto</li>
        </ul>
      </div>
      
      <p class="message">
        Puoi riprovare caricando nuovamente il documento.
      </p>
      
      <center>
        <a href="${dashboardUrl}" class="button">Vai ai Documenti</a>
      </center>
    </div>
    
    <div class="footer">
      <p>
        Questa è una notifica automatica da <strong>SmartLegal</strong><br>
        <a href="${process.env.FRONTEND_URL}">Vai alla Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Invia email quando documento è processato con successo
 */
export async function sendDocumentProcessedEmail(userEmail, userName, documentName, documentId) {
  try {
    logExternalAPI("smtp", "sending_success_email", { 
      userEmail, 
      documentId,
      documentName 
    });

    const mailOptions = {
      from: `"SmartLegal" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: `✅ Documento processato: ${documentName}`,
      html: getSuccessEmailTemplate(userName, documentName, documentId),
    };

    const info = await transporter.sendMail(mailOptions);
    
    logExternalAPI("smtp", "success_email_sent", { 
      userEmail, 
      documentId,
      messageId: info.messageId 
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logError(error, {
      operation: "sendDocumentProcessedEmail",
      service: "smtp",
      userEmail,
      documentId,
      documentName
    });
    return { success: false, error: error.message };
  }
}

/**
 * Invia email quando processing fallisce
 */
export async function sendDocumentErrorEmail(userEmail, userName, documentName, documentId, errorMessage = null) {
  try {
    logExternalAPI("smtp", "sending_error_email", { 
      userEmail, 
      documentId,
      documentName 
    });

    const mailOptions = {
      from: `"SmartLegal" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: `❌ Errore processing: ${documentName}`,
      html: getErrorEmailTemplate(userName, documentName, documentId, errorMessage),
    };

    const info = await transporter.sendMail(mailOptions);
    
    logExternalAPI("smtp", "error_email_sent", { 
      userEmail, 
      documentId,
      messageId: info.messageId 
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logError(error, {
      operation: "sendDocumentErrorEmail",
      service: "smtp",
      userEmail,
      documentId,
      documentName
    });
    return { success: false, error: error.message };
  }
}
