const BlizzAPI = require("blizzapi");
const express = require("express");
const url = require("url");
const path = require("path");
const dotenv = require("dotenv");
const { get } = require("http");
const bodyParser = require("body-parser");
dotenv.config();
request = require("request");

const app = express();
const port = process.env.PORT || 5000;

const api = new BlizzAPI({
  region: "us",
  clientId: process.env.BLIZZARD_API_CLIENT_ID,
  clientSecret: process.env.BLIZZARD_API_CLIENT_SECRET,
});

const slots = [
  {slot: 'Head',      name:'Head'},
  {slot: 'Neck',      name:'Neck'},
  {slot: 'Shoulder',  name:'Shoulder'},
  {slot: 'Back'},
  {slot: 'Chest',     name: 'Chest'},
  {slot: 'Wrist',     name: 'Wrist'},
  {slot: 'Hands',     name: 'Hands'},
  {slot: 'Waist',     name: 'Waist'},
  {slot: 'Legs',      name: 'Legs'},
  {slot: 'Feet',      name: 'Feet'},
  {slot: 'Finger1',   name: 'Finger'},
  {slot: 'Finger2',   name: 'Finger'},
  {slot: 'Trinket1',  name: 'Trinket'},
  {slot: 'Trinket2',  name: 'Trinket'},
  {slot: 'Mainhand',  name: [{name:'Two-Hand'}, {name:'One-Hand'}, {name: 'Main Hand'}]},
  {slot: 'Offhand'},
  {slot: 'Ranged',    name: [{name:'RANGEDRIGHT'}, {name:'Relic'}]},
  {slot: 'Quiver'}
]

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.get("/", (req, res) => res.render("home"));
app.get("/wishlist", (req, res) => res.render("wishlist", {slots: slots}));
app.get("/database", (req, res) => res.render("database"));

app.get("/login", (req, res)=> {

    // login user and import wishlist 

    //res.setHeader("Content-Type", "text/html");
    res.render("/wishlist");

});

// SEARCH ITEM BY ID
app.get("/getItemById", async (req, res) => {
  const parts = url.parse(req.url, true);
  const id = req.query.id;
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

      res.json({ status: 'success', data: params });
    } else {
      res.json({ status: 'error', message: 'Please enter an id' });
    }
  } catch {
    res.json({ status: 'error', message: `Not a valid id: ${id}` });
  }
});

// INSERT ITEM AFTER SEARCH
const { Pool } = require("pg");
const connectionString =
  process.env.DATABASE_URL ||
  "postgres://zvscnytvvthqcg:3976c888faa915b2940ddfe8223991fcc926aecaa2cc9a4a6877022af6b357a4@ec2-50-17-90-177.compute-1.amazonaws.com:5432/dcn3hmphnedhed";
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});


// RETURN ITEM USING NAME
app.get("/getItemByName", (req, res) => {
  const parts = url.parse(req.url, true);
  const query = parts.query;
  const sql = `SELECT * FROM item WHERE name ~* $1`;

  pool.query(sql, [query.name], function (err, result) {
    if (err) {
      console.log("Error in query: " + err);
    } else {
      console.log(result.rows);
      res.json(result.rows);
    }
  });
});

// INSERT ITEM INTO DATABASE
app.post("/insertItemDatabase", (req, res) => {
  console.log("Item is being inserted...");
  console.log(req.body);
  const data = req.body;
  console.log(data.id);
  /*params = [];
  params[id] = data.id;
  params[name] = data.name;
  params[quality] = data.quality;
  params[itemClass] = data.itemClass;
  params[itemSubclass] = data.itemSubclass;
  params[inventoryType] = data.inventoryType;
  params[inventoryName] = data.inventoryName;
  params[icon] = data.icon;*/

  const sql = `INSERT INTO items VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

  pool.query(sql, [data.id, data.name, data.quality, data.itemClass, data.itemSubclass, data.inventoryType, data.inventoryName, data.icon], function (err, result) {
    if (err) {
      console.log("Error in query: ");
      console.log(err);
    } else {
      res.redirect("database");
    }
  });
});


// SHOW DATABASE
app.get("/getDatabase", (req, res) => {

  const sql = 'SELECT * FROM items';
  pool.query(sql, function (err, result) {

    if (err) {
      console.log("Error in query: ")
      console.log(err);
    }

    console.log(result.rows);
    res.json(result.rows);
    //res.setHeader("Content-Type", "text/html");
    //res.render("database");
  });
});

// INSERT ITEM INTO WISHLIST
app.post("/insertItemWishlist", (req, res) => {
  console.log("Item is being inserted into wishlist...");
  console.log(req.body);
  const data = req.body;
  console.log(data.id);
  /*params = [];
  params[id] = data.id;
  params[name] = data.name;
  params[quality] = data.quality;
  params[itemClass] = data.itemClass;
  params[itemSubclass] = data.itemSubclass;
  params[inventoryType] = data.inventoryType;
  params[inventoryName] = data.inventoryName;
  params[icon] = data.icon;*/

  const sql = `INSERT INTO wishlist VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

  pool.query(sql, [data.id, data.name, data.quality, data.itemClass, data.itemSubclass, data.inventoryType, data.inventoryName, data.icon], function (err, result) {
    if (err) {
      console.log("Error in query: ");
      console.log(err);
    } else {
      res.redirect("database");
    }
  });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});


