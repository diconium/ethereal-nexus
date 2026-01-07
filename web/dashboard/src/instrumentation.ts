import { registerOTel } from '@vercel/otel';
import { initializeLogsExporter } from './lib/logs-exporter';

export function register() {
  registerOTel({
    serviceName: 'ethereal-nexus-dashboard',
    instrumentationConfig: {
      fetch: {
        ignoreUrls: ['/api/logs'],
        resourceNameTemplate: '{http.method} {http.host}{http.target}',
      },
    },
  });
}
