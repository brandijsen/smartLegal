# Sistema di Logging Centralizzato

## Panoramica

SmartLegal utilizza un sistema di logging centralizzato basato su **Winston** che registra tutti gli eventi, errori e operazioni dell'applicazione in modo strutturato e uniforme.

## Caratteristiche

- **Logging strutturato**: Tutti i log includono timestamp, livello, messaggio e metadati contestuali
- **Rotazione automatica**: I file di log vengono ruotati quando raggiungono 5MB (mantiene 5 file)
- **Livelli multipli**: error, warn, info, debug
- **Context-aware**: Ogni log può includere informazioni come userId, documentId, requestId
- **Logging automatico HTTP**: Tutte le richieste HTTP vengono tracciate automaticamente

## Struttura dei Log

### File di log

I log vengono salvati in `backend/logs/`:

- `combined.log` - Tutti i log (error, warn, info, debug)
- `error.log` - Solo errori (livello error)

### Formato

Ogni log ha questa struttura:

```json
{
  "timestamp": "2024-01-15 14:30:22",
  "level": "info",
  "message": "Document upload completed successfully",
  "service": "smartlegal-backend",
  "environment": "production",
  "userId": 123,
  "documentId": 456,
  "requestId": "abc-def-ghi"
}
```

## Livelli di Log

### ERROR
Errori critici che richiedono attenzione immediata:
- Crash dell'applicazione
- Errori nel processing dei documenti
- Errori di connessione database/redis
- Errori nelle chiamate API esterne

### WARN
Situazioni anomale ma non bloccanti:
- Tentativi di login falliti
- Rate limit raggiunto
- Validation flags sui documenti
- Operazioni lente (>3 secondi)

### INFO
Eventi importanti del normale funzionamento:
- Server avviato
- Utente registrato/loggato
- Documento caricato/processato
- Email inviata

### DEBUG
Informazioni dettagliate per debugging:
- Dettagli delle richieste HTTP
- Parametri delle operazioni
- Dati intermedi del processing

## Utilizzo nel Codice

### 1. Import del logger

```javascript
import logger, { logError, logAuth, logJob } from "../utils/logger.js";
```

### 2. Logging nei Controller

Usa `getRequestLogger` per logging context-aware:

```javascript
import { getRequestLogger } from "../middlewares/logger.middleware.js";

export const uploadDocument = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    // ... operazioni ...
    
    log.info("Document uploaded", { 
      documentId: document.id,
      fileName: file.name 
    });
    
  } catch (err) {
    logError(err, {
      operation: "uploadDocument",
      userId: req.user?.id
    });
    res.status(500).json({ message: "Upload failed" });
  }
};
```

### 3. Logging nei Servizi

Usa le funzioni helper specializzate:

```javascript
// Per chiamate API esterne
logExternalAPI("openai", "semantic_extraction_started", { 
  documentId,
  textLength: rawText.length 
});

// Per operazioni di autenticazione
logAuth("user_logged_in", { 
  userId: user.id, 
  email: user.email 
});

// Per job/worker
logJob("document-processing", "completed", { 
  jobId: job.id,
  documentId 
});

// Per validation
logValidation(documentId, validationFlags, { 
  document_subtype 
});
```

### 4. Logging generico

```javascript
// Info
logger.info("Operation completed", { userId, duration: "150ms" });

// Warning
logger.warn("Slow operation detected", { operation: "export", duration: "5000ms" });

// Error
logger.error("Database connection failed", { 
  error: err.message,
  stack: err.stack 
});

// Debug
logger.debug("Processing details", { step: 3, data: {...} });
```

## Configurazione

### Variabili d'ambiente

```bash
# Livello minimo di log da registrare
LOG_LEVEL=info  # options: error, warn, info, debug

# Mostra log su console (oltre ai file)
CONSOLE_LOGS=true  # false in produzione
```

### Best Practices

1. **Includi sempre contesto**: userId, documentId, requestId quando disponibili
2. **Usa il livello appropriato**: Non loggare tutto come error
3. **Evita informazioni sensibili**: Password, token, dati personali completi
4. **Messaggi descrittivi**: "Document upload failed" è meglio di "Error"
5. **Aggiungi metadati utili**: Durata, parametri, risultati

## Monitoring

### Visualizzare i log

```bash
# Ultimi 100 log
tail -n 100 backend/logs/combined.log

# Follow real-time
tail -f backend/logs/combined.log

# Solo errori
tail -f backend/logs/error.log

# Cerca per userId
grep "userId.*123" backend/logs/combined.log

# Log di oggi con jq (pretty print JSON)
grep "$(date +%Y-%m-%d)" backend/logs/combined.log | jq .
```

### Analisi comuni

```bash
# Contare errori per tipo
grep "level.*error" backend/logs/combined.log | jq -r .message | sort | uniq -c

# Operazioni più lente
grep "slow" backend/logs/combined.log | jq .

# Documenti falliti oggi
grep "$(date +%Y-%m-%d)" backend/logs/combined.log | grep "document.*failed" | jq .

# Rate limit violations
grep "rate.*limit" backend/logs/combined.log | jq .
```

## Request Tracing

Ogni richiesta HTTP riceve un `requestId` unico che permette di tracciare l'intera operazione attraverso tutti i servizi:

```bash
# Traccia una specifica richiesta
grep "requestId.*abc-def-ghi" backend/logs/combined.log | jq .
```

Questo mostra:
1. Richiesta HTTP ricevuta
2. Operazioni del controller
3. Chiamate ai servizi
4. Job queue
5. Worker processing
6. Risposta inviata

## Integrazione con Servizi Esterni

Il sistema è già pronto per l'integrazione con:

- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Datadog** - Monitoring e analytics
- **ELK Stack** - Elasticsearch, Logstash, Kibana

Basta aggiungere un nuovo transport a `logger.js`:

```javascript
import { SentryTransport } from "winston-transport-sentry-node";

logger.add(new SentryTransport({
  sentry: { dsn: process.env.SENTRY_DSN }
}));
```

## Troubleshooting

### Log non vengono scritti

Verifica che la cartella `logs/` esista e sia scrivibile:

```bash
mkdir -p backend/logs
chmod 755 backend/logs
```

### Troppi log

Riduci il livello di log in `.env`:

```bash
LOG_LEVEL=warn  # Solo warn ed error
```

### Performance impatto

Il logging asincrono di Winston ha impatto minimo (<1ms per log). Se necessario, disabilita console output in produzione:

```bash
CONSOLE_LOGS=false
```

## Manutenzione

I file di log vengono ruotati automaticamente. File più vecchi sono compressi con `.gz`.

Per cleanup manuale:

```bash
# Rimuovi log più vecchi di 30 giorni
find backend/logs -name "*.log" -mtime +30 -delete
find backend/logs -name "*.gz" -mtime +30 -delete
```
