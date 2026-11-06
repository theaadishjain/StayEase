const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
});

// Adds username, hash and salt fields plus register/authenticate helpers
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
