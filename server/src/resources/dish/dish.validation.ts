import Joi from '@/utils/validation/mongoose.validation';

import { currencyValidators } from '@/resources/currency/currency.validation';
import sharedValidation from '@/resources/shared/shared.validation';


const imageValidators = {
    breakpoints: Joi.array().items(
        Joi.number().min(0).required().messages({
            'any.required': 'Please provide dish image breakpoint',
            'number.min': 'Dish image breakpoint should not be lower than 0'
        })
    ).required().messages({
        'any.required': 'Please provide dish images breakpoints'
    }),

    paths: Joi.array().items(
        Joi.string().trim().required().messages({
            'any.required': 'Please provide dish image path',
            'string.trim': 'Dish image path must have no spaces at the beginning ans ath the end'
        })
    ).required().messages({
        'any.required': 'Please provide dish images paths'
    })
}


export const dishBodyValidators = {
    name: Joi.string().trim().min(2).max(40).required().messages({
        'any.required': 'Please provide a dish name',
        'string.trim': 'Dish name should have no spaces at the beginning and at the end',
        'string.min': 'Dish name should contain at least 2 characters',
        'string.max': 'Dish name shouldn\'t be longer than 40 characters'
    }),

    category: Joi.string().trim().lowercase().min(2).max(25).required().messages({
        'any.required': 'Please provide a dish category',
        'string.trim': 'Dish category should have no spaces at the beginning and at the end',
        'string.lowercase': 'Dish category should be lowercase',
        'string.min': 'Dish category should contain at least 2 characters',
        'string.max': 'Dish category should contain at most 25 characters'
    }),

    cuisine: Joi.string().trim().lowercase().min(2).max(15).messages({
        'string.trim': 'Dish cuisine should have no spaces at the beginning and at the end',
        'string.lowercase': 'Dish cuisine should be lowercase',
        'string.min': 'Dish cuisine should contain at least 2 characters',
        'string.max': 'Dish cuisine should contain at most 15 characters'
    }),

    type: Joi.string().trim().lowercase().min(2).max(15).messages({
        'string.trim': 'Dish type should have no spaces at the beginning and at the end',
        'string.lowercase': 'Dish type should be lowercase',
        'string.min': 'Dish type should contain at least 2 characters',
        'string.max': 'Dish type should contain at most 15 characters'
    }),

    ingredients: Joi.array().items(
        Joi.string().min(1).messages({
            'string.min': 'Dish ingredient should be not empty string'
        })
    ).required().messages({
        'any.required': 'Please provide dish ingredients'
    }),

    stock: Joi.number().integer().min(0).messages({
        'number.integer': 'Dish stock must be an integer number',
        'number.min': 'Dish stock should not be lower than 0'
    }),

    currency: Joi.string().uppercase().length(3).required().messages({
        'any.required': 'Please provide a dish price currency',
        'string.uppercase': 'Currency must be an uppercase 3-letter currency code',
        'string.length': 'Currency code must have exactly 3 letters'
    }),

    unitPrice: Joi.number().min(0).required().messages({
        'any.required': 'Please provide a dish unit price',
        'number.min': 'Dish price should be not lower than 0'
    }),

    ratingsAverage: Joi.number().min(0).max(5).messages({
        'number.min': 'Dish ratings average should be not lower than 0',
        'number.max': 'Dish ratings average should be not greater than 5'
    }),

    ratingsCount: Joi.number().min(0).messages({
        'number.min': 'Number of dish reviews cannot be lower than 0'
    }),

    description: Joi.array().items(Joi.string()).required().messages({
        'any.required': 'Please provide dish description'
    }),

    coverIdx: Joi.number().integer().min(0).messages({
        'number.integer': 'Cover index must be an integer',
        'number.min': 'Cover index cannot be lower than 0'
    }),

    images: Joi.array().items(Joi.object(imageValidators))
};


const body = {
    createDish: Joi.object(dishBodyValidators),

    updateDish: Joi.object({
        name: dishBodyValidators.name.optional(),
        category: dishBodyValidators.category.optional(),
        cuisine: dishBodyValidators.cuisine.optional(),
        type: dishBodyValidators.type.optional(),
        ingredients: dishBodyValidators.ingredients.optional(),
        stock: dishBodyValidators.stock.optional(),
        currency: dishBodyValidators.currency.optional(),
        unitPrice: dishBodyValidators.unitPrice.optional(),
        description: dishBodyValidators.description.optional(),
        coverIdx: dishBodyValidators.coverIdx,
        images: Joi.object().pattern(Joi.string(), Joi.object({
            breakpoints: Joi.object().pattern(
                // Breakpoint index
                Joi.number().integer().min(0),
                // Breakpoint value
                Joi.number().min(0)
            ),

            paths: Joi.object().pattern(
                // Path index
                Joi.number().integer().min(0),
                // Path string
                Joi.string().trim()
            )
        }))
    })
};

const query = {
    getDish: Joi.object({
        currency: dishBodyValidators.currency.optional(),
        fields: sharedValidation.fields
    }),

    getDishes: Joi.object({
        currency: dishBodyValidators.currency.optional(),
        category: Joi.string(),
        cuisine: Joi.string(),
        stock: dishBodyValidators.stock.optional(),
        fields: sharedValidation.fields,
        unitPrice: sharedValidation.comparison.number,
        ratingsAverage: sharedValidation.comparison.number,
        ...sharedValidation.pagination
    }),

    getFilters: Joi.object({
        fields: Joi.string().required().messages({
            'any.required': 'Please provide fields to filter'
        }),
        currency: currencyValidators.code
    }),

    toReview: Joi.object({
        fields: sharedValidation.fields
    }),

    getDishReviews: Joi.object({
        dishName: Joi.string(),  // Allow multiple values separated by comma
        rating: sharedValidation.comparison.number,
        fields: sharedValidation.fields,
        ...sharedValidation.pagination
    })
};


export default {
    body,
    query
};
