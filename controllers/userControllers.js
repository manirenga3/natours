import multer from 'multer';
import sharp from 'sharp';

import { User, ReactivatedUser } from '../models/userModel.js';
import { DeactivatedUser } from '../models/deactivatedUserModel.js';
import { catchAsyncError } from '../utilities/catchAsyncError.js';
import { AppError } from '../utilities/appError.js';
import * as AuthControllers from './authControllers.js';
import * as Factory from './handlerFactory.js';

// ---------------------------------------------- HELPER FUNCTIIONS ----------------------------------------------------------------
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const getUserAndAuthenticate = async (req, res, next) => {
  const { password } = req.body;

  // 1) Check if there is password
  if (!password) {
    return next(new AppError('Please provide your password to proceed', 400));
  }

  // 2) Getting user data and checking the password
  const user = await User.findById(req.user.id).select(
    '+password +_id +isMailVerified'
  );
  if (!(await user.comparePassword(password, user.password))) {
    return next(new AppError('Please provide the correct password', 401));
  }

  // 3) If everything 0k, there are 2 cases
  // 3A) For permanently delete, just delete the user here from database and that's it...
  // 3B) For deactivate, delete the user from users collection here and move him to deactivatedUsers collection after this function call, so that user account will be deleted permanently from deactivatedUsers collection if user not logged in before 30 days.
  await User.deleteOne(user);

  return user;
};

// Middleware
export const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Multer middleware (for uploading images)
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

export const uploadUserPhoto = upload.single('photo');

export const resizeUserPhoto = catchAsyncError(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500, { fit: 'inside' })
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

// ----------------------------------- ROUTE HANDLERS FOT USERS -----------------------------------------------------------------------
// --------------------------------------- Update User Data --------------------------------------------
export const updateMe = catchAsyncError(async (req, res, next) => {
  // 1) Create error if user sends password data
  if (req.body.password || req.body.passswordConfirm) {
    return next(
      new AppError(
        `This route is not for password updates. Please use this route '/updateMyPassword'`,
        400
      )
    );
  }

  // 2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name');
  if (req.file) {
    filteredBody.photo = req.file.filename;
  }

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Details updated successfully',
    data: {
      user: updatedUser,
    },
  });
});

// --------------------------------------- Delete User Data --------------------------------------------
export const permanentlyDeleteMe = catchAsyncError(async (req, res, next) => {
  // 1) Using a helper function here for getting user and authenticate him to perform this action
  await getUserAndAuthenticate(req, res, next);

  // 2) If done, send success response back
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// --------------------------------------- Deactivate User --------------------------------------------
export const deactivateMe = catchAsyncError(async (req, res, next) => {
  // 1) Using a helper function here for getting user and authenticate him to perform this action
  const user = await getUserAndAuthenticate(req, res, next);

  // 2) Moving the user to deactivatedUsers collection
  await DeactivatedUser.insertMany(user);

  // 2) If done, send success response back
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// --------------------------------------- Reactivate User --------------------------------------------
export const reactivateMe = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Check if user exists and password is correct
  const deactivatedUser = await DeactivatedUser.findOne({ email }).select(
    '+password'
  );
  if (
    !deactivatedUser ||
    !(await deactivatedUser.comparePassword(password, deactivatedUser.password))
  ) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Remove the user from deactivatedUsers collection and then add him to the users collection again
  await DeactivatedUser.deleteOne(deactivatedUser);
  await ReactivatedUser.insertMany(deactivatedUser);

  // If everything ok, log the user in and send jwt
  AuthControllers.createAndSendToken(deactivatedUser, 200, req, res);
});

// ----------------------------------- ROUTE HANDLERS FOT ADMIN -----------------------------------------------------------------------
// --------------------------------------- Get All Users --------------------------------------------
export const getAllUsers = Factory.getAll(User);

export const getUser = Factory.getOne(User);

export const updateUser = Factory.updateOne(User);

export const deleteUser = Factory.deleteOne(User);
