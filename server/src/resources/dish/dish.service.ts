import { Schema, ClientSession } from 'mongoose';

import { updatePriceFilters } from '@/utils/filters';
import singleTransaction from '@/utils/single-transaction';
import AppError from '@/utils/errors/app.error';
import currency from '@/utils/currency';

import ReviewModel from '@/resources/review/review.model';
import reviewModel from '@/resources/review/review.model';
import Review from '@/resources/review/interfaces/review.interface';
import DishFilters from './interfaces/dish-filters.interface';
import DishModel from './dish.model';
import Dish from './interfaces/dish.interface';
import User from '../user/interfaces/user.interface';
import orderService from '../order/order.service';
import OrderData from '../order/interfaces/order.interface';


class DishService {
    // For names of fields containing string values
    private readonly listFilters: Set<string> = new Set(['name', 'category', 'cuisine', 'type']);
    // For names of fields containing numbers (between some min and max value)
    private readonly minMaxFilters: Set<string> = new Set(['stock', 'mainUnitPrice', 'ratingsAverage', 'ratingsCount']);

    private dish = DishModel;
    private review = ReviewModel;

    public getDishes = singleTransaction(async (
        session: ClientSession,
        filters: { [key: string]: any },
        fields: { [key: string]: number },
        pagination: { skip: number, limit: number },
        targetCurrency?: string
    ): Promise<{ dishes: Partial<Dish>[], matchingCount: number, totalCount: number }> => {
        filters = await updatePriceFilters(filters, targetCurrency, session);

        // Map arrays in filters
        Object.entries(filters).forEach(([key, val]) => {
            if (Array.isArray(val)) {
                filters[key] = { $in: val };
            }
        });
        // Handle pagination
        const { skip, limit } = pagination;
        const pipeline: { [key: string]: any }[] = [{ $match: filters }];

        if (skip !== undefined && limit !== undefined) {
            pipeline.push(
                { $skip: skip },
                { $limit: limit }
            );
        }

        if (Object.keys(fields).length) {
            pipeline.push({ $project: fields });
        }

        const aggregated = await this.dish.aggregate([
            {
                $facet: {
                    // @ts-ignore
                    dishes: pipeline,

                    filteredCount: [
                        { $match: filters },
                        { $count: 'value' }
                    ],

                    totalCount: [
                        { $count: 'value' }
                    ]
                }
            }
        ]).session(session);

        if (!aggregated.length) {
            throw new AppError(500, 'Cannot aggregate dishes');
        }

        const result = aggregated[0];
        if (!result.dishes.length) result.filteredCount = 0;
        else result.filteredCount = result.filteredCount[0].value;
        result.totalCount = result.totalCount[0].value;

        if (skip !== undefined && limit !== undefined) {
            result.pagesCount = Math.ceil(result.filteredCount / limit);
            result.currentPage = Math.ceil(skip / limit) + 1;
        }

        if (targetCurrency) {
            for (const dish of result.dishes) {
                await currency.changeDishCurrency(dish, targetCurrency, undefined, session);
                delete dish.mainUnitPrice;
            }
        }

        return result;
    })

    public async createDish(
        dishData: Dish
    ): Promise<Dish> {
        let { coverIdx } = dishData;
        coverIdx = coverIdx || 0;  // Replace by 0 if the coverIdx was not specified

        delete dishData.coverIdx;
        dishData.coverImage = dishData.images[0];

        return await this.dish.create(dishData);
    }

    public updateDish = singleTransaction(async (
        session: ClientSession,
        id: Schema.Types.ObjectId,
        updatedProps: { [key: string]: number }
    ): Promise<Dish> => {
        const { coverIdx } = updatedProps;
        delete updatedProps['coverIdx'];

        let updatedDish = await this.dish.findByIdAndUpdate(
            id,
            { $set: updatedProps },
            { new: true, session }
        );

        if (updatedDish && !isNaN(coverIdx)) {
            if (coverIdx < 0 || coverIdx >= updatedDish.images.length) {
                throw new AppError(500, 'Invalid cover image index');
            }
            updatedDish = await this.dish.findByIdAndUpdate(
                id,
                { $set: { coverImage: updatedDish.images[coverIdx] } },
                { new: true, session }
            );
        }

        if (!updatedDish) throw new AppError(400, `Cannot update dish with id ${id}`);
        return await updatedDish.save({ session });
    })

    public getDish = singleTransaction(async (
        session: ClientSession,
        id: Schema.Types.ObjectId,
        fields: { [key: string]: number },
        targetCurrency?: string
    ): Promise<Partial<Dish>> => {
        let dish;
        if (fields['reviews']) {
            dish = await this.dish.findById(id, fields, { session }).populate('reviews');
        } else {
            dish = await this.dish.findById(id, fields, { session });
        }

        if (dish) {
            if (targetCurrency) {
                await currency.changeDishCurrency(dish, targetCurrency, undefined, session);
            }
            return dish;
        }


        throw new AppError(404, `Cannot get dish with id ${id}`);
    })

    public async getDishReviews(
        id: Schema.Types.ObjectId,
        filters: { [key: string]: any },
        fields: { [key: string]: number },
        pagination: { skip: number, limit: number }
    ): Promise<Partial<Review>[]> {
        return this.review.find(
            { dish: id, ...filters },
            fields,
            pagination
        );
    }

    public getFiltersValues = singleTransaction(async (
        session: ClientSession,
        fields: { [key: string]: number },
        targetCurrency?: string
    ): Promise<Partial<DishFilters> | void> => {
        const fieldsList = this.getUpdatedFiltersFields(fields, targetCurrency);

        // Create the aggregation pipeline
        const facet: { [key: string]: any[] } = {};

        // Create aggregation facet
        fieldsList.forEach(filter => {
            if (this.listFilters.has(filter)) {
                facet[filter] = [this.getUniqueListFilter(filter)];
            } else if (this.minMaxFilters.has(filter)) {
                facet[filter] = [this.getMinMaxFilter(filter)];
            } else {
                throw new AppError(400, `${filter} is not a valid dish filter`);
            }
        });

        // Aggregate selected fields
        const aggregated = await this.dish.aggregate([
            { $facet: facet }
        ]).session(session);

        if (!aggregated.length) {
            throw new AppError(400, 'Cannot aggregate dish filters');
        }

        // Create the object with cleaner structure
        const result: { [key: string]: any } = {};
        Object.entries(aggregated[0]).forEach(([key, value]: any) => {
            value = value[0];

            result[key] = this.listFilters.has(key) ? value.uniqueValues : {
                min: value.min,
                max: value.max
            };
        });

        // Convert the mainUnitPrice to the unitPrice
        const { mainUnitPrice } = result;

        if (targetCurrency) {
            delete result.mainUnitPrice;
            result.unitPrice = {
                min: await currency.exchangeFromMainCurrency(mainUnitPrice.min, targetCurrency, session),
                max: await currency.exchangeFromMainCurrency(mainUnitPrice.max, targetCurrency, session)
            }
        }

        return result;
    })

    public async getDishesToReview(
        user: User
    ): Promise<{ dish: string, order: string }[]> {
        const reviewDays = 7;

        // Get orders from the valid term to write a review
        const orders = await orderService.getUserOrders(
            user.id,
            { 'createdAt[gt]': new Date(new Date().getTime() - (reviewDays * 24 * 60 * 60 * 1000)) },
            { items: 1 },
            {},
            {}
        );

        // Get reviews from the valid term to write a review
        const reviews = await reviewModel.find(
            {
                user: user.id, 
                'createdAt[gt]': new Date(new Date().getTime() - (reviewDays * 24 * 60 * 60 * 1000)) 
            },
            { _id: 1 }
        );

        // @ts-ignore
        const reviewedDishesIdSet: Set<string> = new Set(reviews.map(review => review.dish._id.toString()));
        const toReviewIdSet: Set<string> = new Set(); 
        const result: { dish: string, order: string }[] = [];

        orders.forEach((order: OrderData) => {
            order.items.forEach(({ dish: dishId }) => {
                const idString = dishId.toString();
                if (!reviewedDishesIdSet.has(idString) && !toReviewIdSet.has(idString)) {
                    toReviewIdSet.add(idString);
                    result.push({
                        dish: idString,
                        order: order._id.toString()
                    });
                }
            })
        })

        return result;
    }

    private getUpdatedFiltersFields(
        fields: { [key: string]: number },
        currency?: string
    ): string[] {
        const fieldsTypes = new Set(Object.values(fields));

        // Check if there are mixed select types (include with exclude)
        if (fieldsTypes.size !== 1) {
            throw new AppError(400, 'Wrong fields were selected. Cannot mix included with excluded fields');
        }

        const updatedFields: { [key: string]: number } = {};
        // Include specified fields in filters
        if (fieldsTypes.has(1)) {
            Object.assign(updatedFields, fields);
            
            if (updatedFields.unitPrice) {
                if (!currency) throw new AppError(400, 'Cannot get unitPrice filter when currency is not specified'); 
            } else if (currency) {
                throw new AppError(400, 'Currency is redundant when unitPrice field is not included');
            }
        // Exclude specified fields from filters
        } else {
            Object.assign(updatedFields, Object.fromEntries(
                Array.from(this.listFilters).map(filter => [filter, 1]))
            );
            Object.assign(updatedFields, Object.fromEntries(
                Array.from(this.minMaxFilters).map(filter => [filter, 1]))
            );
            Object.keys(fields).forEach(field => delete updatedFields[field]);
        }

        if (updatedFields.unitPrice) {
            delete updatedFields.unitPrice;
            updatedFields.mainUnitPrice = 1;
        }

        return Object.keys(updatedFields);
    }

    private getUniqueListFilter(field: string) {
        return { $group: { _id: null, uniqueValues: { $addToSet: `$${field}` } } };
    }

    private getMinMaxFilter(field: string) {
        return { $group: { _id: null, min: { $min: `$${field}` }, max: { $max: `$${field}` } } };
    }
}


// Create and export dish service singleton instance
export default new DishService();
