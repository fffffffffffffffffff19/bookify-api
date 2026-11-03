import { Readable } from 'node:stream';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';

const batchSize = 500;
const columns = [
    'appointmentId',
    'clientId',
    'providerId',
    'serviceId',
    'startTime',
    'endTime',
    'appointmentStatus',
    'paymentStatus',
    'createdAt',
] as const;

function csvCell(value: unknown) {
    const text = value instanceof Date ? value.toISOString() : String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
}

async function* appointmentCsv() {
    yield `${columns.join(',')}\r\n`;
    let lastId: string | undefined;

    while (true) {
        const rows = await prisma.appointment.findMany({
            ...(lastId ? { where: { id: { gt: lastId } } } : {}),
            take: batchSize,
            orderBy: { id: 'asc' },
            select: {
                id: true,
                clientId: true,
                providerId: true,
                serviceId: true,
                startTime: true,
                endTime: true,
                status: true,
                paymentStatus: true,
                createdAt: true,
            },
        });
        if (rows.length === 0) return;

        for (const row of rows) {
            yield `${[
                row.id,
                row.clientId,
                row.providerId,
                row.serviceId,
                row.startTime,
                row.endTime,
                row.status,
                row.paymentStatus,
                row.createdAt,
            ].map(csvCell).join(',')}\r\n`;
        }

        lastId = rows[rows.length - 1]!.id;
        if (rows.length < batchSize) return;
    }
}

export async function streamAdminReport(_request: FastifyRequest, reply: FastifyReply) {
    return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', 'attachment; filename="appointments.csv"')
        .header('cache-control', 'no-store')
        .send(Readable.from(appointmentCsv()));
}