import { Request, Response, Router } from 'express';

import selectFieldsMiddleware from '@/middleware/requests/select-fields.middleware';
import validationMiddleware from '@/middleware/validation.middleware';
import filteringMiddleware from '@/middleware/requests/filtering.middleware';
import authenticate from '@/middleware/auth/authentication.middleware';

import Controller from '@/utils/interfaces/controller.interface';
import catchAsync from '@/utils/errors/catch-async';
import response from '@/utils/response';

import orderService from './order.service';
import validate from './order.validation';
import Order from './interfaces/order.interface';


class OrderController implements Controller {
    public readonly PATH = 'orders';
    public readonly router = Router();
    private readonly orderService = orderService;

    constructor() {
        this.initializeRoutes()
    }

    private initializeRoutes(): void {
        this.router
            .route('/')
            .get(
                filteringMiddleware,
                selectFieldsMiddleware,
                validationMiddleware(undefined, undefined, validate.query.getOrders),
                authenticate,
                this.getUserOrders
            )
            .post(
                authenticate,
                validationMiddleware(validate.body.createOrder),
                this.createOrder
            );
    }

    private createOrder = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const user = req.user;
        const orderData: Order = req.body
        const order = await this.orderService.createOrder(user.id, orderData);
        await response.json(res, 200, order);
    })

    private getUserOrders = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const user = req.user;
        const { filters, fields } = req;
        const { page, limit, currency } = req.query;
        const pageNum = +(page || 0) || 1;
        const limitNum = +(limit || 0) || 30;

        const pagination = {
            skip: (pageNum - 1) * limitNum,
            limit: limitNum
        }

        const orders = await this.orderService.getUserOrders(
            user.id,
            filters,
            fields,
            pagination,
            currency as string | undefined
        );
        await response.json(res, 200, orders);
    })
}


// Create and export order controller singleton instance
export default new OrderController();
