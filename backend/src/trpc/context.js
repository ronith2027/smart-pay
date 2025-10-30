const jwt = require('jsonwebtoken');

function createContext({ req, res }) {
  const authHeader = req?.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      user = null;
    }
  }
  return { req, res, user };
}

module.exports = { createContext };