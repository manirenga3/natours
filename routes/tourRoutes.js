import * as dotenv from 'dotenv';
import express from 'express';

import * as TourControllers from '../controllers/tourControllers.js';
import * as AuthControllers from '../controllers/authControllers.js';
import { reviewRouter } from './reviewRoutes.js';

// PREOCESS.ENV CONFIGURATION
// Needs to configure this before express app created, so that configuring here...
dotenv.config({ path: './config.env' });

const router = express.Router();

router.use('/:tourId/reviews', reviewRouter);

// ROUTES
router
  .route('/top-5-cheap')
  .get(TourControllers.aliasTopTours, TourControllers.getTours);

router.route('/tour-stats').get(TourControllers.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    AuthControllers.protect,
    AuthControllers.restrictTo('admin', 'lead-guide', 'guide'),
    TourControllers.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/unit/:unit/center/:latlng')
  .get(TourControllers.getToursWithin);

router.route('/distances/unit/:unit/:latlng').get(TourControllers.getDistances);

router
  .route('/')
  .get(TourControllers.getTours)
  .post(
    AuthControllers.protect,
    AuthControllers.restrictTo('admin', 'lead-guide'),
    TourControllers.createTour
  );

router
  .route('/:id')
  .get(TourControllers.getTour)
  .patch(
    AuthControllers.protect,
    AuthControllers.restrictTo('admin', 'lead-guide'),
    TourControllers.uploadTourImages,
    TourControllers.resizeTourImages,
    TourControllers.updateTour
  )
  .delete(
    AuthControllers.protect,
    AuthControllers.restrictTo('admin', 'lead-guide'),
    TourControllers.deleteTour
  );

export { router as tourRouter };
