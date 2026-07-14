import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        res.status(401);
        throw new Error('User not found. Not authorized.');
      }
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401);
      next(error);
    }
  } else {
    res.status(401);
    next(new Error('Not authorized. No token provided.'));
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`User role '${req.user?.role}' is not authorized to access this route`));
    }
    next();
  };
};
