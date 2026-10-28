import type { FastifyRequest, FastifyReply } from 'fastify';

export function verifyUserRole(roleToVerify: 'CLIENT' | 'PROVIDER' | 'ADMIN') {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const { role } = request.user;

        if (role !== roleToVerify) {
            return reply.status(403).send({ message: 'Unauthorized.' });
        }
    };
}