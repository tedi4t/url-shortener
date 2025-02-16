const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { nanoid } = require("nanoid");
const path = require("path");
const fs = require("fs");

// Create SQLite database file if it doesn't exist
const DB_FILE = "urls.db";
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "");






// Initialize Express app
const app = express();
const db = new sqlite3.Database(DB_FILE);

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Middleware for parsing JSON & form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Create table for storing URLs
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS urls (
      id TEXT PRIMARY KEY, 
      original_url TEXT NOT NULL, 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );
});

// 🟢 Render HTML Form
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// 🔗 Shorten a URL
app.post("/shorten", (req, res) => {
  const { url } = req.body;
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  const id = nanoid(6);
  db.run("INSERT INTO urls (id, original_url) VALUES (?, ?)", [id, url], (err) => {
    if (err) return res.status(500).json({ error: "Database error" });

    const shortUrl = `${BASE_URL}/${id}`;
    res.json({ shortUrl });
  });
});

// 🔄 Redirect to Original URL
app.get("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT original_url FROM urls WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).send("Database error");
    if (!row) return res.status(404).send("URL not found");

    res.redirect(row.original_url);
  });
});

// 🗑 Delete Short URL (Admin Feature)
app.delete("/delete/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM urls WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });

    res.json({ message: "Deleted successfully", deletedCount: this.changes });
  });
});

// 🔍 Get All Shortened URLs
app.get("/urls", (req, res) => {
  db.all("SELECT * FROM urls ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    res.json(rows);
  });
});

// 🛑 Handle 404
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

// ✅ Start the Server
app.listen(PORT, () => {
  console.log(`Server running at ${BASE_URL}`);
});

// 📌 Validate URL format
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
}
