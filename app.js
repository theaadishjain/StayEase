const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");

const MONGO_URL = "mongodb://127.0.0.1:27017/StayEase";

// Mongo Connection
async function main() {
    await mongoose.connect(MONGO_URL);
}
main()
    .then(() => console.log("Connected to DB"))
    .catch(err => console.log(err));

// App Config
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Root Route
app.get("/", (req, res) => {
    res.send("Hi, I am root");
});

// INDEX ROUTE

app.get("/listings", async (req, res) => {
    const allListing = await Listing.find({});
    res.render("listings/index.ejs", { allListing });
});

// NEW ROUTE

app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
});

// CREATE ROUTE

app.post("/listings", async (req, res) => {
    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect("/listings");
});

// SHOW ROUTE

app.get("/listings/:id", async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/show.ejs", { listing });
});

// EDIT ROUTE

app.get("/listings/:id/edit", async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
});

// UPDATE ROUTE

app.put("/listings/:id", async (req, res) => {
    const { id } = req.params;

    await Listing.findByIdAndUpdate(
        id,
        req.body.listing,
        { new: true }
    );

    res.redirect(`/listings/${id}`);
});

// DELETE ROUTE 

app.delete("/listings/:id", async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
});

// Server
app.listen(8080, () => {
    console.log("Server is listening on port 8080");
});
