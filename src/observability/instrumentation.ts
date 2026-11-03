import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics, SpanStatusCode, trace, type Span } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '');
const sdk = env.OTEL_ENABLED
    ? new NodeSDK({
        serviceName: 'bookify-api',
        traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
        logRecordProcessors: [],
        metricReaders: [new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
            exportIntervalMillis: 30_000,
        })],
        instrumentations: [getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
        })],
    })
    : null;

sdk?.start();

const tracer = trace.getTracer('bookify-api');
const meter = metrics.getMeter('bookify-api');
const requestCounter = meter.createCounter('http.server.request.count', {
    description: 'Number of completed HTTP server requests.',
});
const requestDuration = meter.createHistogram('http.server.request.duration', {
    description: 'HTTP server request duration in milliseconds.',
    unit: 'ms',
});
const requestSpans = new WeakMap<FastifyRequest, { span: Span; startedAt: number }>();

export function instrumentHttpRequests(app: FastifyInstance) {
    if (!env.OTEL_ENABLED) return;

    app.addHook('onRequest', async (request) => {
        const route = request.routeOptions.url ?? 'unmatched';
        requestSpans.set(request, {
            span: tracer.startSpan(`${request.method} ${route}`, {
                attributes: {
                    'http.request.method': request.method,
                    'http.route': route,
                },
            }),
            startedAt: performance.now(),
        });
    });

    app.addHook('onResponse', async (request, reply) => {
        const current = requestSpans.get(request);
        if (!current) return;

        const attributes = {
            'http.request.method': request.method,
            'http.route': request.routeOptions.url ?? 'unmatched',
            'http.response.status_code': reply.statusCode,
        };
        requestCounter.add(1, attributes);
        requestDuration.record(performance.now() - current.startedAt, attributes);
        if (reply.statusCode >= 500) current.span.setStatus({ code: SpanStatusCode.ERROR });
        current.span.end();
        requestSpans.delete(request);
    });
}

export async function shutdownTelemetry() {
    await sdk?.shutdown();
}