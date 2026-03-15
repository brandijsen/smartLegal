import { transporter } from "../config/email.js";
import { logExternalAPI, logError } from "../utils/logger.js";

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
      <h1>Document Processed</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${userName},</p>
      
      <p class="message">
        Your document has been processed successfully. All data has been extracted and is ready for review.
      </p>
      
      <div class="document-name">
        📄 ${documentName}
      </div>
      
      <p class="message">
        You can now view the extracted data, verify accuracy, and proceed with archiving.
      </p>
      
      <center>
        <a href="${dashboardUrl}" class="button">View Document</a>
      </center>
    </div>
    
    <div class="footer">
      <p>
        This is an automated notification from <strong>InvParser</strong><br>
        <a href="${process.env.FRONTEND_URL}">Go to Dashboard</a>
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
      <h1>Processing Error</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${userName},</p>
      
      <p class="message">
        An error occurred while processing your document.
      </p>
      
      <div class="document-name">
        📄 ${documentName}
      </div>
      
      ${errorMessage ? `
      <div class="error-box">
        <strong>Error details:</strong><br>
        ${errorMessage}
      </div>
      ` : ''}
      
      <div class="tips">
        <h3>💡 Possible solutions:</h3>
        <ul>
          <li>Ensure the file is a valid, non-corrupted PDF</li>
          <li>Make sure the document contains extractable text (not only images)</li>
          <li>Check that the file is not password-protected</li>
          <li>If the problem persists, contact support</li>
        </ul>
      </div>
      
      <p class="message">
        You can try again by re-uploading the document.
      </p>
      
      <center>
        <a href="${dashboardUrl}" class="button">Go to Documents</a>
      </center>
    </div>
    
    <div class="footer">
      <p>
        This is an automated notification from <strong>InvParser</strong><br>
        <a href="${process.env.FRONTEND_URL}">Go to Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Template HTML per notifica modifica profilo
 */
const getProfileUpdatedTemplate = (userName, changesSummary) => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #059669; margin-top: 0;">Profile Updated</h2>
    <p>Hello ${userName},</p>
    <p>Your InvParser profile has been updated successfully.</p>
    ${changesSummary ? `<p style="background: #f0fdf4; padding: 12px; border-radius: 8px; border-left: 4px solid #059669;">${changesSummary}</p>` : ""}
    <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">If you did not make this change, please contact support immediately.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">InvParser – automated notification</p>
  </div>
</body>
</html>`;
};

/**
 * Template HTML per notifica cambio password
 */
const getPasswordChangedTemplate = (userName) => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #059669; margin-top: 0;">Password Changed</h2>
    <p>Hello ${userName},</p>
    <p>Your InvParser account password has been changed successfully.</p>
    <p style="background: #fef2f2; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626; color: #991b1b;">
      If you did not make this change, someone may have accessed your account. Change your password immediately and contact support.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">InvParser – automated notification</p>
  </div>
</body>
</html>`;
};

/**
 * Invia email quando il profilo utente viene aggiornato
 */
export async function sendProfileUpdatedEmail(userEmail, userName, changesSummary = null) {
  try {
    const mailOptions = {
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: "Profile updated – InvParser",
      html: getProfileUpdatedTemplate(userName, changesSummary),
    };
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    logError(error, {
      operation: "sendProfileUpdatedEmail",
      service: "smtp",
      userEmail,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Template email per conferma eliminazione account
 */
const getDeleteAccountTemplate = (userName, confirmLink) => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #dc2626; margin-top: 0;">Confirm Account Deletion</h2>
    <p>Hello ${userName},</p>
    <p>You have requested to delete your InvParser account. Click the button below to confirm. This link expires in 24 hours.</p>
    <p style="margin: 24px 0;">
      <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600;">Delete my account</a>
    </p>
    <p style="color: #64748b; font-size: 14px;">If you did not request this deletion, ignore this email. Your account will remain active.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">InvParser – automated notification</p>
  </div>
</body>
</html>`;
};

/**
 * Invia email con link per confermare eliminazione account
 */
export async function sendDeleteAccountEmail(userEmail, userName, confirmLink) {
  try {
    const mailOptions = {
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: "Confirm account deletion – InvParser",
      html: getDeleteAccountTemplate(userName, confirmLink),
    };
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    logError(error, {
      operation: "sendDeleteAccountEmail",
      service: "smtp",
      userEmail,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Invia email quando la password viene modificata
 */
export async function sendPasswordChangedEmail(userEmail, userName) {
  try {
    const mailOptions = {
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: "Password changed – InvParser",
      html: getPasswordChangedTemplate(userName),
    };
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    logError(error, {
      operation: "sendPasswordChangedEmail",
      service: "smtp",
      userEmail,
    });
    return { success: false, error: error.message };
  }
}

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
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: `✅ Document processed: ${documentName}`,
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
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: `❌ Processing error: ${documentName}`,
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
