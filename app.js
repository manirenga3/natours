import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import morgan from 'morgan';
import compression from 'compression';

import { tourRouter } from './routes/tourRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { reviewRouter } from './routes/reviewRoutes.js';
import { viewRouter } from './routes/viewRoutes.js';
import { bookingRouter } from './routes/bookingRoutes.js';
import { AppError } from './utilities/appError.js';
import { globalErrorHandler } from './controllers/errorControllers.js';
import * as BookingControllers from './controllers/bookingControllers.js';
import dotenv from 'dotenv';

// PREOCESS.ENV CONFIGURATION
// Needs to configure this before express app created, so that was configured in tourRoutes.js because tourRoutes.js was imported and executed first before this file gets executed...


// To access filename and dirname
const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

// EXPRESS APP
export const app = express();

// To enable and trust proxy
app.enable('trust proxy');

// To set Pug templating engine
app.set('view engine', 'pug');
app.set('views', path.join(dirName, 'views'));

// GLOBAL MIDDLEWARES
// To implement CORS
app.use(cors());

// To respond to options preflight by browser for non-simple requests
app.options('*', cors());

// For serving static files
app.use(express.static(path.join(dirName, 'public')));

// For security http headers
app.use(helmet());

// For limiting requests from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP! Please try again after 30 minutes',
});
app.use('/api', limiter);

// For Stripe
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  BookingControllers.webhookCheckout
);

// For develeopment env logging
app.use(morgan('dev'));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// For reading data into req.body from req and for also to set payload limit to 10kb
app.use(express.json({ limit: '10kb' }));

// For reading cookies into req.cookies
app.use(cookieParser());

// For data sanitization against NoSQL query injection
app.use(mongoSanitize());

// For data sanitization against XSS (Cross Site Attack)
app.use(xss());

// To prevent HTTP parameter pollution
app.use(
  hpp({
    whitelist: [
      'price',
      'duration',
      'difficulty',
      'maxGroupSize',
      'ratingsAverage',
      'ratingsQuantity',
      'role',
    ],
  })
);

// For compressing responses
app.use(compression());

// Own middlewares
app.use((req, res, next) => {
  // console.log('Hello from the middleware');
  next();
});
app.use((req, res, next) => {
  req.requestedTime = new Date().toLocaleString();
  // console.log(req.requestedTime);

  next();
});

// ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next(
      new AppError(`Can't find ${req.originalUrl} on this server`, 404)
    );
  }
  return next(new AppError(`Page not found...`, 404));
});

// GLOBAL ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);
