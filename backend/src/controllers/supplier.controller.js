import { SupplierModel } from "../models/supplier.model.js";
import { logError } from "../utils/logger.js";

/**
 * Verifica che supplierId esista e appartenga all'utente
 */
async function getSupplierOr404(supplierId, userId) {
  const parsed = parseInt(supplierId, 10);
  if (isNaN(parsed)) return null;
  const supplier = await SupplierModel.findById(parsed, userId);
  if (!supplier) return null;
  return supplier;
}

/**
 * GET /api/suppliers?search=xxx
 * Lista fornitori dell'utente, con ricerca opzionale
 */
export const listSuppliers = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const search = String(req.query.search || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const suppliers = await SupplierModel.findByUser(req.user.id, { search, limit });
    res.json({ suppliers });
  } catch (err) {
    logError(err, { operation: "listSuppliers", userId: req.user?.id });
    let message = "Failed to list suppliers";
    if (err.code === "ER_NO_SUCH_TABLE") {
      message = "Suppliers table not found. Run: mysql -u root -p invparser < backend/migrations/db.sql";
    } else if (process.env.NODE_ENV !== "production") {
      message = err.message || message;
    }
    res.status(500).json({ message });
  }
};

/**
 * GET /api/suppliers/:id
 * Get a single supplier by ID
 */
export const getSupplier = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const supplierId = req.params.id;
    const supplier = await getSupplierOr404(supplierId, req.user.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json({ supplier });
  } catch (err) {
    logError(err, { operation: "getSupplier", userId: req.user?.id, supplierId: req.params?.id });
    res.status(500).json({ message: err.message || "Failed to get supplier" });
  }
};

/**
 * POST /api/suppliers
 * Crea un nuovo fornitore manualmente
 * Body: { name, vat_number?, address?, email? }
 */
export const createSupplier = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const { name, vat_number, address, email } = req.body;
    const nameStr = String(name || "").trim();
    if (!nameStr) {
      return res.status(400).json({ message: "name is required" });
    }
    const supplier = await SupplierModel.create({
      userId: req.user.id,
      name: nameStr,
      vatNumber: vat_number || null,
      address: address || null,
      email: email || null,
    });
    res.status(201).json({ supplier });
  } catch (err) {
    logError(err, { operation: "createSupplier", userId: req.user?.id });
    res.status(500).json({ message: err.message || "Failed to create supplier" });
  }
};

/**
 * PATCH /api/suppliers/:id
 * Aggiorna un fornitore
 * Body: { name?, vat_number?, address?, email? } (tutti opzionali, almeno uno richiesto)
 */
export const updateSupplier = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const supplierId = req.params.id;
    const existing = await getSupplierOr404(supplierId, req.user.id, res);
    if (!existing) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    const { name, vat_number, address, email } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (vat_number !== undefined) updates.vat_number = vat_number;
    if (address !== undefined) updates.address = address;
    if (email !== undefined) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "At least one field to update is required" });
    }
    if (updates.name !== undefined && !String(updates.name || "").trim()) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

    const supplier = await SupplierModel.updateById(supplierId, req.user.id, updates);
    res.json({ supplier });
  } catch (err) {
    logError(err, { operation: "updateSupplier", userId: req.user?.id, supplierId: req.params.id });
    res.status(500).json({ message: err.message || "Failed to update supplier" });
  }
};

/**
 * DELETE /api/suppliers/:id
 * Elimina un fornitore. I documenti collegati avranno supplier_id = NULL (ON DELETE SET NULL).
 */
export const deleteSupplier = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const supplierId = req.params.id;
    const existing = await getSupplierOr404(supplierId, req.user.id, res);
    if (!existing) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const deleted = await SupplierModel.deleteById(supplierId, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(204).send();
  } catch (err) {
    logError(err, { operation: "deleteSupplier", userId: req.user?.id, supplierId: req.params.id });
    res.status(500).json({ message: err.message || "Failed to delete supplier" });
  }
};
