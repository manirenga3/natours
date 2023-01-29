/* eslint-disable */
import axios from 'axios';

import { showAlert } from './alerts.js';

// type is either 'login' or 'signup'
export const auth = async (data, type) => {
  try {
    const url =
      type === 'login' ? '/api/v1/users/login' : '/api/v1/users/signup';

    const res = await axios({
      method: 'POST',
      url,
      data,
    });
    if (res.data.status === 'success') {
      if (type === 'login') {
        showAlert('success', res.data.message);
        window.setTimeout(() => {
          location.assign('/');
        }, 1000);
      } else {
        showAlert('success', res.data.message);
      }
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });
    if (res.data.status === 'success') {
      location.assign('/login');
    }
  } catch (err) {
    showAlert('error', 'Error in logging out! Try again.');
  }
};
