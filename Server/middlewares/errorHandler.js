function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    if (field === 'sku') {
      return res.status(409).json({ message: '이미 사용 중인 SKU입니다.' });
    }
    if (field === 'orderNumber') {
      return res.status(409).json({ message: '이미 사용 중인 주문번호입니다.' });
    }
    if (field === 'payment.transactionId' || field === 'payment.merchantUid') {
      return res.status(409).json({
        message: '이미 처리된 결제입니다. 동일한 결제로 중복 주문할 수 없습니다.',
      });
    }
    return res.status(409).json({ message: `Duplicate ${field}` });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    ...(Array.isArray(err.errors) ? { errors: err.errors } : {}),
  });
}

module.exports = errorHandler;
