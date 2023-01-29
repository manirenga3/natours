export const catchAsyncError = (fn) => {
  // We are catching error happened in async functions using this function to avoid try catch block. So we are wrapping this function over the async functions where we required and it will return that async function so that express would call it...
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
