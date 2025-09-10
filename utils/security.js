const { body, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const winston = require('winston');
const crypto = require('crypto');

// Configurar DOMPurify con JSDOM para el servidor
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Configurar Winston para logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.File({ filename: 'security.log', level: 'warn' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Validadores para templates
const templateValidators = {
  create: [
    // Aceptar name o title; normalizar ambos
    body('name')
      .customSanitizer((value, { req }) => {
        const v = typeof value === 'string' ? value : '';
        const t = typeof req.body.title === 'string' ? req.body.title : '';
        const normalized = (v || t).trim();
        // Propagar alias al otro campo para el backend
        if (!req.body.title && normalized) req.body.title = normalized;
        return normalized;
      })
      .trim()
      .notEmpty().withMessage('El nombre es requerido')
      .isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres'),
    // Asunto opcional; si falta, el backend usa el nombre/título
    body('email_subject')
      .optional()
      .trim()
      .isLength({ min: 0, max: 200 }).withMessage('El asunto debe tener hasta 200 caracteres'),
    // HTML requerido + sanitización
    body('html')
      .notEmpty().withMessage('El contenido HTML es requerido')
      .customSanitizer(value => DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'a', 
                      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'center', 'tr', 'td', 'th', 
                      'div', 'span', 'img', 'blockquote', 'pre', 'code', 'hr', 'button', 'label', 
                      'input', 'select', 'option', 'textarea', 'form'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'style', 'target', 'rel', 
                       'width', 'height', 'colspan', 'rowspan', 'type', 'name', 'value',
                       'placeholder', 'required', 'disabled', 'readonly', 'checked',
                       'align', 'valign', 'bgcolor', 'cellpadding', 'cellspacing', 'border']
      })),
    // category_id como string opcional con coerción
    body('category_id')
      .optional()
      .customSanitizer((value) => {
        if (value === undefined || value === null || value === '') return '';
        return String(value).trim();
      })
      .custom((value) => {
        if (value === '') return true; // se interpretará como null en el backend
        return typeof value === 'string' && value.length > 0;
      }).withMessage('ID de categoría debe ser una cadena válida'),
    body('tags')
      .optional()
      .isArray().withMessage('Tags debe ser un array')
      .custom((value) => value.every(tag => typeof tag === 'string' && tag.length <= 50))
      .withMessage('Tags inválidos')
  ],
  update: [
    // Normalizar alias hacia title para compatibilidad
    body('title')
      .optional()
      .customSanitizer((value, { req }) => {
        const t = typeof value === 'string' ? value.trim() : '';
        const n = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const normalized = t || n;
        if (normalized) {
          req.body.title = normalized;
        }
        return normalized;
      }),
    // Validación opcional del nombre si se envía bajo 'name'
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede estar vacío')
      .isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres'),
    body('email_subject')
      .optional()
      .trim()
      .isLength({ min: 0, max: 200 }).withMessage('El asunto debe tener hasta 200 caracteres'),
    body('html')
      .optional()
      .notEmpty().withMessage('El contenido HTML no puede estar vacío')
      .customSanitizer(value => DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'a', 
                      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'center', 'tr', 'td', 'th', 
                      'div', 'span', 'img', 'blockquote', 'pre', 'code', 'hr', 'button', 'label', 
                      'input', 'select', 'option', 'textarea', 'form'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'style', 'target', 'rel', 
                       'width', 'height', 'colspan', 'rowspan', 'type', 'name', 'value',
                       'placeholder', 'required', 'disabled', 'readonly', 'checked',
                       'align', 'valign', 'bgcolor', 'cellpadding', 'cellspacing', 'border']
      })),
    body('category_id')
      .optional()
      .customSanitizer((value) => {
        if (value === undefined || value === null || value === '') return '';
        return String(value).trim();
      })
      .custom((value) => {
        if (value === '') return true;
        return typeof value === 'string' && value.length > 0;
      }).withMessage('ID de categoría debe ser una cadena válida'),
    body('tags')
      .optional()
      .isArray().withMessage('Tags debe ser un array')
      .custom((value) => value.every(tag => typeof tag === 'string' && tag.length <= 50))
      .withMessage('Tags inválidos')
  ]
};

// Validadores para usuarios
const userValidators = {
  register: [
    body('username')
      .trim()
      .notEmpty().withMessage('El nombre de usuario es requerido')
      .isLength({ min: 3, max: 30 }).withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos')
      .escape(),
    body('password')
      .notEmpty().withMessage('La contraseña es requerida')
      .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número')
  ],
  login: [
    body('username')
      .trim()
      .notEmpty().withMessage('El nombre de usuario es requerido')
      .escape(),
    body('password')
      .notEmpty().withMessage('La contraseña es requerida')
  ]
};

// Validadores para categorías
const categoryValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre es requerido')
      .isLength({ min: 1, max: 50 }).withMessage('El nombre debe tener entre 1 y 50 caracteres')
      .escape(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('La descripción no puede exceder 200 caracteres')
      .escape()
  ],
  update: [
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede estar vacío')
      .isLength({ min: 1, max: 50 }).withMessage('El nombre debe tener entre 1 y 50 caracteres')
      .escape(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('La descripción no puede exceder 200 caracteres')
      .escape()
  ]
};

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation error', {
      errors: errors.array(),
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Función para generar tokens seguros
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Función para sanitizar HTML
const sanitizeHTML = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'a', 
                  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'center', 'tr', 'td', 'th', 
                  'div', 'span', 'img', 'blockquote', 'pre', 'code', 'hr', 'button', 'label', 
                  'input', 'select', 'option', 'textarea', 'form'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'style', 'target', 'rel', 
                   'width', 'height', 'colspan', 'rowspan', 'type', 'name', 'value',
                   'placeholder', 'required', 'disabled', 'readonly', 'checked',
                   'align', 'valign', 'bgcolor', 'cellpadding', 'cellspacing', 'border']
  });
};

module.exports = {
  templateValidators,
  userValidators,
  categoryValidators,
  handleValidationErrors,
  generateSecureToken,
  sanitizeHTML,
  logger
};
