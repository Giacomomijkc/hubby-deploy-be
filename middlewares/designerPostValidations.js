const {body, validationResult} = require('express-validator');

const designersBodyParams = [
    body('name')
        .notEmpty()
        .isString()
        .isLength({min: 3})
        .withMessage('Name is required, must be a string and greater than 8 characters'),
    
    body('surname')
        .notEmpty()
        .isString()
        .isLength({min: 3})
        .withMessage('Surname is required, must be a string and greater than 3 characters'),
    
    body('nickname')
        .notEmpty()
        .isString()
        .isLength({min: 3})
        .withMessage('Nickname is required, must be a string and greater than 3 characters'),

    body('description')
        .notEmpty()
        .isString()
        .isLength({min: 3})
        .withMessage('Description is required, must be a string and greater than 3 characters'),
    
    body('tags')
        .notEmpty()
        .withMessage('tags are required'),

    body('website')
        .optional(),
    
    body('instagram')
        .optional(),

    body('avatar')
        .notEmpty()
        .isString()
        .isURL()
        .withMessage('Avatar is required and must be and URL'),

    body('address')
        .notEmpty()
        .isString()
        .withMessage('Address is required'),

    body('vatOrCf')
        .notEmpty()
        .isString()
        .withMessage('Vat or Fiscal Code is required'),
    
    body('email')
        .notEmpty()
        .isString()
        .withMessage('email is required'),
    
    body('password')
        .notEmpty()
        .isString()
        .withMessage('password is required'),
];

    
const validatePostDesigner = (req, res, next) => {
        console.log('Request body:', req.body);
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }
    
        next()
    
}

module.exports = {designersBodyParams, validatePostDesigner};