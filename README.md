# StayEase

StayEase is a small vacation rental site I built to learn full-stack web development with Node, Express and MongoDB. You can browse places to stay, open a listing to see the details and reviews, sign up, post your own place, and leave reviews on other people's listings. It is loosely modelled on how Airbnb works, just a lot smaller.

**Live demo:** https://theaadishjain.github.io/StayEase/

A quick note on the demo: GitHub Pages can only host static files, so the demo is a pre-rendered copy of the site built from the sample data. You can click through every page and see the layout, but forms don't save anything there. To use the real thing (accounts, creating listings, reviews) you'll need to run it locally, which only takes a couple of minutes.

## What it does

- Lists every stay in a responsive grid, with a search box that filters by title, city or country as you type
- Each listing has its own page with a large photo, description, host, price per night and an average rating
- Sign up, log in and log out using sessions (Passport with a local username and password strategy)
- Logged-in users can create a listing. Only the person who created it can edit or delete it
- Logged-in users can leave a 1 to 5 star review with a comment, and delete their own reviews
- Deleting a listing also deletes all of its reviews
- Forms are checked twice: in the browser with Bootstrap validation, and on the server with Joi, so bad data never makes it into the database
- Flash messages tell you what just happened (listing created, logged out, not allowed, and so on)
- If you try to open a page that needs an account, you're sent to log in and then brought back to where you were going

## Built with

- **Node.js** and **Express 5** for the server and routing
- **MongoDB** with **Mongoose** for data
- **EJS** templates with **ejs-mate** for a shared layout
- **Passport** and **passport-local-mongoose** for authentication
- **express-session** and **connect-flash** for sessions and messages
- **Joi** for server-side validation
- **Bootstrap 5** and **Font Awesome** for the UI, with a custom stylesheet on top

## Running it locally

You'll need Node.js 18 or newer and MongoDB running somewhere. A local install of MongoDB Community Server is the easiest option, but a MongoDB Atlas connection string works too.

1. Clone the repo and install dependencies

   ```bash
   git clone https://github.com/theaadishjain/StayEase.git
   cd StayEase
   npm install
   ```

2. Create a `.env` file in the project root. There's an example you can copy:

   ```bash
   cp .env.example .env
   ```

   | Variable    | What it's for                                            | Default                                  |
   | ----------- | -------------------------------------------------------- | ---------------------------------------- |
   | `MONGO_URL` | MongoDB connection string                                | `mongodb://127.0.0.1:27017/StayEase`     |
   | `SECRET`    | Used to sign session cookies. Required in production     | a dev-only fallback                      |
   | `PORT`      | Port the server listens on                               | `8080`                                   |

3. (Optional) Load the sample listings. This wipes the listings collection and inserts 20 example stays:

   ```bash
   node init/index.js
   ```

4. Start the server

   ```bash
   npm start
   ```

   Then open http://localhost:8080 in your browser.

The sample listings don't belong to any user, so you won't see Edit or Delete buttons on them. Sign up and create a listing of your own to try those out.

## Project structure

```
StayEase/
├── app.js                  # Express setup, listing and review routes, error handling
├── middleware.js           # isLoggedIn, isOwner, isReviewAuthor, redirect helper
├── schema.js               # Joi schemas for listings and reviews
├── models/                 # Mongoose models: Listing, Review, User
├── routes/user.js          # Sign up, log in, log out
├── init/                   # Sample data and the seed script
├── views/
│   ├── layouts/            # Shared page layout
│   ├── includes/           # Navbar, footer, flash messages, listing form
│   ├── listings/           # Index, show, new and edit pages
│   └── users/              # Log in and sign up pages
├── public/                 # CSS and client-side JS
├── utils/                  # Async wrapper and custom error class
└── scripts/build-static.js # Builds the static demo for GitHub Pages
```

## Routes

| Method | Path                                   | What it does                         | Needs login        |
| ------ | -------------------------------------- | ------------------------------------ | ------------------ |
| GET    | `/listings`                            | All listings                         | No                 |
| GET    | `/listings/new`                        | Form to add a listing                | Yes                |
| POST   | `/listings`                            | Create a listing                     | Yes                |
| GET    | `/listings/:id`                        | Listing details and reviews          | No                 |
| GET    | `/listings/:id/edit`                   | Edit form                            | Yes, owner only    |
| PUT    | `/listings/:id`                        | Update a listing                     | Yes, owner only    |
| DELETE | `/listings/:id`                        | Delete a listing and its reviews     | Yes, owner only    |
| POST   | `/listings/:id/reviews`                | Add a review                         | Yes                |
| DELETE | `/listings/:id/reviews/:reviewId`      | Delete a review                      | Yes, author only   |
| GET    | `/signup`, `/login`                    | Auth pages                           | No                 |
| POST   | `/signup`, `/login`, `/logout`         | Create account, log in, log out      | No                 |

HTML forms can only send GET and POST, so PUT and DELETE requests go through `method-override` using a `?_method=` query parameter.

## The static demo

`npm run build:static` renders the real EJS views with the sample data and writes plain HTML into `dist/`. No database or running server is involved. Pages are rendered as if a demo user is logged in and owns every listing, so you can see the owner controls, and a small script stops forms from submitting.

The GitHub Actions workflow in `.github/workflows/pages.yml` runs this build and publishes it to GitHub Pages on every push to `main`.

## Things I'd like to add next

- Image uploads instead of pasting an image link
- A map on each listing page
- Filtering by price and category
- Storing sessions in MongoDB so logins survive a server restart

## Author

Aadish Jain ([@theaadishjain](https://github.com/theaadishjain))

If you spot a bug or have an idea, feel free to open an issue.
