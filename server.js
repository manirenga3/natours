import mongoose from 'mongoose';
// import dotenv from 'dotenv';

import { app } from './app.js';

// PROCESS.ENV CONFIGURATION (Its on tourRoutes.js file)
// PREOCESS.ENV CONFIGURATION
// Needs to configure this before express app created, so that was configured in tourRoutes.js because tourRoutes.js was imported and executed first before this file gets executed in app.js file...
// console.log(app.get('env'));
// dotenv.config({ path: './config.env' });
// console.log(process.env);

// REGISTERING EVENT FOR UNCAUGHT EXCEPTION (ERROR IN SYNC)
process.on('uncaughtException', (err) => {
  console.log(`UNCAUGHT EXCEPTION! 💥 Shutting down...`);
  console.log(`Error name - ${err.name}`);
  console.log(`Error message - ${err.message}`);
  process.exit(1);
});

// DATABASE CONNECTION
const DB = "mongodb+srv://adminuser:901OGjrUSETsGElt@natours-cluster.ar58x8o.mongodb.net/natours?retryWrites=true&w=majority&authSource=admin";
mongoose.connect(DB).then(() => console.log('Database connection successful'));

// STARTING SERVER
const port = Number(process.env.PORT);
const server = app.listen(port, () => {
  console.log(`Listening to port ${port}...`);
});

// REGISTERING EVENT FOR UNHANDLED REJECTIONS (ERROR IN ASYNC)
process.on('unhandledRejection', (err) => {
  console.log(`UNHANDLED REJECTION! 💥 Shutting down...`);
  console.log(`Error name - ${err.name}`);
  console.log(`Error message - ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// RESPONDING TO HEROKU'S SIGTERM SIGNAL (Every 24 hours)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM Received! Shutting down...');
  server.close(() => {
    console.log('Process terminated because of SIGTERM');
  });
});
