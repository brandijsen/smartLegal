#!/bin/bash
# Script per eseguire backup giornaliero (Linux/Mac)
# Aggiungi a crontab: 0 3 * * * /path/to/InvParser/backend/scripts/cron-backup.sh

cd "$(dirname "$0")/.."
node scripts/backup-database.js
