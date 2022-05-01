import 'dotenv/config';
import 'module-alias/register';
import validateEnv from '@/utils/validation/validateEnv';
import App from './app';

// Controllers
import ConfigController from './resources/config/config.controller';
import CurrencyController from '@/resources/currency/currency.controller';
import DishController from '@/resources/dish/dish.controller';
import ExchangeRateController from "@/resources/exchange-rate/exchange-rate.controller";
import OrderController from '@/resources/order/order.controller';
import ReviewController from '@/resources/review/review.controller';
import UserController from '@/resources/user/user.controller';


validateEnv();

const app = new App(
    [
        new ConfigController(),
        new CurrencyController(),
        new DishController(),
        new ExchangeRateController(),
        new OrderController(),
        new ReviewController(),
        new UserController()
    ],
    Number(process.env.PORT)
);

app.listen();
