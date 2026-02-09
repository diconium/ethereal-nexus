import { registerOTel } from '@vercel/otel';

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
