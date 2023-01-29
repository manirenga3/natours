import express from 'express';

import * as UserControllers from '../controllers/userControllers.js';
import * as AuthControllers from '../controllers/authControllers.js';

const router = express.Router();

// ROUTES
router.post('/signup', AuthControllers.signUp);
router.get('/signup/confirm_account', AuthControllers.signupConfirm);
router.post('/login', AuthControllers.login);
router.get('/logout', AuthControllers.logout);

router.post('/forgotPassword', AuthControllers.forgotPassword);
router.patch('/resetPassword', AuthControllers.resetPassword);

router.post('/reactivateMe', UserControllers.reactivateMe);

router.use(AuthControllers.protect);

router.patch('/updateMyPassword', AuthControllers.updatePassword);

router.get('/me', UserControllers.getMe, UserControllers.getUser);
router.patch(
  '/updateMe',
  UserControllers.uploadUserPhoto,
  UserControllers.resizeUserPhoto,
  UserControllers.updateMe
);
router.delete('/permanentlyDeleteMe', UserControllers.permanentlyDeleteMe);

router.delete('/deactivateMe', UserControllers.deactivateMe);

router.use(AuthControllers.restrictTo('admin'));

router.route('/').get(UserControllers.getAllUsers);

router
  .route('/:id')
  .get(UserControllers.getUser)
  .patch(UserControllers.updateUser)
  .delete(UserControllers.deleteUser);

export { router as userRouter };
