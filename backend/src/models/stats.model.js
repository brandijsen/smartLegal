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

    const doc = statusStats[0];
    return {
      documents: {
        total: Number(doc?.total ?? 0),
        done: Number(doc?.done ?? 0),
        processing: Number(doc?.processing ?? 0),
        pending: Number(doc?.pending ?? 0),
        failed: Number(doc?.failed ?? 0),
      },
      amounts: amountsByCurrency,
      defective: Number(defectiveStats[0]?.count ?? 0),
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
   * Ottiene distribuzione per tipo documento (doc_type + doc_subtype)
   */
  async getDocumentTypeDistribution(userId) {
    const [rows] = await pool.execute(
      `
      SELECT 
        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.document_type')), 'other') as doc_type,
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

  /**
   * Ottiene conteggio documenti per bucket scadenza (tag due_date)
   */
  async getScadenzaDistribution(userId) {
    const [rows] = await pool.execute(
      `
      SELECT t.name, t.color, COUNT(CASE WHEN d.id IS NOT NULL THEN 1 END) as count
      FROM tags t
      LEFT JOIN document_tags dt ON t.id = dt.tag_id
      LEFT JOIN documents d ON dt.document_id = d.id AND d.user_id = ?
      WHERE t.user_id = ? AND t.name IN ('60 days', '30 days', '10 days', '1 day', 'Due today', 'Overdue')
      GROUP BY t.id, t.name, t.color
      ORDER BY 
        FIELD(t.name, '60 days', '30 days', '10 days', '1 day', 'Due today', 'Overdue')
      `,
      [userId, userId]
    );

    return rows;
  },

  /**
   * Ottiene spesa aggregata per mese (ultimi N giorni, per data fattura o upload)
   */
  async getSpendingTrend(userId, days = 90) {
    const [rows] = await pool.execute(
      `
      SELECT 
        DATE_FORMAT(COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.invoice_date.value')),
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.invoice_date')),
          d.uploaded_at
        ), '%Y-%m') as month,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.currency.value')),
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.currency')),
          'EUR'
        ) as currency_val,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.total_amount.value')),
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.total_amount')),
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.subtotal')),
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.net_payable.value')),
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.net_payable')),
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.gross_fee.value')),
          JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts.gross_fee'))
        ) as amount_val
      FROM documents d
      JOIN document_results dr ON d.id = dr.document_id
      WHERE d.user_id = ? AND d.status = 'done'
        AND JSON_EXTRACT(dr.parsed_json, '$.semantic.amounts') IS NOT NULL
      `,
      [userId]
    );

    const byMonth = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (const row of rows) {
      let month = row?.month;
      if (month instanceof Date) month = month.toISOString().slice(0, 7);
      if (!month || typeof month !== "string") continue;

      const monthStr = String(month).trim();
      const monthDate = new Date(monthStr + "-01");
      if (isNaN(monthDate.getTime()) || monthDate < cutoff) continue;

      const currency = String(row.currency_val || "EUR").trim() || "EUR";
      const amount = parseFloat(row.amount_val);
      if (isNaN(amount) || amount <= 0) continue;

      if (!byMonth[monthStr]) byMonth[monthStr] = {};
      byMonth[monthStr][currency] = (byMonth[monthStr][currency] || 0) + amount;
    }

    return Object.entries(byMonth)
      .map(([month, amounts]) => ({ month, ...amounts }))
      .sort((a, b) => String(a.month).localeCompare(String(b.month)));
  },

  /**
   * Ultimi documenti caricati (per dashboard)
   */
  async getLatestDocuments(userId, limit = 5) {
    const [rows] = await pool.execute(
      `
      SELECT id, original_name, status, uploaded_at
      FROM documents
      WHERE user_id = ?
      ORDER BY uploaded_at DESC
      LIMIT ?
      `,
      [userId, limit]
    );

    return rows;
  },
};
