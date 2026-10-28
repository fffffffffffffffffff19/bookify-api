import { z } from 'zod';

const appointmentListQueryBaseSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
    from: z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
    to: z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
});

export const appointmentListQuerySchema = appointmentListQueryBaseSchema.refine(
    ({ from, to }) => !from || !to || from < to,
    {
        message: 'from must be earlier than to.',
        path: ['to'],
    },
);