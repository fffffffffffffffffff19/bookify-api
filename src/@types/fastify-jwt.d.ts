import '@fastify/jwt';

declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            role: 'CLIENT' | 'PROVIDER' | 'ADMIN';
        };
    }
}