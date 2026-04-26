import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import session from "express-session";

import dotenv from "dotenv";
dotenv.config();

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true
});

app.set("trust proxy", 1);
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true
  })
);

function isUserAuthenticated(req, res, next) {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect("/login");
  }
}

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/loginProcess", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  let sql = `SELECT *
             FROM admin
             WHERE username = ?`;
  const [rows] = await pool.query(sql, [username]);

  let hashedPassword = "";
  if (rows.length > 0) {
    hashedPassword = rows[0].password;
  }

  const match = await bcrypt.compare(password, hashedPassword);

  if (match) {
    req.session.authenticated = true;
    req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
    res.redirect("/");
  } else {
    let loginError = "Wrong credentials! Try again.";
    res.render("login.ejs", { loginError });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.get("/", isUserAuthenticated, (req, res) => {
  res.render("home.ejs");
});

app.get("/quotes", isUserAuthenticated, async (req, res) => {
  let sql = `SELECT quoteId, quote
             FROM quotes
             ORDER BY quote`;
  const [quotes] = await pool.query(sql);

  res.render("quotes.ejs", { quotes });
});

app.get("/updateQuote", isUserAuthenticated, async (req, res) => {
  let quoteId = req.query.quoteId;

  let sql = `SELECT *
             FROM quotes
             WHERE quoteId = ?`;
  const [quoteInfo] = await pool.query(sql, [quoteId]);

  let sql2 = `SELECT authorId, firstName, lastName
              FROM authors
              ORDER BY lastName`;
  const [authorList] = await pool.query(sql2);

  let sql3 = `SELECT DISTINCT category
              FROM quotes
              ORDER BY category`;
  const [categoryList] = await pool.query(sql3);

  res.render("updateQuote.ejs", { quoteInfo, authorList, categoryList });
});

app.post("/updateQuote", isUserAuthenticated, async (req, res) => {
  let quote = req.body.quote;
  let category = req.body.category;
  let authorId = req.body.authorId;
  let quoteId = req.body.quoteId;

  let sql = `UPDATE quotes
             SET quote = ?,
                 category = ?,
                 authorId = ?
             WHERE quoteId = ?`;
  let sqlParams = [quote, category, authorId, quoteId];

  await pool.query(sql, sqlParams);
  res.redirect("/quotes");
});

app.get("/deleteQuote", isUserAuthenticated, async (req, res) => {
  let quoteId = req.query.quoteId;

  let sql = `SELECT *
             FROM quotes
             WHERE quoteId = ?`;
  const [quoteInfo] = await pool.query(sql, [quoteId]);

  res.render("deleteQuote.ejs", { quoteInfo });
});

app.post("/deleteQuote", isUserAuthenticated, async (req, res) => {
  let quoteId = req.body.quoteId;

  let sql = `DELETE FROM quotes
             WHERE quoteId = ?`;
  await pool.query(sql, [quoteId]);

  res.redirect("/quotes");
});

app.get("/authors", isUserAuthenticated, async (req, res) => {
  let sql = `SELECT authorId, firstName, lastName
             FROM authors
             ORDER BY lastName`;
  const [authors] = await pool.query(sql);

  res.render("authors.ejs", { authors });
});

app.get("/updateAuthor", isUserAuthenticated, async (req, res) => {
  let authorId = req.query.authorId;

  let sql = `SELECT *,
                    DATE_FORMAT(dob, '%Y-%m-%d') AS ISOdob,
                    DATE_FORMAT(dod, '%Y-%m-%d') AS ISOdod
             FROM authors
             WHERE authorId = ?`;
  const [authorInfo] = await pool.query(sql, [authorId]);

  res.render("updateAuthor.ejs", { authorInfo });
});

app.post("/updateAuthor", isUserAuthenticated, async (req, res) => {
  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let dob = req.body.dob;
  let dod = req.body.dod;
  let sex = req.body.sex;
  let bio = req.body.bio;
  let profession = req.body.profession;
  let country = req.body.country;
  let portrait = req.body.portrait;
  let authorId = req.body.authorId;

  let sql = `UPDATE authors
             SET firstName = ?,
                 lastName = ?,
                 dob = ?,
                 dod = ?,
                 sex = ?,
                 biography = ?,
                 profession = ?,
                 country = ?,
                 portrait = ?
             WHERE authorId = ?`;

  let sqlParams = [
    firstName,
    lastName,
    dob,
    dod,
    sex,
    bio,
    profession,
    country,
    portrait,
    authorId
  ];

  await pool.query(sql, sqlParams);
  res.redirect("/authors");
});

app.get("/addAuthor", isUserAuthenticated, (req, res) => {
  res.render("addAuthor.ejs");
});

app.post("/addAuthor", isUserAuthenticated, async (req, res) => {
  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let dob = req.body.dob;
  let dod = req.body.dod;
  let sex = req.body.sex;
  let bio = req.body.bio;
  let profession = req.body.profession;
  let country = req.body.country;
  let portrait = req.body.portrait;

  let sql = `INSERT INTO authors
             (firstName, lastName, dob, dod, sex, biography, profession, country, portrait)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  let sqlParams = [
    firstName,
    lastName,
    dob,
    dod,
    sex,
    bio,
    profession,
    country,
    portrait
  ];

  await pool.query(sql, sqlParams);
  res.redirect("/authors");
});

app.get("/deleteAuthor", isUserAuthenticated, async (req, res) => {
  let authorId = req.query.authorId;

  let sql = `SELECT *
             FROM authors
             WHERE authorId = ?`;
  const [authorInfo] = await pool.query(sql, [authorId]);

  res.render("deleteAuthor.ejs", { authorInfo });
});

app.post("/deleteAuthor", isUserAuthenticated, async (req, res) => {
  let authorId = req.body.authorId;

  let sql = `DELETE FROM authors
             WHERE authorId = ?`;
  await pool.query(sql, [authorId]);

  res.redirect("/authors");
});

app.get("/addQuote", isUserAuthenticated, async (req, res) => {
  let sql1 = `SELECT authorId, firstName, lastName
              FROM authors
              ORDER BY lastName`;
  const [authorList] = await pool.query(sql1);

  let sql2 = `SELECT DISTINCT category
              FROM quotes
              ORDER BY category`;
  const [categoryList] = await pool.query(sql2);

  res.render("addQuotes.ejs", { authorList, categoryList });
});

app.post("/addQuote", isUserAuthenticated, async (req, res) => {
  let quote = req.body.quote;
  let category = req.body.category;
  let authorId = req.body.authorId;

  let sql = `INSERT INTO quotes
             (quote, authorId, category)
             VALUES (?, ?, ?)`;
  let sqlParams = [quote, authorId, category];

  await pool.query(sql, sqlParams);
  res.redirect("/quotes");
});

app.get("/dbTest", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT CURDATE()");
    res.send(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Database error!");
  }
});

app.listen(3000, () => {
  console.log("Express server running");
});