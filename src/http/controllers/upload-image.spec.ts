import { app } from '../../app.js';
import { storage } from '../../storage/index.js';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const uploadedKeys: string[] = [];
function trackUrl(url: string) {
    uploadedKeys.push(decodeURIComponent(url.slice('/uploads/'.length)));
}

describe('Image uploads (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterEach(async () => {
        await Promise.all(uploadedKeys.splice(0).map((key) => storage.delete(key)));
    });

    afterAll(async () => {
        await app.close();
    });

    it('requires authentication to upload an avatar', async () => {
        const response = await request(app.server)
            .patch('/me/avatar')
            .attach('file', png, { filename: 'avatar.png', contentType: 'image/png' });

        expect(response.status).toBe(401);
    });

    it('stores an authenticated avatar and serves it over HTTP', async () => {
        const { token } = await provisionAndAuthenticate(app, 'CLIENT');
        const response = await request(app.server)
            .patch('/me/avatar')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', png, { filename: 'avatar.png', contentType: 'image/png' });

        expect(response.status).toBe(200);
        const avatarUrl = response.body.data.user.avatarUrl as string;
        trackUrl(avatarUrl);
        expect(avatarUrl).toMatch(/^\/uploads\/avatars\//);

        const imageResponse = await request(app.server).get(avatarUrl);
        expect(imageResponse.status).toBe(200);
        expect(imageResponse.headers['content-type']).toContain('image/png');
    });

    it('rejects unsupported types, mismatched contents, and oversized files', async () => {
        const { token } = await provisionAndAuthenticate(app, 'CLIENT');
        const auth = { Authorization: `Bearer ${token}` };

        const unsupported = await request(app.server)
            .patch('/me/avatar')
            .set(auth)
            .attach('file', Buffer.from('not an image'), { filename: 'bad.txt', contentType: 'text/plain' });
        expect(unsupported.status).toBe(400);

        const mismatch = await request(app.server)
            .patch('/me/avatar')
            .set(auth)
            .attach('file', Buffer.from('not png'), { filename: 'bad.png', contentType: 'image/png' });
        expect(mismatch.status).toBe(400);

        const oversized = await request(app.server)
            .patch('/me/avatar')
            .set(auth)
            .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1, 1), { filename: 'large.png', contentType: 'image/png' });
        expect(oversized.status).toBe(413);
    });

    it('allows only the service owner to upload a service image', async () => {
        const owner = await provisionAndAuthenticate(app, 'PROVIDER');
        const otherProvider = await provisionAndAuthenticate(app, 'PROVIDER');
        const created = await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${owner.token}`)
            .send({ title: 'Image test service', price: 25, durationInMinutes: 30 });
        const serviceId = created.body.data.service.id as string;

        const forbidden = await request(app.server)
            .patch(`/services/${serviceId}/image`)
            .set('Authorization', `Bearer ${otherProvider.token}`)
            .attach('file', png, { filename: 'service.png', contentType: 'image/png' });
        expect(forbidden.status).toBe(403);

        const response = await request(app.server)
            .patch(`/services/${serviceId}/image`)
            .set('Authorization', `Bearer ${owner.token}`)
            .attach('file', png, { filename: 'service.png', contentType: 'image/png' });
        expect(response.status).toBe(200);
        trackUrl(response.body.data.service.imageUrl as string);
    });
});