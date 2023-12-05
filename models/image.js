const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const imageSchema = new Schema({
  selfieImage: {
    data: Buffer,
    contentType: String,
  },
  passportImage: {
    data: Buffer,
    contentType: String,
  },
  email: {
    type: String,
    required: true,
  },
});

const Image = mongoose.model("image", imageSchema);
module.exports = Image;
