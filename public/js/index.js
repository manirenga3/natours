/* eslint-disable */
import '@babel/polyfill';

import { displayMap } from './mapbox.js';
import { auth, logout } from './auth.js';
import { updateData } from './updateData.js';
import { bookTour } from './stripe.js';
import { showAlert } from './alerts.js';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form-user-login');
const signupForm = document.querySelector('.form-user-signup');
const logoutBtn = document.querySelector('.nav__el--logout');
const dataForm = document.querySelector('.form-user-data');
const passwordForm = document.querySelector('.form-user-settings');
const fileInput = document.getElementById('photo');
const choosePhotoBtn = document.querySelector('.btn--choose-photo');
const bookBtn = document.getElementById('book-tour');

// VALUES

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    document.querySelector('.btn--login').textContent = 'Logging in...';

    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    await auth({ email, password }, 'login');

    document.querySelector('.btn--login').textContent = 'Login';
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    // document.querySelector('.btn--signup').textContent = 'Signing up...';

    // e.preventDefault();
    // const name = document.getElementById('signupName').value;
    // const email = document.getElementById('signupEmail').value;
    // const password = document.getElementById('signupPassword').value;
    // const passwordConfirm = document.getElementById(
    //   'signupConfirmPassword'
    // ).value;
    // await auth({ name, email, password, passwordConfirm }, 'signup');

    // document.querySelector('.btn--signup').textContent = 'Sign Up';
    // document.getElementById('signupName').value = '';
    // document.getElementById('signupEmail').value = '';
    // document.getElementById('signupPassword').value = '';
    // document.getElementById('signupConfirmPassword').value = '';
    showAlert(
      'error',
      'Signup is currently disabled! Please contact admin.',
      10
    );
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

if (choosePhotoBtn) {
  choosePhotoBtn.addEventListener('click', function () {
    fileInput.click();
  });
}

if (fileInput) {
  fileInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
    }
    if (this.value) {
      const regExp = /[0-9a-zA-Z\^\&\'\@\{\}\[\]\,\$\=\!\-\#\(\)\.\%\+\~\_]+$/;
      const value = this.value.match(regExp);
      document.getElementById('file-name').textContent = value;
    }
  });
}

if (dataForm) {
  dataForm.addEventListener('submit', async (e) => {
    document.querySelector('.btn--save-data').textContent = 'Saving...';

    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('photo', fileInput.files[0]);
    await updateData(form, 'Data');

    document.querySelector('.btn--save-data').textContent = 'Save Details';
  });
}

if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    document.querySelector('.btn--save-password').textContent = 'Saving...';

    e.preventDefault();
    const passwordCurrent = document.getElementById('password-current').value;
    const passwordNew = document.getElementById('password').value;
    const passwordNewConfirm =
      document.getElementById('password-confirm').value;

    await updateData(
      { passwordCurrent, passwordNew, passwordNewConfirm },
      'Password'
    );

    document.querySelector('.btn--save-password').textContent = 'Save Password';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    bookBtn.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 20);
