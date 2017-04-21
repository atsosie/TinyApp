const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const PORT = process.env.PORT || 8080;
const bcrypt = require("bcrypt");
const app = express();

const urlDatabase = {
  "b2xVn2": {
    userID: "user1RandomID",
    url: "http://www.lighthouselabs.ca"
  }
};

const userDatabase = {
  "user1RandomID": {
    userID: "user1RandomID",
    email: "user@example.com",
    password: "test"
  }
};

// configuration and middleware

app.set("view engine", "ejs");

app.use(cookieSession( {
  name: "session",
  keys: ["lighthouse"],
  maxAge: 24 * 60 * 60 * 1000
  // 24 hours
}));

app.use(bodyParser.urlencoded({ extended: true }));

// confirm that visitor is logged in before continuing
app.use("/urls*?", (req, res, next) => {
  let user = req.session.id;
  if (user && userDatabase[user]) {
    next();
  } else {
    res.status(401).send('Please <a href="/login">Log In</a> or <a href="/register">Register</a> to continue.');
  }
});

// assign new random values to userID and shortURL
function generateRandomString(){
  let randomString = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 6; i > 0; --i) {
    randomString += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return randomString;
}

// filter urlDatabase according to userID
// returns a subset of urlDatabase:
//   { "shortURL1": "longURL1",
//     "shortURL2": "longURL2" }
function urlsForUser(userID) {
  let userURLs = {};
  for (let key in urlDatabase) {
    if (urlDatabase[key]["userID"] === userID) {
      userURLs[key] = urlDatabase[key]["url"];
    }
  }
  return userURLs;
}


app.get("/", (req, res) => {
  let user = req.session.id;
  if (user && userDatabase[user]) {
    res.redirect("/urls");
  } else {
    req.session = null;
    res.redirect("/login");
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// if logged in, show user's personal url index
app.get("/urls", (req, res) => {
  let templateVars = {
    userID: req.session.id,
    email: userDatabase[req.session.id].email,
    urls: urlsForUser(req.session.id)
  };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  var userID = req.session.id;
  var longURL = req.body.longURL;
  var shortURL = generateRandomString();

  if (!longURL) {
    res.status(403).send("Type in a valid URL before submitting. Try again.");
  } else {
    // create shortURL and add URL pair to database
    if (shortURL && longURL) {
      urlDatabase[shortURL] = {
        userID: userID,
        url: longURL
      };
    }
    res.redirect("/urls/" + shortURL);
  }
});

app.get("/urls/new", (req, res) => {
  let templateVars = {
    userID: req.session.id,
    email: userDatabase[req.session.id].email,
    urls: urlsForUser(req.session.id)
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id].url,
    userID: req.session.id,
    email: userDatabase[req.session.id].email
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  let updatedURL = req.body.longURL;
  let shortURL = req.params.id;
  let userID = req.session.id;

  for (let urlKey in urlDatabase) {
    if (!urlKey) {
      res.status(404).render("This Tiny URL is not in our database.");
      return;
    }
  }

  if (userID !== urlDatabase[shortURL].userID) {
    res.status(403).render("You do not have permission to edit this URL.");
    return;
  }

  // change longURL in urlDatabase to match input from the form
  // (this doesn't account for invalid input, just no input)
  if (updatedURL) {
    urlDatabase[shortURL].url = updatedURL;
    res.redirect("/urls/" + shortURL);
  } else {
    res.status(403).send("Type in a valid URL before submitting. Try again.");
  }
});

app.post("/urls/:id/delete", (req, res) => {
  let user = req.session.id;
  let shortURL = req.params.id;
  if (user === urlDatabase[shortURL].userID) {
    delete urlDatabase[shortURL];
    res.redirect("/urls");
  } else {
    res.status(403).send("You do not have permission to delete this link.");
  }
});

// links shortURL with corresponding longURL (available to general public)
app.get("/u/:id", (req, res) => {
  let shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    res.status(404).send("This path leads to nothing ... did you type in the address correctly?");
  } else {
    res.redirect(urlDatabase[shortURL].url);
  }
});


// ----- User Registration/Login -----

app.get("/register", (req, res) => {
  let user = req.session.id;
  if (user) {
    res.redirect('/');
    return;
  }
  res.render("register");
});

app.post("/register", (req, res) => {
  const newEmail = req.body.email;
  const newPassword = req.body.password;

  if (!newEmail || !newPassword) {
    res.status(400).send("Bad email or password. Try again.");
    return;
  }

  for (let key in userDatabase) {
    if (newEmail === userDatabase[key].email) {
      res.status(400).send("Email already registered.");
      return;
    }
  }

  let userID = generateRandomString();
  userDatabase[userID] = {
    userID: userID,
    email: newEmail,
    password: bcrypt.hashSync(newPassword, 10)
  };

  req.session.id = userID;
  res.redirect("/");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  let loginEmail = req.body.email;
  let loginPassword = req.body.password;

  for (let userID in userDatabase) {
    let user = userDatabase[userID];
    if ((user.email === loginEmail) && (bcrypt.compareSync(loginPassword, user.password))) {
      req.session.id = user.userID;
      res.redirect("/");
      return;
    }
  }
  res.status(401).send('There is a problem with your email or password. <a href="/login">Click here to try logging in again.</a><br />New user? <a href="/register">Click here to register.</a>');
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});

// handle 404 errors
app.use((req, res) => {
  res.status(404).send("404: Page not Found");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});