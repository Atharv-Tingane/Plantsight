export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    status: 'error',
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, _req, res, _next) {
  console.error('[API Error]', err);

  const statusCode = res.statusCode !== 200 && res.statusCode !== 204 ? res.statusCode : 500;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      status: 'error',
      message: messages.join('. '),
      errors: err.errors,
    });
  }

  // Handle Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      status: 'error',
      message: `Invalid ID format: ${err.value}`,
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
