const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const imageSchema = new Schema({
  image: {
    data: Buffer,
    contentType: String,
  },
});

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  verificationCode: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  codeExpiry: {
    type: Date,
  },
  address: {
    type: String,
    required: true,
  },
  investedAmount: {
    type: String,
    required: true,
  },
  isVerifedbyAdmin: {
    type: Boolean,
    required: true,
  },
  isAdmin: {
    type: Boolean,
  },
});

const user = mongoose.model("user", userSchema);

module.exports = user;
