const BlizzAPI = require("blizzapi");
const express = require("express");
const url = require("url");
const path = require("path");
const dotenv = require("dotenv");
//const { get } = require("http");
const bodyParser = require("body-parser");
dotenv.config();
request = require("request");
var session = require("express-session");
var FileStore = require("session-file-store")(session);
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();
const port = process.env.PORT || 5000;

const api = new BlizzAPI({
  region: "us",
  clientId: process.env.BLIZZARD_API_CLIENT_ID,
  clientSecret: process.env.BLIZZARD_API_CLIENT_SECRET,
});

// INSERT ITEM AFTER SEARCH
const { Pool } = require("pg");
const { doesNotMatch } = require("assert");
const { resolveSoa } = require("dns");
const { checkServerIdentity } = require("tls");
const connectionString =
  process.env.DATABASE_URL ||
  "postgres://zvscnytvvthqcg:3976c888faa915b2940ddfe8223991fcc926aecaa2cc9a4a6877022af6b357a4@ec2-50-17-90-177.compute-1.amazonaws.com:5432/dcn3hmphnedhed";
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ARRAY OF POTENTIAL SLOTS AND WHAT THEY COULD BE CALLED
const slots = [
  { slot: "Head", name: ["Head"] },
  { slot: "Neck", name: ["Neck"] },
  { slot: "Shoulder", name: ["Shoulder"] },
  { slot: "Back", name: ["Back"] },
  { slot: "Chest", name: ["Chest"] },
  { slot: "Wrist", name: ["Wrist"] },
  { slot: "Hands", name: ["Hands"] },
  { slot: "Waist", name: ["Waist"] },
  { slot: "Legs", name: ["Legs"] },
  { slot: "Feet", name: ["Feet"] },
  { slot: "Finger", name: ["Finger"] },
  { slot: "Trinket", name: ["Trinket"] },
  { slot: "Mainhand", name: ["Two-Hand", "One-Hand", "Main Hand"] },
  { slot: "Offhand", name: ["One-Hand", "Held In Off-hand", "Off Hand"] },
  { slot: "Ranged", name: ["RANGEDRIGHT", "Relic"] },
  { slot: "Quiver", name: ["Bag"] },
];

/**
 * Setup the session store
 */
app.use(
  session({
    name: "server-session-cookie-id",
    secret: "SDfimf3409masdc0923imasdfmp",
    saveUninitialized: true,
    resave: true,
    store: new FileStore(),
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

/**
 * Create a logger middleware
 */
var verifyLogin = function (req, res, next) {
  if (req.session && req.session.username) {
    console.log("Logged in as " + req.session.username);
    next();
  } else {
    res.render("home", { page: "home", loginStatus: false });
  }
};

/**
 * Default Page
 * - render home.ejs depending on login status
 */
app.get("/", (req, res) => {
  if (req.session && req.session.username) {
    console.log(req.session.username);
    res.render("home", {
      page: "home",
      username: req.session.username,
      loginStatus: true,
    });
  } else {
    res.render("home", { page: "home", loginStatus: false });
  }
});

/**
 * USER LOGOUT
 * - logs out the user and sends them to the home page
 */
app.post("/logout", function (req, res) {
  if (req.session && req.session.username) {
    delete req.session.username;
    res.render("home", { page: "home", loginStatus: false });
  } else {
    res.end();
  }
});

/**
 * USER LOGIN
 * - checks username and password from the database
 * - sends the username and results back to the home page
 */
app.post("/login", (req, results) => {
  const username = req.body.username;
  const password = req.body.password;
  console.log("attempting login...");
  let loginStatus = false;
  let message = "";
  const sql = `SELECT * FROM users WHERE username = $1`;

  // checks for username and password combo in database
  pool.query(sql, [username], function (err, result) {
    if (err) {
      console.log("User not found");
      console.log(err);
      loginStatus = false;
      message = "Error in login";
      return false;
    } else {
      // compare username and password with database results
      bcrypt.compare(password, result.rows[0].hash, function (err, res) {
        loginStatus = res;
        if (loginStatus) {
          req.session.username = username;
          message = "Success";
        } else {
          message = "Login Unsuccessful";
        }
        results.json({
          success: loginStatus,
          message: message,
          username: req.session.username,
        });
      });
    }
  });
});

/**
 * CREATE AN ACCOUNT
 * - creates an account with a new username and password
 * - logs the user in once created
 * - also creates a new empty wishlist for that account
 */
app.post("/createAccount", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  console.log("Username: " + username + " Password: " + password);
  let loginStatus = false;
  let message = "Error creating account";

  // creates a hash for the password
  bcrypt.hash(password, saltRounds, (err, hash) => {
    const sql = `INSERT INTO users VALUES ($1, $2)`;
    let message = "";

    // attempts to insert username and password into database
    pool.query(sql, [username, hash], function (err, result) {
      if (err) {
        // username/password unavailable
        console.log("Unable to create account");
        console.log(err);
        message = "Username unavailable";
        loginStatus = false;
        res.json({ success: loginStatus, message: message, username: null });
      } else {
        // logs in user
        loginStatus = true;
        req.session.username = username;
        message = "User " + req.session.username + " created.";

        // create a new wishlist for a new account
        createWishlist(req.session.username, function (wishListID) {
          console.log("Created Wishlist with ID: " + wishListID);
          req.session.wishlistID = wishListID;
          console.log("Session.Wishlist: " + req.session.wishlistID);
        });
        res.json({
          success: loginStatus,
          message: message,
          username: req.session.username,
        });
      }
    });
  });
});

/**
 * GET WISHLIST PAGE
 * - returns the wishlist to the page so it can be
 * - shown on the UI
 */
app.get("/wishlist", verifyLogin, (req, res) => {
  // checks to see if user is signed in
  console.log(req.session.wishlistID);
  let loginStatus = false;
  if (req.session && req.session.username) {
    loginStatus = true;
  }

  let wishlist = "";

  // returns the wishlist, slots array, login status, username,
  // and current user's wishlist
  getWishlist(req.session.username, function (data) {
    wishlist = data;
    console.log("here is my wishlist: ");
    console.log(wishlist);
    res.render("wishlist", {
      slots: slots,
      server: this,
      page: "wishlist",
      loginStatus: loginStatus,
      username: req.session.username,
      wishlist: wishlist,
    });
  });
});

/**
 * GET DATABASE PAGE
 * - renders the database on the database page
 */
app.get("/database", verifyLogin, (req, res) => {
  let loginStatus = false;
  if (req.session && req.session.username) {
    loginStatus = true;
  }
  res.render("database", { page: "database", loginStatus: loginStatus, username: req.session.username});
});

/**
 * RETURN THE ITEM DATABASE
 * - returns all items in the database
 */
app.get("/getDatabase", (req, res) => {
  const sql = "SELECT * FROM items";
  pool.query(sql, function (err, result) {
    if (err) {
      console.log("Error in getDatabase query: ");
      console.log(err);
    }
    res.json(result.rows);
  });
});

/**
 * SEARCH ITEM BY ID USING BLIZZARD API
 * - uses blizzard api to look for particular item by id
 */
app.get("/getItemById", async (req, res) => {
  const parts = url.parse(req.url, true);
  console.log(req.query);
  const id = req.query.id;
  console.log(id);
  let params = {};
  try {

    // queries the blizzard api for item
    if (id) {
      const data = await api.query(
        "/data/wow/item/" + id + "?namespace=static-classic-us&locale=en_US"
      );

      // stores item information in parameters
      params.id = data.id;
      params.name = data.name;
      params.quality = data.quality.type;
      params.itemClass = data.item_class.name;
      params.itemSubclass = data.item_subclass.name;
      params.inventoryType = data.inventory_type.type;
      params.inventoryName = data.inventory_type.name;

      // gets the icon image address from other blizzard api
      const icon = await api.query(
        `/data/wow/media/item/${data.id}?namespace=static-classic-us&locale=en_US`
      );
      params.icon = icon.assets[0].value;

      // returns the item information
      res.json({ status: "success", data: params });
    } else {
      res.json({ status: "error", message: "Please enter an id" });
    }
  } catch {
    // query fails 
    res.json({ status: "error", message: `Not a valid id: ${id}` });
  }
});

/**
 * GET ITEM BY NAME FROM DATABASE
 * - queries app database for item looking by name and returns results
 */
app.get("/getItemByName", (req, res) => {
  const parts = url.parse(req.url, true);
  const query = parts.query;
  const sql = `SELECT * FROM items WHERE name ~* $1`;

  pool.query(sql, [query.name], function (err, result) {
    if (err) {
      console.log("Error in getItemByName query: " + err);
    } else {
      res.json(result.rows);
    }
  });
});

/**
 * INSERT ITEM INTO DATABASE
 * - inserts the item into the database using all the params from request
 */
app.post("/insertItemDatabase", (req, res) => {
  console.log("Item is being inserted...");
  const data = req.body;
  let status = false;
  let message = "";

  const sql = `INSERT INTO items VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

  pool.query(
    sql,
    [
      data.id,
      data.name,
      data.quality,
      data.itemClass,
      data.itemSubclass,
      data.inventoryType,
      data.inventoryName,
      data.icon,
    ],
    function (err, result) {
      if (err) {
        // Error in query
        console.log("Error in insertItemDatabase query: ");
        console.log(err);
        status = false;
        message = "Error. Item is either already in the database or does not exist.";
        res.json({ status: status, message: message });
      } else {
        status = true;
        message = "Item added to database";
        res.json({ status: status, message: message });
      }
    }
  );
  
});

/**
 * RETURN THE WISHLIST
 * - queries database for user's wishlist
 */
function getWishlist(username, callback) {
  const sql = `SELECT * FROM wishlist WHERE username = '${username}'`;
  pool.query(sql, function (err, result) {
    if (err) {
      console.log("Error in getWishlist query: ");
      console.log(err);
    } else {
      callback(result.rows[0]);
    }
  });
}

/**
 * GET SLOT
 * - finds the slot the item should be inserted into
 * - uses the slots array 
 */
function getSlot(id, callback) {
  const sql = `SELECT * FROM items WHERE id = ${id}`;
  let type = "";
  let name = "";

  pool.query(sql, function (err, result) {
    if (err) {
      console.log("Error in getSlot query: " + err);
    } else {
      // item will be in slot according to either inventory type or name
      type = result.rows[0].inventorytype;
      name = result.rows[0].inventoryname;

      // returns the slot if found in the slots array
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].name.includes(type) || slots[i].name.includes(name)) {
          callback(slots[i].slot);
        }
      }
    }
  });
}

/**
 * INSERT ITEM INTO WISHLIST
 * - inserts the item into the wishlist
 */
app.post("/insertItemWishlist", function (req, res) {
  console.log("Item is being inserted into wishlist...");
  const data = req.body;
  getSlot(data.id, function (slot) {
    // updates the user's wishlist in the correct slot column
    slot = slot.toLowerCase();
    const sql = `UPDATE wishlist SET ${slot} = ${data.id} WHERE username = '${req.session.username}' RETURNING *;`;

    pool.query(sql, function (err, result) {
      if (err) {
        console.log("Error in insertItemWishlist query: ");
        console.log(err);
      } else {
        // returns the id of the item inserted into the wishlist to update UI
        console.log("Item inserted into wishlist.");
        res.json({slot: slot, id: data.id});
      }
    });
  });
});

/**
 * REMOVE ITEM FROM WISHLIST
 * - removes an item from the user's wishlist by setting column to null
 */
app.post("/removeItemWishlist", async function (req, res) {
  console.log("Item is being removed from wishlist...");
  const slot = req.body.slot;

  const sql = `UPDATE wishlist SET ${slot} = NULL WHERE username = '${req.session.username}';`;

  pool.query(sql, function (err, result) {
    if (err) {
      console.log("Error in removeItemWishlist query: ");
      console.log(err);
    } else {
      console.log("Item removed from wishlist.");
    }
  });
});

/**
 * CREATE A WISHLIST
 * - creates a new wishlist for a brand new user
 */
function createWishlist(username, callback) {
  console.log("Creating wishlist...");

  const sql = `INSERT INTO wishlist (username) VALUES ($1) RETURNING id`;

  pool.query(sql, [username], function (err, result) {
    if (err) {
      console.log("Error in createWishlist query: ");
      console.log(err);
    } else {
      callback(result.rows[0].id);
    }
  });
}

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

