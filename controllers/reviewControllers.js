import { Review } from '../models/reviewModel.js';
import * as Factory from './handlerFactory.js';

export const setTourAndUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

export const getAllReviews = Factory.getAll(Review);

export const getReview = Factory.getOne(Review);

export const createReview = Factory.createOne(Review);

export const updateReview = Factory.updateOne(Review);

export const deleteReview = Factory.deleteOne(Review);
