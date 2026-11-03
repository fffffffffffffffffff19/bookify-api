import { app } from './app.js';
import { env } from './config/env.js';

const start = async () => {
    try {
        await app.listen({ port: env.PORT, host: '0.0.0.0' });
        app.log.info(`HTTP server listening on port ${env.PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

let shuttingDown = false;
const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info(`Received ${signal}; closing HTTP server`);

    try {
        await app.close();
    } catch (error) {
        app.log.error(error, 'Failed to close HTTP server cleanly');
        process.exitCode = 1;
    }
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

start();