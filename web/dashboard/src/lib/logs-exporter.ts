import { logs, LogRecord } from '@opentelemetry/api-logs'
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import type { LogEntry } from '@/lib/logger' // We will create this type in the next step

let isInitialized = false
let loggerProvider: LoggerProvider | null = null

const LOG_EXPORT_URL = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'

function createLoggerProvider() {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'ethereal-nexus-dashboard',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
  })

  const exporter = new OTLPLogExporter({
    url: `${LOG_EXPORT_URL.replace(/\/$/, '')}/v1/logs`,
  })

  const batchProcessor = new BatchLogRecordProcessor(exporter, {
    maxExportBatchSize: 20,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
    maxQueueSize: 1000,
  })

  return new LoggerProvider({
    resource,
    processors: [batchProcessor],
  })
}

export function initializeLogsExporter() {
  if (typeof window !== 'undefined' || isInitialized) {
    return
  }

  loggerProvider = createLoggerProvider()
  logs.setGlobalLoggerProvider(loggerProvider)
  isInitialized = true
  console.log('✅ OpenTelemetry logs exporter initialized')
}

export function exportLogEntry(entry: LogEntry) {
  if (typeof window !== 'undefined') return
  if (!isInitialized) {
    initializeLogsExporter()
  }
  if (!loggerProvider) return

  const logger = loggerProvider.getLogger(
    process.env.OTEL_SERVICE_NAME ?? 'ethereal-nexus-dashboard'
  )

  const attributes: Record<string, string | number | boolean | undefined> = {
    ...entry.context,
    'log.level': entry.level,
    'service.name': process.env.OTEL_SERVICE_NAME ?? 'ethereal-nexus-dashboard',
  }

  if (entry.error) {
    attributes['error.name'] = entry.error.name
    attributes['error.message'] = entry.error.message
    attributes['error.stack'] = entry.error.stack ?? ''
  }

  const logRecord: LogRecord = {
    body: entry.message,
    timestamp: Date.now(),
    observedTimestamp: Date.now(),
    severityNumber: getSeverityNumber(entry.level),
    severityText: entry.level.toUpperCase(),
    attributes: attributes as any,
  }

  logger.emit(logRecord)
}

function getSeverityNumber(level: LogEntry['level']): number {
  switch (level) {
    case 'debug':
      return 5
    case 'info':
      return 9
    case 'warn':
      return 13
    case 'error':
      return 17
    default:
      return 9
  }
}

export function shutdownLogsExporter() {
  return loggerProvider?.shutdown() ?? Promise.resolve()
}
