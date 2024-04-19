import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";
import { dirname } from "path";
import cors from "cors";
import env from "dotenv";

const { Pool } = pg;

// Retrieve filename and directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Load environment variables from .env file
env.config();

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

// Connect to the PostgreSQL database
pool.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => console.error('Error connecting to the database', err));

// Middleware setup
app.use(cors());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public/"));

// Function to retrieve visited countries from the database
async function checkVisitedCountries() {
  const result = await pool.query("SELECT country_code FROM visited_countries_tt");
  return result.rows.map(row => row.country_code);
}

// GET route for the home page
app.get("/", async (req, res) => {
  const visitedCountries = await checkVisitedCountries();
  res.render("index.ejs", { countries: visitedCountries, total: visitedCountries.length });
});

// POST route to add a new visited country
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    // Check if the provided country name exists in the database
    const result = await pool.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) = $1;",
      [input.toLowerCase()]
    );

    // If the country exists, retrieve its country code
    const countryCode = result.rows[0].country_code;

    // Insert the visited country into the database
    await pool.query("INSERT INTO visited_countries_tt (country_code) VALUES ($1)", [countryCode]);
    
    // Redirect to the home page
    res.redirect("/");
  } catch (err) {
    // Handle errors (e.g., country not found or already added)
    console.error(err);
    const visitedCountries = await checkVisitedCountries();
    res.render("index.ejs", {
      countries: visitedCountries,
      total: visitedCountries.length,
      error: "An error occurred. Please try again.",
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
