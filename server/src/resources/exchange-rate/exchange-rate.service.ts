import { ClientSession } from 'mongoose';
import ExchangeRateModel from '@/resources/exchange-rate/exchange-rate.model';
import singleTransaction from '@/utils/single-transaction';
import ExchangeRate from '@/resources/exchange-rate/exchange-rate.interface';
import AppError from '@/utils/errors/app.error';


class ExchangeRateService {
    private exchangeRate = ExchangeRateModel

    public async getExchangeRate(
        from: string,
        to: string,
        session?: ClientSession
    ): Promise<ExchangeRate> {
        const exchangeRate = await this.exchangeRate.findOne({ from, to }, {}, { session });
        if (exchangeRate) return exchangeRate;

        throw new AppError(500, `Cannot find Exchange Rate from ${from} to ${to}`);
    }

    public createExchangeRate = singleTransaction(async (
        session: ClientSession,
        exchangeRateData: ExchangeRate
    ): Promise<ExchangeRate[]> => {
        exchangeRateData.rate = this.ceilDecimalDigits(exchangeRateData.rate);

        const inverseExchangeRateData = {
            from: exchangeRateData.to,
            to: exchangeRateData.from,
            rate: this.ceilDecimalDigits(1 / exchangeRateData.rate)
        }

        return await this.exchangeRate.create([
            exchangeRateData,
            inverseExchangeRateData
        ], { session });
    })

    public updateExchangeRate = singleTransaction(async (
        session: ClientSession,
        from: string,
        to: string,
        rate: number
    ): Promise<ExchangeRate[]> => {
        return [
            await this.updateExchangeRateHelper(from, to, rate, session),
            await this.updateExchangeRateHelper(to, from, 1 / rate, session)
        ];
    })

    public deleteExchangeRate = singleTransaction(async (
        session: ClientSession,
        from: string,
        to: string
    ): Promise<void> => {
        if (from === to) {
            throw new AppError(400, 'Both specified currencies must be different');
        }

        if (![
            await this.exchangeRate.deleteOne({ from, to }, { session }),
            await this.exchangeRate.deleteOne({ from: to, to: from }, { session })
        ].every(res => res !== null)) {
            throw new AppError(404, `Cannot delete exchange rate from ${from} to ${to}`);
        }
    })

    private ceilDecimalDigits(
        num: number, 
        digitsCount: number = 4
    ): number {
        const pow = Math.pow(10, digitsCount);
        return Math.ceil(num * pow) / pow;
    }

    private async updateExchangeRateHelper(
        from: string,
        to: string,
        rate: number,
        session?: ClientSession
    ): Promise<ExchangeRate> {
        const exchangeRate = await this.exchangeRate.findOneAndUpdate(
            { from, to },
            { $set: { rate: this.ceilDecimalDigits(rate) } },
            session ? { new: true, session } : { new: true }
        );

        if (exchangeRate) return exchangeRate;
        
        throw new AppError(404, `Cannot find exchange rate from ${from} to ${to}`);
    }
}


export default ExchangeRateService;
