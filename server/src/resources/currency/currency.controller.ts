import {Request, Response, Router} from 'express';
import validationMiddleware from "@/middleware/validation.middleware";
import CurrencyService from '@/resources/currency/currency.service';
import Controller from '@/utils/interfaces/controller.interface';
import catchAsync from "@/utils/errors/catch-async";
import response from '@/utils/response';
import validate from "@/resources/currency/currency.validation";


class CurrencyController implements Controller {
    public readonly PATH = 'currencies';
    public readonly router = Router();
    private readonly currencyService = new CurrencyService();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router
            .route('/')
            .get(this.getAllCurrencies);

        this.router
            .route('/:code')
            .get(
                validationMiddleware(undefined, validate.paramsUpdatePersistence),
                this.getCurrency
            );
    }

    private getCurrency = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const code = req.params.code as string;
        const currency = await this.currencyService.getCurrency(code);

        await response.json(res, 200, currency);
    })

    private getAllCurrencies = catchAsync(async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const currencies = await this.currencyService.getAllCurrencies();

        await response.json(res, 200, currencies);
    })
}


export default CurrencyController;
