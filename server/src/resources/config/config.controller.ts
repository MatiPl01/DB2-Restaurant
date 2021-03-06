import { Router, Request, Response } from 'express';

import selectFieldsMiddleware from '@/middleware/requests/select-fields.middleware';
import validationMiddleware from '@/middleware/validation.middleware';
import updateMiddleware from '@/middleware/requests/update.middleware';
import authenticate from '@/middleware/auth/authentication.middleware';
import restrictTo from '@/middleware/auth/authorization.middleware';

import catchAsync from '@/utils/errors/catch-async';
import Controller from '@/utils/interfaces/controller.interface';
import RoleEnum from '@/utils/enums/role.enum';
import response from '@/utils/response';

import handlerFactory from '../shared/handlerFactory';
import configService from './config.service';
import configModel from './config.model';
import validate from './config.validation'


class ConfigController implements Controller {
    public readonly PATH = 'config';
    public readonly router = Router();
    private readonly configService = configService;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router
            .route('/')
            .get(
                selectFieldsMiddleware,
                validationMiddleware(undefined, undefined, validate.query.getConfig),
                this.getConfig
            )
            .patch(
                authenticate,
                restrictTo(RoleEnum.ADMIN),
                validationMiddleware(validate.body.updateConfig),
                updateMiddleware,
                this.updateConfig
            );
    }

    private getConfig = handlerFactory.findOne(configModel);

    private updateConfig = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<Response | void> => {
        const updatedConfig = await this.configService.updateConfig(req.body);

        await response.json(res, 201, updatedConfig);
    })
}


// Create and export config controller singleton instance
export default new ConfigController();
