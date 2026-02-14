import { Router } from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { sendDocumentProcessedEmail, sendDocumentErrorEmail } from "../services/email.service.js";

const router = Router();

/**
 * 🧪 TEST ENDPOINT - Invia email di test
 * POST /api/email/test-success
 */
router.post("/test-success", protect, async (req, res) => {
  try {
    const { email, name } = req.user;
    
    const result = await sendDocumentProcessedEmail(
      email,
      name,
      "test-invoice.pdf",
      999 // ID fittizio
    );

    if (result.success) {
      return res.json({
        success: true,
        message: "Email di test inviata con successo",
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Errore invio email di test",
        error: result.error
      });
    }
  } catch (error) {
    console.error("❌ Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Errore server",
      error: error.message
    });
  }
});

/**
 * 🧪 TEST ENDPOINT - Invia email di errore di test
 * POST /api/email/test-error
 */
router.post("/test-error", protect, async (req, res) => {
  try {
    const { email, name } = req.user;
    
    const result = await sendDocumentErrorEmail(
      email,
      name,
      "test-invoice.pdf",
      999,
      "File PDF corrotto o non leggibile"
    );

    if (result.success) {
      return res.json({
        success: true,
        message: "Email di errore di test inviata con successo",
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Errore invio email di test",
        error: result.error
      });
    }
  } catch (error) {
    console.error("❌ Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Errore server",
      error: error.message
    });
  }
});

export default router;
