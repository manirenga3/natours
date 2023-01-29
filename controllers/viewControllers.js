import { Tour } from '../models/tourModel.js';
import { Booking } from '../models/bookingModel.js';
import { catchAsyncError } from '../utilities/catchAsyncError.js';
import { AppError } from '../utilities/appError.js';

export const alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking') {
    res.locals.alert =
      "Your booking was successful! Please check your email for the confirmation. If your booking doesn't show up here immediately, please come back later.";
  }
  next();
};

export const getOverview = catchAsyncError(async (req, res, next) => {
  // 1) Get tours data from database collection
  const tours = await Tour.find();

  // 2) Build the template
  // 3) Render the template using tours data from step 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

export const getTour = catchAsyncError(async (req, res, next) => {
  const { slug } = req.params;

  // 1) Get tour data for the requested tour (including reviews and guides(guides are alraedy populated using pre find middleware))
  const tour = await Tour.findOne({ slug })
    .populate({
      path: 'reviews',
      fields: 'review rating user',
    })
    .populate({
      path: 'guides',
      fields: 'name photo role',
    });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  // 2) Build the template
  // 3) Render the template using data from step 1
  res.status(200).render('tour', {
    title: `${tour.name}`,
    tour,
  });
});

export const getLoginForm = (req, res) => {
  if (req.user) {
    res.writeHead(302, { Location: `${req.protocol}://${req.get('host')}/` });
    return res.end();
  }
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

export const getSignupForm = (req, res) => {
  if (req.user) {
    res.writeHead(302, { Location: `${req.protocol}://${req.get('host')}/` });
    return res.end();
  }
  res.status(200).render('signup', {
    title: 'Create your account',
  });
};

export const getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

export const getMyTours = catchAsyncError(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  const tourIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', {
    title: 'My tours',
    tours,
  });
});
