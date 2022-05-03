import { Request, Response, Router } from "express";
import selectFieldsMiddleware from "@/middleware/requests/select-fields.middleware";
import validationMiddleware from "@/middleware/validation.middleware";
import filteringMiddleware from "@/middleware/requests/filtering.middleware";
import authenticate from '@/middleware/auth/authentication.middleware';
import OrderService from "./order.service";
import Controller from "@/utils/interfaces/controller.interface";
import catchAsync from "@/utils/errors/catch-async";
import AppError from "@/utils/errors/app.error";
import validate from "@/resources/order/order.validation";
import response from "@/utils/response";
import Order from "@/resources/order/order.interface";


class OrderController implements Controller {
    public readonly PATH = 'orders';
    public readonly router = Router();
    private readonly orderService = new OrderService();

    constructor() {
        this.initializeRoutes()
    }

    private initializeRoutes(): void {
        this.router
            .route('/')
            .get(
                filteringMiddleware,
                selectFieldsMiddleware,
                authenticate,
                this.getOrders
            )
            .post(
                authenticate,
                validationMiddleware(validate.createOrder),
                this.createOrder
            );
    }

    private createOrder = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const user = req.user;
        if (!user) throw new AppError(404, 'No user logged in');
        const orderData: Order = req.body
        const result = await this.orderService.createOrder(orderData,user.id);
        response.json(res, 200, result);
    })

    private getOrders = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const user = req.user;
        if (!user) throw new AppError(404, 'No user logged in');

        const { filters, fields } = req;
        const { page, limit } = req.query;
        const pageNum = +(page || 0) || 1;
        const limitNum = +(limit || 0) || 30;

        const pagination = {
            skip: (pageNum - 1) * limitNum,
            limit: limitNum
        }

        const result = await this.orderService.getOrders(user.id, filters, fields, pagination);
        response.json(res, 200, result);
    })
}


export default OrderController;
