import { fastify } from 'fastify';
import { prisma } from './lib/prisma.js';
import { userRoutes } from './http/routes/users.routes.js';

const app = fastify({ logger: true });

app.get('/health', async () => {
    return { status: 'ok', message: 'Bookify API is running smoothly!' };
});

app.register(userRoutes); // 2. Registar as rotas no Fastify

const start = async () => {
    try {
        await app.listen({ port: 3333, host: '0.0.0.0' });
        console.log('HTTP Server running on http://localhost:3333');
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();