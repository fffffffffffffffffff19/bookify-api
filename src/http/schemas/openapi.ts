const errorEnvelope = {
    type: 'object',
    properties: {
        message: { type: 'string' },
        errorCode: { type: 'string' },
        issues: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                    path: { type: 'array', items: { type: ['string', 'number'] } },
                },
                additionalProperties: true,
            },
        },
    },
    required: ['message'],
};

export const bearerSecurity = [{ bearerAuth: [] }];

export const errorResponses = {
    400: { description: 'Validation or business rule error', ...errorEnvelope },
    401: { description: 'Authentication required or invalid credentials', ...errorEnvelope },
    403: { description: 'Forbidden', ...errorEnvelope },
    404: { description: 'Resource not found', ...errorEnvelope },
    409: { description: 'Resource conflict', ...errorEnvelope },
    429: {
        description: 'Too many requests',
        type: 'object',
        properties: {
            error: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'TOO_MANY_REQUESTS' },
                    message: { type: 'string' },
                },
                required: ['code', 'message'],
            },
        },
        required: ['error'],
    },
};

export function responses(successStatus: 200 | 201 = 200, description = 'Successful response') {
    return {
        [successStatus]: {
            description,
            type: 'object',
            additionalProperties: true,
        },
        ...errorResponses,
    };
}

export function transformOpenApiRoute({ schema, url }: { schema: Record<string, any>; url: string }) {
    if (!schema.response) {
        return { schema, url };
    }

    const documentedResponses = Object.fromEntries(
        Object.entries(schema.response).map(([status, responseSchema]) => {
            const response = responseSchema as Record<string, unknown>;
            const statusCode = Number(status);
            if (statusCode < 200 || statusCode >= 300 || statusCode === 204) {
                return [status, responseSchema];
            }

            const { description, ...rawBodySchema } = response;
            return [status, {
                description,
                type: 'object',
                properties: {
                    data: rawBodySchema,
                },
                required: ['data'],
            }];
        }),
    );

    return {
        schema: { ...schema, response: documentedResponses },
        url,
    };
}

export const schemas = {
    idParams: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
    },
    serviceIdParams: {
        type: 'object',
        properties: { serviceId: { type: 'string', format: 'uuid' } },
        required: ['serviceId'],
    },
    registerBody: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6, format: 'password' },
            phone: { type: 'string' },
        },
        required: ['name', 'email', 'password'],
    },
    authenticateBody: {
        type: 'object',
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6, format: 'password' },
        },
        required: ['email', 'password'],
    },
    updateProfileBody: {
        type: 'object',
        properties: {
            name: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            oldPassword: { type: 'string', minLength: 6, format: 'password' },
            newPassword: { type: 'string', minLength: 6, format: 'password' },
        },
    },
    createServiceBody: {
        type: 'object',
        properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', minimum: 0 },
            durationInMinutes: { type: 'integer', minimum: 1 },
        },
        required: ['title', 'price', 'durationInMinutes'],
    },
    updateServiceBody: {
        type: 'object',
        properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', minimum: 0 },
            durationInMinutes: { type: 'integer', minimum: 1 },
        },
    },
    createAppointmentBody: {
        type: 'object',
        properties: {
            serviceId: { type: 'string', format: 'uuid' },
            startTime: { type: 'string', format: 'date-time' },
        },
        required: ['serviceId', 'startTime'],
    },
    rescheduleBody: {
        type: 'object',
        properties: { startTime: { type: 'string', format: 'date-time' } },
        required: ['startTime'],
    },
    statusBody: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] } },
        required: ['status'],
    },
    createReviewBody: {
        type: 'object',
        properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string', maxLength: 500 },
        },
        required: ['rating'],
    },
    availabilityQuery: {
        type: 'object',
        properties: { date: { type: 'string', format: 'date' } },
        required: ['date'],
    },
    appointmentListQuery: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            perPage: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] },
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
        },
    },
    createBusinessHoursBody: {
        type: 'object',
        properties: {
            allowedDays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } },
            openHour: { type: 'integer', minimum: 0, maximum: 23 },
            closeHour: { type: 'integer', minimum: 0, maximum: 23 },
        },
        required: ['allowedDays', 'openHour', 'closeHour'],
    },
};
