import type { FastifyRequest, FastifyReply } from 'fastify';

type UserRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';

export function verifyUserRole(roleToVerify: UserRole | readonly UserRole[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const { role } = request.user;
        const allowedRoles = Array.isArray(roleToVerify) ? roleToVerify : [roleToVerify];

        if (!allowedRoles.includes(role)) {
            return reply.status(403).send({ message: 'Unauthorized.' });
        }
    };
}