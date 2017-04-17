const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const PORT = process.env.PORT || 8080; // binds to a port
const bcrypt = require("bcrypt");
const app = express();

const urlDatabase = {
  /*
  "b2xVn2": { userID: "user1RandomID", // key in user collection (userDatabase.userID)
              url: "http://www.lighthouselabs.ca" },
  "9sm5xK": { userID: "user2RandomID",
              url: "http://www.google.com" },
  "2lHEs5": { userID: "user1RandomID",
              url: "http://www.example.com"}
              */
};

const userDatabase = {
  "user1RandomID": { userID: "user1RandomID",
                     email: "user@example.com",
                     password: "test" },
  "user2RandomID": { userID: "user2RandomID",
                     email: "user2@example.com",
                     password: "test2" }
};


// configuration and middleware

app.set("view engine", "ejs");

app.use(cookieSession( {
  name: "session",
  keys: ["lighthouse"],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// *** Why does this break the site?? ***
// app.use((req, res) => {
//   res.locals.user = userDatabase[req.session.user_id];
//   req.user = userDatabase[req.session.user_id];
// });

app.use(bodyParser.urlencoded({ extended: true })); //false?

// confirm that visitor is logged in before continuing
app.use("/urls*?", (req, res, next) => {
  if (req.session.id) {
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

// home page
app.get("/", (req, res) => {
  let user = req.session.id;
  if (user) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");// *** add { error message:} and show that in template?
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// if logged in, show user's personal url index
app.get("/urls", (req, res) => {
  let templateVars = {
    userID: req.session.id,
    email: userDatabase[req.session.id].email, //***won't show email??***
    urls: urlsForUser(req.session.id)
  };
  console.log("\n GET '/urls' userDatabase = ", userDatabase);
  console.log("\n GET '/urls' req.session =\n", req.session);
  console.log("GET '/urls' templateVars =\n", templateVars);
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  var userID = req.session.id;
  var longURL = req.body.longURL;
  var shortURL = generateRandomString();

  if (shortURL && longURL) {
    urlDatabase[shortURL] = {
      userID: userID,
      url: longURL
    };
  }
  console.log("\n POST to '/urls' req.body = \n", req.body);
  console.log("urlDatabase should be updated:\n", urlDatabase);
  res.redirect("/urls/" + shortURL);
});

app.get("/urls/new", (req, res) => {
  let templateVars = {
    userID: req.session.id,
    //email: userDatabase[req.session.id].email, ***won't show email??***
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
    userID: req.session.id
  };
  console.log("GET '/urls/:id' templateVars: ", templateVars);
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  console.log("POST to '/test/submitURL' req.body.id = ", req.body.longURL);
  let userID = req.session.id; // *** fix this when checking for logged in status ***
  let longURL = req.body.longURL;
  let shortURL = generateRandomString();
  // check if ':id' exists in urlDatabase
  // check if ':id' matches owner
  if (longURL) { // *** This doesn't account for invalid input, just no input ***
    urlDatabase[shortURL] = {
      userID: userID,
      url: longURL
    };
    console.log("POST to '/urls/:id' urlDatabase should be updated:\n", urlDatabase);
    res.redirect("/urls/" + shortURL);
  } else {
    res.status(403).send("Type in a valid URL before submitting. Try again.");
  }
});

// available to general public - links shortURL with corresponding longURL
app.get("/u/:shortURL", (req, res) => {
  // let shortURL = ??
  let longURL = urlDatabase.shortURL.url;
  res.redirect(longURL);
});


// ----- User Registration/Login -----

app.get("/register", (req, res) => {
  if (req.session.id) {
    res.redirect('/');
  }
  res.render("register");
});

app.post("/register", (req, res) => { // *** Doesn't check for null values ***
  const newEmail = req.body.email;
  const newPassword = req.body.password;

  if (!newEmail || !newPassword) {
    return (() => {
      res.status(400).send("Bad email or password. Try again.");
    });
  }

  for (let key in userDatabase) {
    if (newEmail === userDatabase[key].email) {
      return (() => {
        res.status(400).send("Email already registered.");
      });
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
  // *** change '/test' to '/urls' ***
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  let loginEmail = req.body.email;
  let loginPassword = req.body.password;

  console.log("\n POST to '/login' req.body = \n", req.body);

  for (let key in userDatabase) {
    let user = userDatabase[key];
    if ((user.email === loginEmail) && (bcrypt.compareSync(loginPassword, user.password))) {
      req.session.id = user[userID];
      console.log("POST '/login' - User accepted. Redirecting to '/' ...");
      res.redirect("/");
    } else {
      console.log("POST '/login' - email or password does not match userDatabase");
      res.status(401).send('There is a problem with your email or password. <a href="/login">Click here to try logging in again.</a><br />New user? <a href="/register">Click here to register.</a>');
    }
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});