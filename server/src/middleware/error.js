export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  if (err.name === 'MulterError') {
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB).' : 'Upload one CV file at a time.' });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });

  const status = err.status || 500;
  if (status >= 500 && status !== 503) console.error(err);
  res.status(status).json({ message: status >= 500 && process.env.NODE_ENV === 'production' && !err.status ? 'Something went wrong' : err.message });
}
