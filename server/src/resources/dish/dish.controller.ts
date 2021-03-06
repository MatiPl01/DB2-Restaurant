import { Request, Response, Router } from 'express';
import { Schema } from 'mongoose';

import selectFieldsMiddleware from '@/middleware/requests/select-fields.middleware';
import validationMiddleware from '@/middleware/validation.middleware';
import filteringMiddleware from '@/middleware/requests/filtering.middleware';
import updateMiddleware from '@/middleware/requests/update.middleware';
import authenticate from '@/middleware/auth/authentication.middleware';
import restrictTo from '@/middleware/auth/authorization.middleware';

import Controller from '@/utils/interfaces/controller.interface';
import catchAsync from '@/utils/errors/catch-async';
import RoleEnum from '@/utils/enums/role.enum';
import response from '@/utils/response';

import dishService from './dish.service'
import validation from './dish.validation';
import Dish from './interfaces/dish.interface';
import handlerFactory from '../shared/handlerFactory';
import dishModel from './dish.model';


class DishController implements Controller {
    public readonly PATH = 'dishes';
    public readonly router = Router();
    private readonly dishService = dishService;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router
            .route('/')
            .get(
                filteringMiddleware,
                selectFieldsMiddleware,
                validationMiddleware(undefined, undefined, validation.query.getDishes),
                this.getDishes
            )
            .post(
                authenticate,
                restrictTo(RoleEnum.MANAGER),
                validationMiddleware(validation.body.createDish),
                this.createDish
            );

        this.router
            .route('/filters')
            .get(
                selectFieldsMiddleware,
                validationMiddleware(undefined, undefined, validation.query.getFilters),
                this.getFiltersValues
            );

        this.router
            .route('/to-review')
            .get(
                authenticate,
                restrictTo(RoleEnum.USER),
                selectFieldsMiddleware,
                validationMiddleware(undefined, undefined, validation.query.toReview),
                this.getDishesToReview
            );

        this.router
            .route('/:id')
            .get(
                selectFieldsMiddleware,
                validationMiddleware(undefined, undefined, validation.query.getDish),
                this.getDish
            )
            .patch(
                authenticate,
                restrictTo(RoleEnum.MANAGER),
                validationMiddleware(validation.body.updateDish),
                updateMiddleware,
                this.updateDish
            )
            .delete(
                authenticate,
                restrictTo(RoleEnum.MANAGER),
                this.deleteDish
            );

        this.router
            .route('/:id/reviews')
            .get(
                filteringMiddleware,
                selectFieldsMiddleware,
                validationMiddleware(undefined, undefined, validation.query.getDishReviews),
                this.getDishReviews
            );
    }

    private getDishes = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const { filters, fields } = req;
        const { page, limit, currency } = req.query;
        const pageNum = +(page || 0) || 1;
        const limitNum = +(limit || 0) || 30;

        const pagination = {
            skip: (pageNum - 1) * limitNum,
            limit: limitNum
        }

        const dishes = await this.dishService.getDishes(
            filters,
            fields,
            pagination,
            currency as string | undefined
        );

        await response.json(res, 200, dishes);
    })

    private createDish = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const dishData: Dish = req.body;
        const dish = await this.dishService.createDish(dishData);

        await response.json(res, 201, dish);
    })

    private getDish = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const id = (req.params.id as unknown) as Schema.Types.ObjectId;
        const fields = req.fields;
        const { currency } = req.query;
        const dish = await this.dishService.getDish(
            id,
            fields,
            currency as string | undefined
        );

        await response.json(res, 200, dish);
    })

    private updateDish = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const id = (req.params.id as unknown) as Schema.Types.ObjectId;
        const updatedDish = await this.dishService.updateDish(id, req.body);

        await response.json(res, 201, updatedDish);
    })

    private deleteDish = handlerFactory.deleteById(dishModel);

    private getDishReviews = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const id = (req.params.id as unknown) as Schema.Types.ObjectId;
        const { filters, fields } = req;
        const { page, limit } = req.query;
        const pageNum = +(page || 0) || 1;
        const limitNum = +(limit || 0) || 30;

        const pagination = {
            skip: (pageNum - 1) * limitNum,
            limit: limitNum
        }

        const reviews = await this.dishService.getDishReviews(id, filters, fields, pagination);

        await response.json(res, 200, reviews);
    })

    private getFiltersValues = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const { fields } = req;
        const { currency } = req.query;

        const filters = await this.dishService.getFiltersValues(fields, currency);

        await response.json(res, 200, filters);
    })

    private getDishesToReview = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const { user } = req;
        const dishes = await this.dishService.getDishesToReview(user);

        await response.json(res, 200, dishes);
    })
}


// Create and export dish controller singleton instance
export default new DishController();
