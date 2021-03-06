import { Request, Response, NextFunction } from 'express';

import mongoError from '@/utils/errors/mongo.error';
import jwtError from '@/utils/errors/jwt.error';
import IError from '@/utils/interfaces/error.interface';


const sendErrorDev = (error: IError, res: Response) => {
    res.status(error.status).send({
        status: error.statusMessage,
        error,
        message: error.message,
        stack: error.stack
    });
}

const sendErrorProd = (error: IError, res: Response) => {
    // Send an error to the user if this is an operational error
    if (error.isOperational) {
        res.status(error.status).send({
            status: error.statusMessage,
            message: error.message
        });
        // Otherwise, if an error is unexpected, send the generic message to the user
    } else {
        console.error('Error 💥', error);

        res.status(500).json({
            status: 'error',
            message: 'Ooops! Something unexpected has happened!'
        })
    }
}

const errorMiddleware = (
    error: IError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    error.status = error.status || 500;
    error.statusMessage = error.statusMessage || 'error';

    switch (process.env.NODE_ENV) {
        case 'development':
            return sendErrorDev(error, res);
        case 'production':
            let err: IError = error;

            if (err.name === 'CastError')
                err = mongoError.handleCastError(err);
            else if (err.code === 11000)
                err = mongoError.handleDuplicateField(err);
            else if (err.name === 'ValidationError')
                err = mongoError.handleValidationError(err);
            else if (err.name === 'JsonWebTokenError')
                err = jwtError.handleJWTError();
            else if (err.name === 'TokenExpiredError')
                err = jwtError.handleTokenExpired();

            return sendErrorProd(err, res);
        default:
            throw new Error('Invalid node environment');
    }
}


export default errorMiddleware;
