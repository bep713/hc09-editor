const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.prettyPrint(),
        winston.format.splat(),
        winston.format.timestamp({
            format: 'MM-DD-YYYY HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
            let message = info.message;

            if (typeof info.message === 'object') {
                message = `${JSON.stringify(info.message, null, 3)}`;
            }

            if (info.durationMs) {
                message += ` ${info.durationMs}ms`;
            }

            info.message = `${info.timestamp} ${info.level}: ${message}`;
            return info.message;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'log/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'log/combined.log' })
    ]
});

module.exports = logger;