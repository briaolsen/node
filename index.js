const BlizzAPI = require("blizzapi");
const express = require("express");
const url = require("url");
const path = require("path");
const dotenv = require("dotenv");
const { get } = require("http");
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
const connectionString =
  process.env.DATABASE_URL ||
  "postgres://zvscnytvvthqcg:3976c888faa915b2940ddfe8223991fcc926aecaa2cc9a4a6877022af6b357a4@ec2-50-17-90-177.compute-1.amazonaws.com:5432/dcn3hmphnedhed";
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

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
  { slot: "Finger1", name: ["Finger"] },
  { slot: "Finger2", name: ["Finger"] },
  { slot: "Trinket1", name: ["Trinket"] },
  { slot: "Trinket2", name: ["Trinket"] },
  { slot: "Mainhand", name: ["Two-Hand", "One-Hand", "Main Hand"] },
  { slot: "Offhand", name: ["One-Hand", "Held in Off-hand", "Off Hand"] },
  { slot: "Ranged", name: ["RANGEDRIGHT", "Relic"] },
  { slot: "Quiver", name: ["Bag"] },
];

// WISHLIST FROM DATABASE
const wishlist = {
  name: "Fiyre",
  items:
    [
      {
        slot: "Shoulder", item: {
          id: 16932,
          name: 'Nemesis Spaulders',
          quality: 'EPIC',
          itemclass: 'Armor',
          itemsubclass: 'Cloth',
          inventorytype: 'SHOULDER',
          inventoryname: 'Shoulder',
          icon: 'https://render-classic-us.worldofwarcraft.com/icons/56/inv_shoulder_19.jpg'
        }
      }
    ]
};

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
 */
app.get("/", (req, res) => {

  if (req.session && req.session.username) {
    console.log(req.session.username);
    res.render("home", { page: "home", user: req.session.username, loginStatus: true });
  }
  else {
    res.render("home", { page: "home", loginStatus: false });
  }

});

/**
 * USER LOGOUT
 */
app.post('/logout', function (req, res) {
  if (req.session && req.session.username) {
    delete req.session.username;
    res.render("home", { page: "home", loginStatus: false });
  } else {
    res.end();
  }
});

/**
 * USER LOGIN
 */
app.post("/login", (req, results) => {

  const username = req.body.username;
  const password = req.body.password;
  console.log("attempting login...");
  let loginStatus = false;

  const sql = `SELECT * FROM users WHERE username = $1`;

  pool.query(sql, [username], function (err, result) {
    if (err) {
      console.log("User not found");
      console.log(err);
      return false;
    } else {
      bcrypt.compare(password, result.rows[0].hash, function (err, res) {
        loginStatus = res;
        if (loginStatus) {
          req.session.username = username;
        }
        results.json({ success: loginStatus, username: req.session.username });
      })
    }
  });
});

/**
 * CREATE AN ACCOUNT
 */
app.post("/createAccount", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  console.log("Username: " + username + " Password: " + password);
  let loginStatus = false;
  let message = "Error creating account";

  bcrypt.hash(password, saltRounds, (err, hash) => {

    const sql = `INSERT INTO users VALUES ($1, $2)`;

    pool.query(sql, [username, hash], function (err, result) {

      if (err) {
        console.log("Unable to create account");
        console.log(err);
        message = "Error in username or password";
      } else {
        loginStatus = true;
        req.session.username = username;
        message = "User " + req.session.username + " created.";
      }
      createWishlist(req.session.username, function(wishListID) {
        console.log("Created Wishlist with ID: " + wishListID);
        req.session.wishlistID = wishListID;
        console.log("Session.Wishlist: " + req.session.wishlistID);
      });
      
      res.json({ success: loginStatus, message: message, username: req.session.username });
    });
  });
});

/**
 * GET WISHLIST PAGE
 */
app.get("/wishlist", verifyLogin, (req, res) => {
  console.log(req.session.wishlistID);
  let loginStatus = false;
  if (req.session && req.session.username) {
    loginStatus = true;
  }
  res.render("wishlist", { slots: slots, server: this, username: req.session.username, page: "wishlist", loginStatus: loginStatus, user: req.session.username })
});

/**
 * GET DATABASE PAGE
 */
app.get("/database", verifyLogin, (req, res) => {
  let loginStatus = false;
  if (req.session && req.session.username) {
    loginStatus = true;
  }
  res.render("database", { page: "database", loginStatus: loginStatus })
});

/**
 * SEARCH ITEM BY ID USING BLIZZARD API
 */
app.get("/getItemById", async (req, res) => {
  const parts = url.parse(req.url, true);
  console.log(req.query);
  const id = req.query.id;
  console.log(id);
  let params = {};
  try {
    if (id) {
      const data = await api.query(
        "/data/wow/item/" + id + "?namespace=static-classic-us&locale=en_US"
      );
      console.log(data);

      params.id = data.id;
      params.name = data.name;
      params.quality = data.quality.type;
      params.itemClass = data.item_class.name;
      params.itemSubclass = data.item_subclass.name;
      params.inventoryType = data.inventory_type.type;
      params.inventoryName = data.inventory_type.name;

      const icon = await api.query(
        `/data/wow/media/item/${data.id}?namespace=static-classic-us&locale=en_US`
      );
      params.icon = icon.assets[0].value;

      res.json({ status: "success", data: params });
    } else {
      res.json({ status: "error", message: "Please enter an id" });
    }
  } catch {
    res.json({ status: "error", message: `Not a valid id: ${id}` });
  }
});

/**
 * GET ITEM BY NAME FROM DATABASE
 */
app.get("/getItemByName", (req, res) => {
  const parts = url.parse(req.url, true);
  const query = parts.query;
  const sql = `SELECT * FROM items WHERE name ~* $1`;

  pool.query(sql, [query.name], function (err, result) {
    if (err) {
      console.log("Error in query: " + err);
    } else {
      //console.log(result.rows);
      res.json(result.rows);
    }
  });
});

/**
 * INSERT ITEM INTO DATABASE
 */
app.post("/insertItemDatabase", (req, res) => {
  console.log("Item is being inserted...");
  console.log(req.body);
  const data = req.body;
  console.log(data.id);
  console.log(data.slot);

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
      data.icon
    ],
    function (err, result) {
      if (err) {
        console.log("Error in query: ");
        console.log(err);
      } else {
        res.redirect("database");
      }
    }
  );
});


/**
 * RETURN AN ITEM FROM A WISHLIST SLOT
 */
function getItemFromWishlist(slot, username, callback) {

  const sql = `SELECT ${slot} from WISHLIST where username = '${username}';`;

  pool.query(sql, function (err, result) {
    if (err) {
      console.log("Error in getDatabase query: ");
      console.log(err);
    } else {
      callback(result.rows[0]);
    }
    
  });
}

/**
 * RETURN THE ITEM DATABASE
 */
app.get("/getDatabase", (req, res) => {
  const sql = "SELECT * FROM items";
  pool.query(sql, function (err, result) {
    if (err) {
      console.log("Error in getDatabase query: ");
      console.log(err);
    }
    //console.log(result.rows);
    res.json(result.rows);
  });
});

/**
 * RETURN THE WIHLIST
 */
app.get("/getWishlist", (req, res) => {
  const sql = `SELECT * FROM wishlist WHERE username = '${req.session.username}'`;
  pool.query(sql, function (err, result) {
    if (err) {
      console.log("Error in getWishlist query: ");
      console.log(err);
    } else {
      res.json(result.rows[0]);
    }
  });
});


/**
 * FIND THE SLOT THE ITEM SHOULD BE INSERTED INTO
 */
function getSlot(id, callback) {

  const sql = `SELECT * FROM items WHERE id = ${id}`;
  let type = "";
  let name = "";

  pool.query(sql, function (err, result) {
    if (err) {
      console.log("Error in getSlot query: " + err);
    } else {
      type = result.rows[0].inventorytype;
      name = result.rows[0].inventoryname;
      console.log("1Type: " + type + " Name: " + name);

      for (var i = 0; i < slots.length; i++) {
        if (slots[i].name.includes(type) || slots[i].name.includes(name)) {
          console.log("Found slot!");
          callback(slots[i].slot);
        }
      }
    }
  });
}

/**
 * INSERT ITEM INTO WISHLIST
 */
app.post("/insertItemWishlist", async function (req, res) {
  console.log("Item is being inserted into wishlist...");
  console.log(req.body);
  const data = req.body;
  getSlot(data.id, function (slot) {
    slot = slot.toLowerCase();
    console.log("Slot: " + slot);
    const sql = `UPDATE wishlist SET ${slot} = ${data.id} WHERE username = '${req.session.username}' RETURNING *;`;
    
    pool.query(
      sql, 
      function (err, result) {
        if (err) {
          console.log("Error in insertItemWishlist query: ");
          console.log(err);
        } else {
          console.log("Item inserted into wishlist.");
          res.json(result.rows);
        }
      }
    );
  });
});


/**
 * CREATE A WISHLIST FOR THE USERNAME
 */
function createWishlist(username, callback) {
  console.log("Creating wishlist...");

  const sql = `INSERT INTO wishlist (username) VALUES ($1) RETURNING id`;

  pool.query(sql, [username], function (err, result) {

    if (err) {
      console.log("Error in createWishlist query: ");
      console.log(err);
    } else {
      callback(result.rows[0].id) ;
    }
  });
}

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

module.exports.getItemFromWishlist = getItemFromWishlist;