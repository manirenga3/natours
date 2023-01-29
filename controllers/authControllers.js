import { promisify } from 'util';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { User } from '../models/userModel.js';
import { catchAsyncError } from './../utilities/catchAsyncError.js';
import { AppError } from '../utilities/appError.js';
import { Email } from './../utilities/emailHandler.js';

// ---------------------------------------------- HELPER FUNCTIIONS ----------------------------------------------------------------
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const verifyToken = async (token) => {
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  return decoded;
};

export const createAndSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const exp = Number(process.env.JWT_COOKIE_EXPIRES_IN);
  const cookieOptions = {
    maxAge: exp * 60 * 60 * 1000,
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    message: 'You are logged in now',
    data: {
      user: { name: user.name, email: user.email, role: user.role },
    },
  });
};

const createConfirmMailURL = (req, id) => {
  // 1) Create token
  const token = signToken(id);

  // 2) Create confirm mail url and send it to user email
  // let confirmURL = '';
  // if (req.originalUrl.startsWith('/api')) {
  //   confirmURL = `${req.protocol}://${req.get(
  //     'host'
  //   )}/api/v1/users/signUp/confirm_account?confirmation_token=${token}`;
  // } else {
  //   confirmURL = `${req.protocol}://${req.get(
  //     'host'
  //   )}/signUp/confirm_account?confirmation_token=${token}`;
  // }
  // FOR SSR
  const confirmURL = `${req.protocol}://${req.get(
    'host'
  )}/signUp/confirm_account?confirmation_token=${token}`;

  return confirmURL;
};

const sendEmail = async function (
  req,
  res,
  next,
  user,
  url,
  action,
  resMessage,
  statusCode
) {
  try {
    const email = new Email(user, url);
    switch (action) {
      case 'confirm':
        email.sendConfirmMail();
        break;
      case 'welcome':
        email.sendWelcome();
        break;
      case 'reset':
        email.sendPasswordReset();
        break;
    }

    // FOR API
    if (req.originalUrl.startsWith('/api')) {
      return res.status(statusCode).json({
        status: 'success',
        message: resMessage,
      });
    }
    return res.status(statusCode).render('emailVerified', {
      title: 'Email verified',
    });
  } catch (err) {
    if (user.passwordResetToken && user.passwordResetExpires) {
      user.passwordResetToken = user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }
    return next(
      new AppError(
        'There was an error sending the email! Please try again later',
        500
      )
    );
  }
};

// ----------------------------------- ROUTE HANDLERS -----------------------------------------------------------------------------------
// --------------------------------------- SignUp --------------------------------------------
export const signUp = catchAsyncError(async (req, res, next) => {
  // 1) Creating new user data
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // 2) Generate the url using jwt
  const confirmURL = createConfirmMailURL(req, newUser._id);
  const resMessage =
    'Confirmation email sent successfully! Verify your account using the email sent to you';

  await sendEmail(
    req,
    res,
    next,
    newUser,
    confirmURL,
    'confirm',
    resMessage,
    200
  );
});

// ----------------------------------- SignUp Confirm --------------------------------------------
export const signupConfirm = catchAsyncError(async (req, res, next) => {
  const token = req.query.confirmation_token;

  // 1) Token verification
  const decoded = await verifyToken(token);

  // 2) Check if user exists
  const user = await User.findById(decoded.id).select('+isMailVerified');
  if (!user) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exists',
        401
      )
    );
  }

  // 3) Validate the email
  if (user.isMailVerified) {
    return next(
      new AppError(
        'Email has already been validated! Please log in with your email and password',
        400
      )
    );
  }
  user.isMailVerified = true;
  await user.save({ validateBeforeSave: false });

  // 4) If everything ok, send welcome email
  const welcomeURL = `${req.protocol}://${req.get('host')}/login`;
  const resMessage =
    'Your email is verified! Please log in with your email and password';
  await sendEmail(req, res, next, user, welcomeURL, 'welcome', resMessage, 201);
});

// ----------------------------------- Login --------------------------------------------
export const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide the email and password.', 400));
  }

  // Check if user exists and password is correct
  const user = await User.findOne({ email }).select(
    '+password +isMailVerified'
  );
  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  // Check if user email is validated or not
  if (!user.isMailVerified) {
    // Generate the url using jwt
    const confirmURL = createConfirmMailURL(req, user._id);
    const resMessage =
      'Your email is not verified! Verify using the link sent to your email';

    return await sendEmail(
      req,
      res,
      next,
      user,
      confirmURL,
      'confirm',
      resMessage,
      401
    );
  }

  // If everything ok, log the user in and send jwt
  createAndSendToken(user, 200, req, res);
});

// ----------------------------------- Logout --------------------------------------------
export const logout = (req, res) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

// ----------------------------------- Forgot Password --------------------------------------------
export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  // Check if email exists
  if (!email) {
    return next(new AppError('Please provide email', 400));
  }

  // 2) Get user based on requested email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with that email', 404));
  }

  // 3) Generate random reset token
  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 4) Create reset url and Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword?reset_token=${resetToken}`;
  const resMessage =
    'Email sent successfully! Reset your password using the email sent to you';

  await sendEmail(req, res, next, user, resetURL, 'reset', resMessage, 200);
});

// ----------------------------------- Reset Password --------------------------------------------
export const resetPassword = catchAsyncError(async (req, res, next) => {
  const token = req.query.reset_token;

  // 1) Get user based on the token and also validate the token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // 2) If token is not expired and if user is there, set the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update the changedPasswordAt property for the user (This was done using pre save document middleware)
  // 4) Send successful response
  res.status(200).json({
    status: 'success',
    message:
      'Password reset was successful! Please log in with your mail and password',
  });
});

// ----------------------------------- Route Protection ------------------------------------------
export const protect = catchAsyncError(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401)
    );
  }

  // 2) Token verification
  const decoded = await verifyToken(token);

  // 3) Check if user exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exists',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (await currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User changed password recently! Please log in again', 401)
    );
  }

  // 5) If everything ok, GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Middleware to check if user logged in... This for SSR (for rendered pages)
export const isLoggedIn = async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.cookies && req.cookies.jwt) {
    try {
      token = req.cookies.jwt;

      if (!token) {
        return next();
      }

      // 2) Token verification
      const decoded = await verifyToken(token);

      // 3) Check if user exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 4) Check if user changed password after the token was issued
      if (await currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // 5) If everything ok, THERE IS A LOGGED IN USER
      req.user = currentUser;
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// ----------------------------------- Update Password --------------------------------------------
export const updatePassword = catchAsyncError(async (req, res, next) => {
  // 1) Check if passwords are provided
  if (
    !req.body.passwordCurrent ||
    !req.body.passwordNew ||
    !req.body.passwordNewConfirm
  ) {
    return next(
      new AppError(
        'Please provide old and new passwords and confirm the new password',
        400
      )
    );
  }

  // 2) Get user from the collection
  const user = await User.findById(req.user._id).select('+password');

  // 3) Check if current password is correct
  if (!(await user.comparePassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 400));
  }

  // 4) If everything ok, update the password
  user.password = req.body.passwordNew;
  user.passwordConfirm = req.body.passwordNewConfirm;
  await user.save();
  // User.findByIdAndUpdate() -> This will not work as intended (ie, password won't be hashed and passwordChangedAt won't be updated)

  // 5) Update the changedPasswordAt property for the user (This was done using pre save document middleware)
  // 6) Log the user in and send jwt
  createAndSendToken(user, 200, req, res);
});

// ----------------------------------- Authorizarion Roles --------------------------------------------
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};
