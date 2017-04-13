const express = require("express");
const app = express(); // This is a function that returns an object
const cookieParser = require("cookie-parser");
const ejsLint = require("ejs-lint");
var PORT = process.env.PORT || 8080; // binds to a port

// Configuration
app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

// Middleware
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// handle GET/POST on each of these paths
app.get("/", (req, res) => {
  res.end("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = { shortURL: req.params.id, longURL: urlDatabase[req.params.id] };
  res.render("urls_show", templateVars);
});

app.get("/urls/new", (req, res) => {
  let templateVars = { username: req.cookies["username"] };
  res.render("urls_new", templateVars);
});

// Does sorting order matter for GET and POST?
app.post("/urls", (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = longURL;
  res.redirect("/urls");
});

// redirect to corresponding longURL
/* Edge cases to consider:
 - What would happen if a client requests a non-existent shortURL?
 - What happens to the urlDatabase when the server is restarted?
 - Should your redirects be 301 or 302 - What is the difference?
*/
app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

// delete existing shortURLs
app.post("/urls/:id/delete", (req, res) => {
  let templateVars = { shortURL: req.params.id };
  delete urlDatabase[templateVars.shortURL];
    res.redirect("/urls");
});

// Implement 'Update' operation
app.post("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  let longURL = req.body.longURL;
  urlDatabase[shortURL] = longURL;
  res.redirect("/urls");
});

app.post("/login", function(req, res) {
  var user = users.find(function(user) {
  return user.username = username;
  res.redirect("urls/");
  });
});

app.post("/logout", function(req, res) {
  //req.session = null;
  res.clearCookie("usernme");
  res.redirect("/login");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

function generateRandomString(){
  let randomString = '';
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 6; i > 0; --i) {
    randomString += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return randomString;
}