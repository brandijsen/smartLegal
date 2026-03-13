/**
 * Database Backup Script
 *
 * - mysqldump + gzip
 * - Salva localmente (backups/)
 * - Upload su S3
 * - Retention 30 giorni
 * - Email alert su failure
 *
 * Esecuzione: node scripts/backup-database.js
 * Cron: 0 3 * * * (ogni giorno alle 3:00)
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const RETENTION_DAYS = 30;
const BACKUP_DIR = path.join(__dirname, "..", "backups");
const DATE_STR = new Date().toISOString().slice(0, 10);
const TIME_STR = new Date().toISOString().slice(11, 19).replace(/:/g, "");
const BACKUP_FILENAME = `invparser_${DATE_STR}_${TIME_STR}.sql.gz`;
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_FILENAME);

const REQUIRED_ENV = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME", "DB_PORT"];
const S3_ENV = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"];

function log(msg, level = "info") {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  console.log(line);
  return line;
}

function runMysqldumpDocker() {
  return new Promise((resolve, reject) => {
    const args = [
      "exec",
      "invparser_mysql",
      "mysqldump",
      "-u",
      process.env.DB_USER,
      `--password=${process.env.DB_PASS}`,
      "--single-transaction",
      "--routines",
      "--triggers",
      process.env.DB_NAME,
    ];

    log(`Running: docker ${args.join(" ").replace(/--password=.*/, "--password=***")}`);

    const proc = spawn("docker", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks = [];
    proc.stdout.on("data", (chunk) => chunks.push(chunk));
    proc.stderr.on("data", (chunk) => chunks.push(chunk));

    proc.on("close", (code, signal) => {
      if (code !== 0) {
        const err = Buffer.concat(chunks).toString("utf8");
        reject(new Error(`mysqldump failed (${code}): ${err}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });

    proc.on("error", (err) => reject(err));
  });
}

function runMysqldumpDirect() {
  return new Promise((resolve, reject) => {
    const args = [
      "-h",
      process.env.DB_HOST,
      "-P",
      process.env.DB_PORT,
      "-u",
      process.env.DB_USER,
      `--password=${process.env.DB_PASS}`,
      "--single-transaction",
      "--routines",
      "--triggers",
      process.env.DB_NAME,
    ];

    log(`Running: mysqldump ${args.join(" ").replace(/--password=.*/, "--password=***")}`);

    const proc = spawn("mysqldump", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks = [];
    proc.stdout.on("data", (chunk) => chunks.push(chunk));
    proc.stderr.on("data", (chunk) => chunks.push(chunk));

    proc.on("close", (code, signal) => {
      if (code !== 0) {
        const err = Buffer.concat(chunks).toString("utf8");
        reject(new Error(`mysqldump failed (${code}): ${err}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });

    proc.on("error", (err) => reject(err));
  });
}

async function runMysqldump() {
  const useDocker = process.env.BACKUP_USE_DOCKER !== "false";

  if (useDocker) {
    try {
      return await runMysqldumpDocker();
    } catch (err) {
      log(`Docker mysqldump failed, falling back to direct: ${err.message}`, "warn");
      return await runMysqldumpDirect();
    }
  } else {
    return await runMysqldumpDirect();
  }
}

async function saveAndCompress(dumpBuffer) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const zlib = await import("zlib");
  const { promisify } = await import("util");
  const gzipAsync = promisify(zlib.gzip);

  const compressed = await gzipAsync(dumpBuffer);
  fs.writeFileSync(BACKUP_PATH, compressed);
  log(`Saved local backup: ${BACKUP_PATH} (${(compressed.length / 1024).toFixed(1)} KB)`);
  return BACKUP_PATH;
}

async function uploadToS3(filePath) {
  const hasS3 = S3_ENV.every((k) => process.env[k]);
  if (!hasS3) {
    log("S3 credentials not configured, skipping cloud upload", "warn");
    return;
  }

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const fsAsync = await import("fs/promises");

  const client = new S3Client({
    region: process.env.AWS_REGION || "eu-west-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const key = `backups/${path.basename(filePath)}`;
  const body = await fsAsync.readFile(filePath);

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/gzip",
    })
  );

  log(`Uploaded to S3: s3://${process.env.AWS_S3_BUCKET}/${key}`);
}

function applyRetentionLocal() {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs.readdirSync(BACKUP_DIR);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const f of files) {
    if (!f.endsWith(".sql.gz")) continue;
    const fp = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(fp);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(fp);
      log(`Deleted old local backup: ${f}`);
    }
  }
}

async function applyRetentionS3() {
  const hasS3 = S3_ENV.every((k) => process.env[k]);
  if (!hasS3) return;

  const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = await import(
    "@aws-sdk/client-s3"
  );

  const client = new S3Client({
    region: process.env.AWS_REGION || "eu-west-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const list = await client.send(
    new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: "backups/",
    })
  );

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const toDelete = (list.Contents || []).filter((obj) => obj.LastModified && new Date(obj.LastModified).getTime() < cutoff);

  for (const obj of toDelete) {
    if (!obj.Key) continue;
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: obj.Key,
      })
    );
    log(`Deleted old S3 backup: ${obj.Key}`);
  }
}

async function sendAlertEmail(subject, body) {
  const email = process.env.BACKUP_ALERT_EMAIL;
  if (!email) return;

  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `[InvParser Backup] ${subject}`,
      text: body,
    });
    log(`Alert email sent to ${email}`);
  } catch (err) {
    log(`Failed to send alert email: ${err.message}`, "error");
  }
}

async function main() {
  log("Starting database backup");

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      const msg = `Missing required env: ${key}`;
      log(msg, "error");
      if (process.env.BACKUP_ALERT_EMAIL) {
        await sendAlertEmail("Backup Failed", msg);
      }
      process.exit(1);
    }
  }

  try {
    const dump = await runMysqldump();
    const filePath = await saveAndCompress(dump);
    await uploadToS3(filePath);
    applyRetentionLocal();
    await applyRetentionS3();
    log("Backup completed successfully");
  } catch (err) {
    log(`Backup failed: ${err.message}`, "error");
    await sendAlertEmail("Backup Failed", `Error: ${err.message}\n\nStack: ${err.stack}`);
    process.exit(1);
  }
}

main();
