import { NextFunction, Request, Response } from 'express';

import catchAsync from '@/utils/errors/catch-async';
import AppError from '@/utils/errors/app.error';


const parseFields = (fields: string) => {
    let mode = 0;
    const error = new AppError(400, 'Inconsistent fields select options. Cannot include and exclude fields at the same time');
    const result: { [key: string]: number } = {};

    fields.split(',').forEach(field => {
        // Don't allow mixed option types (allow only include or only exclude options)
        if (field.startsWith('-')) {
            if (mode == 1) throw error;
            mode = -1;
            result[field.slice(1)] = 0;
        } else {
            if (mode == -1) throw error;
            mode = 1;
            result[field] = 1;
        }
    });

    return result;
}

const selectFieldsMiddleware = catchAsync(async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> => {
    if (typeof req.query.fields === 'string') {
        req.fields = parseFields(req.query.fields);
    } else {
        req.fields = {};
    }

    next();
});


export default selectFieldsMiddleware;
