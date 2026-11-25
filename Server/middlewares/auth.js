const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/parametres");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, jwtSecret);
    const userId = decodedToken.userId;
    req.auth = {
      userId: userId,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: "Merci de vous connecter" });
  }
};
