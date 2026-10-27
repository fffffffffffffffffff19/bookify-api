import { prisma } from '../../lib/prisma.js';

interface CreateAppointmentRequest {
    clientId: string;
    providerId: string;
    serviceId: string;
    startTime: Date;
}

export class CreateAppointmentUseCase {
    async execute({ clientId, providerId, serviceId, startTime }: CreateAppointmentRequest) {
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
        });

        if (!service) {
            throw new Error('Serviço não encontrado.');
        }

        const endTime = new Date(startTime.getTime() + service.duration * 60000);

        const conflictingAppointment = await prisma.appointment.findFirst({
            where: {
                providerId,
                status: {
                    not: 'CANCELLED',
                },
                AND: [
                    { startTime: { lt: endTime } },
                    { endTime: { gt: startTime } },
                ],
            },
        });

        if (conflictingAppointment) {
            throw new Error('O profissional selecionado já possui um agendamento conflitante neste horário.');
        }

        const appointment = await prisma.appointment.create({
            data: {
                clientId,
                providerId,
                serviceId,
                startTime,
                endTime,
                status: 'PENDING',
            },
        });

        return { appointment };
    }
}