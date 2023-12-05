const mongoose = require("mongoose");

const connectedToMongo = () => {
  mongoose
    .connect(
      "mongodb://tgccrpto_user:crptousertgc@45.9.188.72:27017/tgc_crpto",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    )
    .then(() => console.log("Connected to mongodb successfully"))
    .catch((err) => console.error("Connected Error", err));
};

module.exports = connectedToMongo;
