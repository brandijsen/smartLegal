# Crea Task Scheduler per backup giornaliero alle 3:00
# Esegui come Amministratore: PowerShell -ExecutionPolicy Bypass -File setup-task-scheduler.ps1

$scriptPath = Join-Path $PSScriptRoot "cron-backup.bat"
$taskName = "InvParser-DatabaseBackup"
$description = "Backup giornaliero database InvParser alle 3:00"

# Rimuovi task esistente se presente
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Crea trigger: ogni giorno alle 3:00
$trigger = New-ScheduledTaskTrigger -Daily -At "3:00AM"
$action = New-ScheduledTaskAction -Execute $scriptPath -WorkingDirectory (Split-Path $PSScriptRoot)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description $description

Write-Host "Task creato: $taskName"
Write-Host "Esegue: $scriptPath"
Write-Host "Orario: ogni giorno alle 3:00"
Write-Host ""
Write-Host "Per testare: Start-ScheduledTask -TaskName $taskName"
Write-Host "Per rimuovere: Unregister-ScheduledTask -TaskName $taskName"
