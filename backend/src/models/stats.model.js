import { pool } from "../config/db.js";

export const StatsModel = {
  /**
   * Ottiene statistiche overview per l'utente
   */
  async getOverview(userId) {
    // Totale documenti per status
    const [statusStats] = await pool.execute(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM documents
      WHERE user_id = ?
      `,
      [userId]
    );

    // Count defective documents
    const [defectiveStats] = await pool.execute(
      `
      SELECT COUNT(*) as count
      FROM documents
      WHERE user_id = ? AND is_defective = 1
      `,
      [userId]
    );

    // Calcola importi totali (aggregando da document_results)
    const [amountsStats] = await pool.execute(
      `
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.currency.value')) as currency_val,
        JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.currency')) as currency_simple,
        JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.total_amount.value')) as total_amount_val,
        JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.total_amount')) as total_amount_simple,
        JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.net_payable.value')) as net_payable_val,
        JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.net_payable')) as net_payable_simple
      FROM documents d
      JOIN document_results dr ON d.id = dr.document_id
      WHERE d.user_id = ? AND d.status = 'done'
      `,
      [userId]
    );

    // Aggrega importi per valuta
    const amountsByCurrency = {};
    amountsStats.forEach((row) => {
      // Supporta sia formato vecchio che nuovo
      const currency = row.currency_val || row.currency_simple;
      const amount = row.total_amount_val || row.total_amount_simple || row.net_payable_val || row.net_payable_simple;

      if (currency && amount) {
        if (!amountsByCurrency[currency]) {
          amountsByCurrency[currency] = 0;
        }
        amountsByCurrency[currency] += parseFloat(amount);
      }
    });

    return {
      documents: statusStats[0],
      amounts: amountsByCurrency,
      defective: defectiveStats[0].count,
    };
  },

  /**
   * Ottiene trend di upload (ultimi 30 giorni)
   */
  async getUploadTrend(userId, days = 30) {
    const [rows] = await pool.execute(
      `
      SELECT 
        DATE(uploaded_at) as date,
        COUNT(*) as count
      FROM documents
      WHERE user_id = ? 
        AND uploaded_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(uploaded_at)
      ORDER BY date ASC
      `,
      [userId, days]
    );

    return rows;
  },

  /**
   * Ottiene distribuzione per tipo documento
   */
  async getDocumentTypeDistribution(userId) {
    const [rows] = await pool.execute(
      `
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.document_type')) as doc_type,
        JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.document_subtype')) as doc_subtype,
        COUNT(*) as count
      FROM documents d
      JOIN document_results dr ON d.id = dr.document_id
      WHERE d.user_id = ? AND d.status = 'done'
      GROUP BY doc_type, doc_subtype
      `,
      [userId]
    );

    return rows;
  },
};
