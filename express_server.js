const express = require("express");
const app = express(); // This is a function that returns an object
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejsLint = require("ejs-lint");
var PORT = process.env.PORT || 8080; // binds to a port

// Configuration
app.set("view engine", "ejs");
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const userDatabase = {
  "user1RandomID": { id: "userRandomID",
                     email: "user@example.com",
                     password: "purple-monkey-dinosaur" },
  "user2RandomID": { id: "user2RandomID",
                     email: "user2@example.com",
                     password: "dishwasher-funk" }
};

function generateRandomString(){
  let randomString = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 6; i > 0; --i) {
    randomString += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return randomString;
}

// handle GET/POST on each of these paths
app.get("/", (req, res) => {
  res.end("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, user: userDatabase[req.cookies.user_id] };
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = { shortURL: req.params.id, longURL: urlDatabase[req.params.id], user: userDatabase[req.cookies.user_id] };
  res.render("urls_show", templateVars);
});

app.get("/urls/new", (req, res) => {
  let templateVars = { user: userDatabase[req.cookies.user_id] };
  res.render("urls_new", templateVars);
});

// Does sorting order matter for GET and POST?
app.post("/urls", (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = longURL;
  res.redirect("/urls/" + shortURL);
});

// redirect to corresponding longURL
/* Edge cases to consider:
 - What would happen if a client requests a non-existent shortURL?
 - What happens to the urlDatabase when the server is restarted?
 - Should your redirects be 301 or 302 - What is the difference?
*/
app.get("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  let templateVars = {
    username: req.cookies["user_id"],
    shortURL: shortURL,
    longURL: urlDatabase[shortURL]
  };
  res.redirect(longURL);
});

app.post('/urls/:shortURL/delete', (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
});

app.post("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  let longURL = req.body.longURL;
  urlDatabase[shortURL] = longURL;
  res.redirect("/urls");
});


// Handling cookies

app.post("/login", (req, res) => {
  const loginEmail = req.body.email;
  const loginPassword = req.body.password;
  for (let key in userDatabase) {
    if (userDatabase[key].email === loginEmail) {
      if (userDatabase[key].password === loginPassword) {
        let id = Object.keys(userDatabase).find(key => userDatabase[key].email === loginEmail);
        res.cookie("user_id", id);
        res.redirect("/urls");
      }
    }
  }
  console.log(req.body);
  res.status(403).send("Bad email or password.");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const newEmail = req.body.email;
  const newPassword = req.body.password;

  if (!newEmail || !newPassword) {
    res.status(400).send("Bad email or password.");
  } else {
    for (let key in userDatabase) {
      if (newEmail === userDatabase[key].email) {
        res.status(400).send("Email already registered.");
        return;
      }
    }
    let newUserId = generateRandomString();
    userDatabase[newUserId] = {
      "id": newUserId,
      "email": newEmail,
      "password": newPassword
    };
    res.cookie("user_id", userDatabase[newUserId].id);
    console.log("cookie has been saved");
    res.redirect("/urls");
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});