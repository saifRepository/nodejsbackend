const jwt = require("jsonwebtoken");
const secKey = "saifisb#oy";

const fetchUser = (req, res, next) => {
  const authToken = req.header("auth-token");
  if (!authToken) {
    res.status(401).send({ error: "Access Denied" });
  }
  try {
    const data = jwt.verify(authToken, secKey);
    req.user = data.user;
    next();
  } catch (error) {
    return res.status(401).send({ error: "Access Denied" });
  }
};

const fetchUser1 = (req, res, next) => {
  const authToken = req.header("auth-token");
  if (!authToken) {
    res.status(401).send({ error: "Access Denied" });
  }
  try {
    const data = jwt.verify(authToken, secKey);
    req.user = data.user;
    next();
  } catch (error) {
    return res.status(401).send({ error: "Access Denied" });
  }
};

module.exports = fetchUser;
