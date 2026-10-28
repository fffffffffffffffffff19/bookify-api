export class ApplicationError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly errorCode: string,
    ) {
        super(message);
        this.name = 'ApplicationError';
    }
}

export class InvalidCredentialsError extends ApplicationError {
    constructor() {
        super('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
    }
}

export class ResourceNotFoundError extends ApplicationError {
    constructor(message = 'Resource not found.') {
        super(message, 404, 'RESOURCE_NOT_FOUND');
    }
}

export class ResourceConflictError extends ApplicationError {
    constructor(message: string, errorCode = 'RESOURCE_CONFLICT') {
        super(message, 409, errorCode);
    }
}

export class BusinessRuleError extends ApplicationError {
    constructor(message: string, errorCode = 'BUSINESS_RULE_VIOLATION') {
        super(message, 400, errorCode);
    }
}

export class ForbiddenError extends ApplicationError {
    constructor(message = 'Not authorized.') {
        super(message, 403, 'FORBIDDEN');
    }
}