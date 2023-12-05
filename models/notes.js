const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const noteSchema = new Schema({
  title: {
    type: String,
    require: true,
    minlength: 3,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    date: Date,
    default: Date.now,
  },
});

const notes = mongoose.model("notes", noteSchema);

export default notes;
