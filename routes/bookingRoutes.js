import express from 'express';

import * as BookingControllers from '../controllers/bookingControllers.js';
import * as AuthControllers from '../controllers/authControllers.js';

const router = express.Router();

// ROUTES
router.use(AuthControllers.protect);

router.get('/checkout-session/:tourId', BookingControllers.getCheckoutSession);

router.use(AuthControllers.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(BookingControllers.getAllBookings)
  .post(BookingControllers.createBooking);

router
  .route('/:id')
  .get(BookingControllers.getBooking)
  .patch(BookingControllers.updateBooking)
  .delete(BookingControllers.deleteBooking);

export { router as bookingRouter };
