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
app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
});

// CREATE
app.post("/listings", validateListing, wrapAsync(async (req, res) => {
    const listingData = req.body.listing || {};

    // Normalize image field to match Mongoose schema (image.url)
    if (typeof listingData.image === "string") {
        listingData.image = { url: listingData.image };
    }

    const newListing = new Listing(listingData);
    await newListing.save();
    res.redirect("/listings");
}));

// SHOW
app.get("/listings/:id", wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/show.ejs", { listing });
}));

// EDIT
app.get("/listings/:id/edit", wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/edit.ejs", { listing });
}));

// UPDATE
app.put("/listings/:id", validateListing, wrapAsync(async (req, res) => {
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
    res.redirect(`/listings/${id}`);
}));

// DELETE
app.delete("/listings/:id", wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.redirect("/listings");
}));


// ---------------- REVIEW ROUTE ----------------

app.post("/listings/:id/reviews", validateReview, wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

    let newReview = new Review(req.body.review);

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    console.log("new review saved");
    res.redirect(`/listings/${listing._id}`);
}));

// Delete Review Route
app.delete(
    "/listings/:id/reviews/:reviewId",
    wrapAsync(async(req,res)=>{
        let {id,reviewId}= req.params;

        await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
        await Review.findByIdAndDelete(reviewId);

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
    res.status(statusCode).render("error.ejs", { message });
});

// SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
