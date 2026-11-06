// Builds a static, frontend-only demo of StayEase into ./dist
// It renders the real EJS views with the sample data from init/data.js,
// so no MongoDB or running server is needed to view the site.
//
// Usage:  npm run build:static
// Optional: BASE_PATH=/StayEase npm run build:static   (for GitHub Pages project sites)

const fs = require("fs");
const path = require("path");
const express = require("express");
const ejsMate = require("ejs-mate");
const { data } = require("../init/data.js");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist");
const BASE = (process.env.BASE_PATH || "").replace(/\/+$/, ""); // "" or "/StayEase"

// A bare Express app is only used for its view engine; it never listens on a port
const app = express();
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(ROOT, "views"));

// Pages are rendered as a logged-in "demo" user who owns every listing, so the
// Edit/Delete buttons and review form are visible (the views compare ids with .equals)
const demoId = { equals: (other) => other === demoId, toString: () => "demo" };
const demoUser = { _id: demoId, username: "demo" };

// Give each sample listing a stable, readable id (used in its URL)
const slugify = (s) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const listings = data.map((l) => ({
    ...l,
    _id: slugify(l.title),
    owner: demoUser,
    reviews: [],
}));

// Locals every page expects (normally set by middleware in app.js)
const baseLocals = { success: [], error: [], currUser: demoUser };

function render(view, locals) {
    return new Promise((resolve, reject) => {
        app.render(view, { ...baseLocals, ...locals }, (err, html) =>
            err ? reject(err) : resolve(html)
        );
    });
}

const DEMO_SCRIPT = `
<div class="position-fixed bottom-0 end-0 p-3" style="z-index:1080">
  <div id="demoToast" class="toast text-bg-dark" role="status" aria-live="polite">
    <div class="d-flex">
      <div class="toast-body">This is a static demo, so forms don't save anything.</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  </div>
</div>
<script>
  // Stop every form from submitting (there is no server) and explain why
  document.addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    if (form.classList.contains("needs-validation") && !form.checkValidity()) return;
    bootstrap.Toast.getOrCreateInstance(document.getElementById("demoToast")).show();
  }, true);
</script>`;

// Point root-relative links/assets at BASE and inject the demo form script
function postProcess(html) {
    if (BASE) {
        html = html.replace(/(href|src|action)="\/(?!\/)/g, `$1="${BASE}/`);
    }
    html = html.replace(/<\/body>/, `${DEMO_SCRIPT}\n</body>`);
    return html;
}

function write(route, html) {
    const file = route.endsWith(".html")
        ? path.join(OUT, route)
        : path.join(OUT, route, "index.html");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, postProcess(html));
}

async function build() {
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true });

    const indexHtml = await render("listings/index", { allListing: listings });
    write("/", indexHtml);
    write("/listings", indexHtml);
    write("/listings/new", await render("listings/new", {}));

    for (const listing of listings) {
        write(`/listings/${listing._id}`, await render("listings/show", { listing }));
        write(`/listings/${listing._id}/edit`, await render("listings/edit", { listing }));
    }

    write("/login", await render("users/login", {}));
    write("/signup", await render("users/signup", {}));
    write("/privacy", await render("privacy", {}));
    write("/terms", await render("terms", {}));
    write("/404.html", await render("error", { message: "Page Not Found" }));

    // Tell GitHub Pages not to run Jekyll on the output
    fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

    console.log(`Built ${listings.length} listings into dist/ (base path: "${BASE || "/"}")`);
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
