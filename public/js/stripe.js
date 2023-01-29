/* eslint-disable */

import axios from 'axios';

import { showAlert } from './alerts.js';

const stripe = Stripe(
  'pk_test_51KaiaSSIEH8M6WqlywTyy7Jh1JCGuuWWHR2aKeWPYP1IUSjey52tMbB16ap3Ru82WPyDGPW0JXYQg1OHnKLoJAEO00PExUaIX6'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + charge the card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', 'An error occured! Please try again later.');
  }
};
