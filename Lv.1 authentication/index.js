import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "secrets",
  password: "password",
});

db.connect();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);
    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      const query = "INSERT INTO users (email, password) VALUES ($1,$2);";
      const result = await db.query(query, [username, password]);
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err);
  }
  // console.log(username);
  // console.log(password);
  // console.log(result);
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const query = "SELECT * FROM users WHERE email = $1 AND password = $2;";
    const result = await db.query(query, [username, password]);
    if (result.rows.length > 0) {
      res.render("secrets.ejs");
    } else {
      res.send("Incorrect Password or User not found");
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err);
  }
  // console.log(username);
  // console.log(password);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
