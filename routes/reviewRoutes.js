import express from 'express';

import * as ReviewControllers from './../controllers/reviewControllers.js';
import * as AuthControllers from './../controllers/authControllers.js';

const router = express.Router({ mergeParams: true });

router.use(AuthControllers.protect);

router
  .route('/')
  .post(
    AuthControllers.restrictTo('user'),
    ReviewControllers.setTourAndUserIds,
    ReviewControllers.createReview
  )
  .get(ReviewControllers.getAllReviews);

router
  .route('/:id')
  .get(ReviewControllers.getReview)
  .patch(
    AuthControllers.restrictTo('admin', 'user'),
    ReviewControllers.updateReview
  )
  .delete(
    AuthControllers.restrictTo('admin', 'user'),
    ReviewControllers.deleteReview
  );

export { router as reviewRouter };
