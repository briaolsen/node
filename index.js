const BlizzAPI = require("blizzapi");
const express = require("express");
const url = require("url");
const path = require("path");
const dotenv = require("dotenv");
const { get } = require("http");
dotenv.config();
request = require("request");

const app = express();
const port = process.env.PORT || 5000;

const api = new BlizzAPI({
  region: "us",
  clientId: process.env.BLIZZARD_API_CLIENT_ID,
  clientSecret: process.env.BLIZZARD_API_CLIENT_SECRET,
});

app.set("view engine", "ejs");
app.get("/", (req, res) => res.render("wishlist"));


// SEARCH ITEM BY ID
app.get("/getItem", async (req, res) => {
  const parts = url.parse(req.url, true);
  const query = parts.query;
  let params = {};
  if (query.itemNum) {
    const data = await api.query(
      "/data/wow/item/" + query.itemNum + "?namespace=static-us&locale=en_US"
    );
    params.name = data.name;
    params.id = data.id;
    const icon = await api.query(
      `/data/wow/media/item/${data.id}?namespace=static-us&locale=en_US`
    );
    params.icon = icon.assets[0].value;
    console.log(data);
  }

  res.setHeader("Content-Type", "text/html");
  res.render("item", params);
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

app.get("/insertItem", (req, res) => {
  const parts = url.parse(req.url, true);
  const query = parts.query;
  const sql = `INSERT INTO item (id, name, icon) VALUES ($1, $2, $3)`;

  pool.query(sql, [query.id, query.name, query.icon], function (err, result) {
    if (err) {
      console.log("Error in query: ");
      console.log(err);
    } else {
      res.setHeader("Content-Type", "text/html");
      res.render("database");
    }
  });
});


// SHOW DATABASE
app.get("/database", (req, res) => {

  const sql = 'SELECT * FROM item';
  pool.query(sql, function(err, result) {
  if(err) {
    if (err) {
      console.log("Error in query: ")
      console.log(err);
        }
        
        console.log("Found result: " + JSON.stringify(result.rows));

        res.send(result.rows);
    }
  })

}

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
