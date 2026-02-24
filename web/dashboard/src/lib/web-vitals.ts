'use client';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { metrics } from '@opentelemetry/api';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { onLCP, onINP, onCLS } from 'web-vitals';

let isInitialized = false;
export function initializeWebVitals() {
  if (typeof window === 'undefined' || isInitialized) return;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]:
      process.env.OTEL_PUBLIC_SERVICE_NAME ||
      'ethereal-nexus-dashboard-frontend',
  });

  const reader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 10000,
  });

  const meterProvider = new MeterProvider({ resource, readers: [reader] });
  metrics.setGlobalMeterProvider(meterProvider);
  const meter = metrics.getMeter('web-vitals');

  const lcp = meter.createHistogram('web_vitals_lcp', { unit: 'ms' });
  const inp = meter.createHistogram('web_vitals_inp', { unit: 'ms' });
  const cls = meter.createUpDownCounter('web_vitals_cls', { unit: '1' });

  const record = (metric: any) => {
    const attrs = {
      page: window.location.pathname,
      rating: metric.rating,
    };
    if (metric.name === 'LCP') lcp.record(metric.value, attrs);
    else if (metric.name === 'INP') inp.record(metric.value, attrs);
    else if (metric.name === 'CLS') cls.add(metric.value, attrs);
  };

  onLCP(record);
  onINP(record);
  onCLS(record);
  isInitialized = true;
}
