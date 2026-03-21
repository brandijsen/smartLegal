/**
 * Document HTTP handlers — re-exported from ./document/* (routes unchanged).
 */
export { getUserDocuments, getDocumentById } from "./document/documents.list.js";
export { deleteDocument, bulkDeleteDocuments } from "./document/documents.delete.js";
export {
  getDocumentResult,
  getDocumentRaw,
  downloadDocument,
} from "./document/documents.read.js";
export { updateDocumentResult, updateDocumentSupplier } from "./document/documents.write.js";
export {
  bulkUnmarkDefective,
  markDocumentDefective,
  unmarkDocumentDefective,
  getDefectiveDocuments,
} from "./document/documents.defective.js";
