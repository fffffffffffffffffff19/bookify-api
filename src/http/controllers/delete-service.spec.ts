import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';
import { prisma } from '../../lib/prisma.js';

describe('Delete Service (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to delete a service', async () => {
        const { token } = await provisionAndAuthenticate(app, 'PROVIDER');

        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Corte de Cabelo',
                description: 'Corte moderno',
                price: 50.0,
                durationInMinutes: 30,
            });

        const listResponse = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${token}`);

        const serviceId = listResponse.body.data.services[0].id;

        const response = await request(app.server)
            .delete(`/services/${serviceId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toEqual(204);
    });

    it('returns a conflict when an appointment references the service', async () => {
        const provider = await provisionAndAuthenticate(app, 'PROVIDER');
        const client = await provisionAndAuthenticate(app, 'CLIENT');
        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${provider.token}`)
            .send({ title: 'Booked Service', price: 50, durationInMinutes: 30 });
        const services = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${provider.token}`);
        const serviceId = services.body.data.services[0].id as string;
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.appointment.create({
            data: {
                clientId: client.actorId,
                providerId: provider.actorId,
                serviceId,
                startTime,
                endTime: new Date(startTime.getTime() + 30 * 60 * 1000),
            },
        });

        const response = await request(app.server)
            .delete(`/services/${serviceId}`)
            .set('Authorization', `Bearer ${provider.token}`);

        expect(response.status).toEqual(409);
        expect(response.body.errorCode).toEqual('RESOURCE_IN_USE');
    });
});