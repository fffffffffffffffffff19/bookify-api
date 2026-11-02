import type { FastifyInstance } from 'fastify';
import { stripeWebhook } from '../controllers/stripe-webhook.js';
import { errorResponses } from '../schemas/openapi.js';

export async function webhooksRoutes(app: FastifyInstance) {
    app.removeContentTypeParser('application/json');
    app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
        done(null, body);
    });

    app.post('/webhooks/stripe', {
        schema: {
            tags: ['Payments'],
            summary: 'Receive and verify Stripe payment events',
            response: {
                200: { description: 'Webhook event accepted', type: 'object', additionalProperties: true },
                ...errorResponses,
                503: { description: 'Webhook processing is not configured', type: 'object', additionalProperties: true },
            },
        },
    }, stripeWebhook);
}