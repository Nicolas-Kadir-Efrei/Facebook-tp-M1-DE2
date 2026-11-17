function notFound(req, res) {
  res.status(404).json({ error: 'Route introuvable', path: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  if (err.code === 'P2002') {
    const fields = err.meta?.target || [];
    return res.status(409).json({
      error: 'Conflit : valeur déjà existante',
      fields,
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      error: 'Référence invalide (ID utilisateur/événement/groupe inexistant ou vide)',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Ressource introuvable' });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  res.status(500).json({ error: 'Erreur interne du serveur', message: err.message });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}

module.exports = { notFound, errorHandler, asyncHandler, httpError };
