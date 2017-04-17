const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const PORT = process.env.PORT || 8080; // binds to a port
const bcrypt = require("bcrypt");
const app = express();

const urlDatabase = {
  "b2xVn2": { userID: "user1RandomID",
              url: "http://www.lighthouselabs.ca" }
};

const userDatabase = {
  "user1RandomID": { userID: "user1RandomID",
                     email: "user@example.com",
                     password: "test" }
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
    console.log("filtering through app.use('/urls*?') ... req.session.id = ", req.session.id);
    next();
  } else {
    res.status(401).send('Please <a href="/login">Log In</a> or <a href="/register">Register</a> to continue.');
  }
});

// confirm that requested path exists before continuing
// app.use("/*?", (req, res, next) => {
//   if (/*url exists*/) {
//     console.log("filtering through app.use('/*?') ... req.body = ", req.body);
//     next();
//   } else {
//     res.status(401).send('Oops, this path leads to nothing ... <a href="/">Click here to start over</a>');
//   }
// });

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
  console.log("\n GET '/urls' userDatabase = ", userDatabase);
  console.log("\n GET '/urls' req.session =\n", req.session);
  let templateVars = {
    userID: req.session.id,
    email: userDatabase[req.session.id].email,
    urls: urlsForUser(req.session.id)
  };
  console.log("GET '/urls' templateVars =\n", templateVars);
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
    console.log("\n POST to '/urls' req.body = \n", req.body);
    console.log("urlDatabase should be updated:\n", urlDatabase);
    res.redirect("/urls/" + shortURL);
  }
});

app.get("/urls/new", (req, res) => {
  let templateVars = {
    userID: req.session.id,
    email: userDatabase[req.session.id].email,
    urls: urlsForUser(req.session.id)
  };
  console.log("\n GET '/urls/new' req.body = \n", req.body);
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  console.log("\n GET '/urls/:id' req.params.id = \n" + req.params.id);
  console.log("\n GET '/urls/:id' req.session.id = \n" + req.session.id);
  console.log("\n GET '/urls/:id' urlDatabase = ", urlDatabase);
  let templateVars = {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id].url,
    userID: req.session.id,
    email: userDatabase[req.session.id].email
  };
  console.log("GET '/urls/:id' templateVars: ", templateVars);
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  console.log("POST to '/urls/:id' req.body.id = ", req.body.longURL);
  let userID = req.session.id;
  let updatedURL = req.body.longURL;
  let shortURL = req.params.id;
  // check if ':id' exists in urlDatabase
  // check if ':id' matches owner

  // change longURL in urlDatabase to match input from the form
  if (updatedURL) { // *** This doesn't account for invalid input, just no input ***
    urlDatabase[shortURL].url = updatedURL;
    console.log("POST to '/urls/:id' urlDatabase should be updated:\n", urlDatabase);
    res.redirect("/urls/" + shortURL);
  } else {
    res.status(403).send("Type in a valid URL before submitting. Try again.");
  }
});

app.post("/urls/:id/delete", (req, res) => {
  console.log("\n POST to '/urls/:id/delete' req.body = \n", req.body);
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
  console.log("'req.session.id = ", req.session.id + "\n");
  console.log("\n User added to database:\n", userDatabase);
  console.log("\n POST to '/register' req.body = \n", req.body + "\n");
  res.redirect("/");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  let loginEmail = req.body.email;
  let loginPassword = req.body.password;
  console.log("\n POST '/login' userDatabase = ", userDatabase);
  console.log("\n POST to '/login' req.body = ", req.body);

  for (let userID in userDatabase) {
    let user = userDatabase[userID];
    console.log("user = ", user);
    if ((user.email === loginEmail) && (bcrypt.compareSync(loginPassword, user.password))) {
      req.session.id = user.userID;
      console.log("POST '/login' - User accepted. Redirecting to '/' ...");
      res.redirect("/");
      return;
    }
  }
  console.log("POST '/login' - email or password does not match userDatabase");
  res.status(401).send('There is a problem with your email or password. <a href="/login">Click here to try logging in again.</a><br />New user? <a href="/register">Click here to register.</a>');
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});