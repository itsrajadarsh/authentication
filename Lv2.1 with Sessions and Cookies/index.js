import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "secret",
    resave: false, //true if we want to store at db with pg admin
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60, // 1 minute (it will expire afterwards)
    },
  })
);
app.use(passport.initialize());
app.use(passport.session()); //order matters

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "secrets",
  password: "password",
  port: 5432,
});
db.connect();

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});
app.get("/secrets", (req, res) => {
  console.log(req.user);
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
  } else {
    res.redirect("/login");
  }
});
app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            if (err) {
              console.error("Error logging in user:", err);
            } else {
              res.redirect("/secrets");
            }
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    //to trigger stratagies to passport
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

//to authenticate
passport.use(
  new Strategy(async function verify(username, password, cb) {
    //username in same an in name route in login .ejs and register.ejs
    //password in same as in name route in login.ejs and register.ejs
    //cb is callback function
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (err) {
            return cb(err); //return errer
          } else {
            if (result) {
              return cb(null, user); //return authenticated
            } else {
              return cb(null, false); //return not authenticated
            }
          }
        });
      } else {
        return cb(null, false); //return not authenticated
      }
    } catch (err) {
      return cb(err); //return errer
    }
  })
);
//serialize user
passport.serializeUser((user, done) => {
  done(null, user);
});
//deserialize user
passport.deserializeUser((user, done) => {
  done(null, user);
});
// passport.deserializeUser((id, done) => {
//   db.query("SELECT * FROM users WHERE id = $1", [id])
//     .then((result) => {
//       done(null, result.rows[0]);
//     })
//     .catch((err) => {
//       done(err);
//     });
// });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
