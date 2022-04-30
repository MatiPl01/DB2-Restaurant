import {NextFunction, Request, RequestHandler, Response} from 'express';
import Joi from 'joi';

function validationMiddleware(schema: Joi.Schema): RequestHandler {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        const validationOptions = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: true
        };

        try {
            req.body = await schema.validateAsync(
                req.body,
                validationOptions
            );
            next();
        } catch (e: any) {
            const errors: string[] = [];
            e.details.forEach((error: Joi.ValidationErrorItem) => {
                errors.push(error.message);
            });
            console.log(e)
            res.status(400).send({ errors });
        }
    };
}

export default validationMiddleware;
