import { describe, beforeEach, it, expect } from 'vitest';
import { CreateAppointmentUseCase } from './create-appointment.js';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let servicesRepository: InMemoryServicesRepository;
let sut: CreateAppointmentUseCase;

describe('Create Appointment Use Case', () => {
    beforeEach(async () => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        servicesRepository = new InMemoryServicesRepository();
        sut = new CreateAppointmentUseCase(appointmentsRepository, servicesRepository);

        await servicesRepository.create({
            id: 'service-1',
            title: 'Corte de Cabelo',
            price: 50.0,
            durationInMinutes: 30,
            userId: 'provider-1',
        });
    });

    it('deve ser possível criar um agendamento', async () => {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);

        const { appointment } = await sut.execute({
            clientId: 'client-1',
            serviceId: 'service-1',
            startTime,
        });

        expect(appointment.id).toEqual(expect.any(String));
        expect(appointment.status).toEqual('PENDING');
    });

    it('não deve ser possível criar agendamentos no mesmo horário para o mesmo prestador', async () => {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);

        await sut.execute({
            clientId: 'client-1',
            serviceId: 'service-1',
            startTime,
        });

        await expect(() =>
            sut.execute({
                clientId: 'client-2',
                serviceId: 'service-1',
                startTime,
            })
        ).rejects.toThrow();
    });
});