if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const Listing = require("./models/listing.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const User = require("./models/user.js");
const userRouter = require("./routes/user.js");
const { isLoggedIn, isOwner, isReviewAuthor } = require("./middleware.js");

// SESSION SECRET
const SECRET = process.env.SECRET;
if (!SECRET && process.env.NODE_ENV === "production") {
    console.error("SECRET environment variable is required in production.");
    process.exit(1);
}


// DATABASE CONNECTION
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/StayEase";

async function main() {
    await mongoose.connect(MONGO_URL);
}

main()
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log(err));

// APP CONFIG
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const sessionOptions = {
    secret: SECRET || "dev-only-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

// AUTH
app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Make flash messages and the current user available in every view
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

app.use("/", userRouter);
// ROOT
app.get("/", (req, res) => {
    res.redirect("/listings");
});

// STATIC PAGES
app.get("/privacy", (req, res) => {
    res.render("privacy.ejs");
});

app.get("/terms", (req, res) => {
    res.render("terms.ejs");
});


// ---------------- VALIDATION MIDDLEWARE ----------------

const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

const validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};


// ---------------- LISTING ROUTES ----------------

// INDEX
app.get("/listings", wrapAsync(async (req, res) => {
    const allListing = await Listing.find({});
    res.render("listings/index.ejs", { allListing });
}));

// NEW
app.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

// CREATE
app.post("/listings", isLoggedIn, validateListing, wrapAsync(async (req, res) => {
    const listingData = req.body.listing || {};

    // Normalize image field to match Mongoose schema (image.url)
    if (typeof listingData.image === "string") {
        listingData.image = { url: listingData.image };
    }

    const newListing = new Listing(listingData);
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash("success", "New listing created!");
    res.redirect("/listings");
}));

// SHOW
app.get("/listings/:id", wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/show.ejs", { listing });
}));

// EDIT
app.get("/listings/:id/edit", isLoggedIn, wrapAsync(isOwner), wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/edit.ejs", { listing });
}));

// UPDATE
app.put("/listings/:id", isLoggedIn, wrapAsync(isOwner), validateListing, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listingData = req.body.listing || {};

    // Normalize image field to match Mongoose schema (image.url)
    if (typeof listingData.image === "string") {
        listingData.image = { url: listingData.image };
    }

    const listing = await Listing.findByIdAndUpdate(
        id,
        listingData,
        { new: true }
    );
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
}));

// DELETE
app.delete("/listings/:id", isLoggedIn, wrapAsync(isOwner), wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    req.flash("success", "Listing deleted.");
    res.redirect("/listings");
}));


// ---------------- REVIEW ROUTE ----------------

app.post("/listings/:id/reviews", isLoggedIn, validateReview, wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    req.flash("success", "Review added!");
    res.redirect(`/listings/${listing._id}`);
}));

// Delete Review Route
app.delete(
    "/listings/:id/reviews/:reviewId",
    isLoggedIn,
    wrapAsync(isReviewAuthor),
    wrapAsync(async(req,res)=>{
        let {id,reviewId}= req.params;

        await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
        await Review.findByIdAndDelete(reviewId);
        req.flash("success", "Review deleted.");

        res.redirect(`/listings/${id}`);
    })
);


// 404 handler
app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

// Error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong!" } = err;
    // Defaults in case the error happened before the locals middleware ran
    res.locals.success = res.locals.success || [];
    res.locals.error = res.locals.error || [];
    res.locals.currUser = res.locals.currUser || req.user;
    res.status(statusCode).render("error.ejs", { message });
});

// SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
