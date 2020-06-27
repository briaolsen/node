const BlizzAPI = require('blizzapi');
const express = require('express');
const url = require('url');
const path = require('path');
const dotenv = require("dotenv");
const { get } = require('http');
dotenv.config();
request = require("request");

const app = express()
const port = 3000

// Found in a file named .env in the project root
// BLIZZARD_API_CLIENT_ID="client id"
// BLIZZARD_API_CLIENT_SECRET="client secret"
const api = new BlizzAPI({
    region: 'us',
    clientId: process.env.BLIZZARD_API_CLIENT_ID,
    clientSecret: process.env.BLIZZARD_API_CLIENT_SECRET
});

app.set('view engine', 'ejs')
app.get('/', (req, res) =>res.render('wishlist'));


app.get('/getItem', (req, res) => {
  const parts = url.parse(req.url, true);
  const query = parts.query;
  let params = {};
  if (query.itemNum) {
    
    //params = getItem(query.itemNum);
    //params.itemNum = "3";
    params.itemNum = query.itemNum;
    //params.name = "" + 
    params.name = getName(query.itemNum);
    //params.name = "hi";
    //params.icon = 
    params.icon = getIcon(query.itemNum);
    /*
    const data =  await api.query('/data/wow/item/'+ itemNum + '?namespace=static-us&locale=en_US');
    params.name = `${data.name}`;
    params.id = `${data.id}`;
    const icon =   await api.query(`/data/wow/media/item/${data.id}?namespace=static-us&locale=en_US`);
    params.icon = `<a href="https://classic.wowhead.com/?item=${data.id}"><img src="${icon.assets[0].value}" border="2"></a><br>
    <script>const whTooltips = {colorLinks: true, iconizeLinks: false, renameLinks: false};</script>
    <script src="https://wow.zamimg.com/widgets/power.js"></script>
    `;*/
  }

  res.setHeader('Content-Type', 'text/html');
  res.render('item', params);

})


function getName(itemNum) {  
  const data =  await api.query('/data/wow/item/'+ itemNum + '?namespace=static-us&locale=en_US');
  return data.name;
  /*
  params.name = `${data.name}`;
  params.id = `${data.id}`;
  const icon =   await api.query(`/data/wow/media/item/${data.id}?namespace=static-us&locale=en_US`);
  params.icon = `<a href="https://classic.wowhead.com/?item=${data.id}"><img src="${icon.assets[0].value}" border="2"></a><br>
  <script>const whTooltips = {colorLinks: true, iconizeLinks: false, renameLinks: false};</script>
  <script src="https://wow.zamimg.com/widgets/power.js"></script>
  `;

  return params;*/
}

async function getIcon(itemNum) {
  const iconAPI =   await api.query(`/data/wow/media/item/` + itemNum + `?namespace=static-us&locale=en_US`);

  let icon = `<a href="https://classic.wowhead.com/?item=` + itemNum + `"><img src="${icon.assets[0].value}" border="2"></a><br>
  <script>const whTooltips = {colorLinks: true, iconizeLinks: false, renameLinks: false};</script>
  <script src="https://wow.zamimg.com/widgets/power.js"></script>
  `;

  return icon;
}

app.get('/get', async (req, res) => {
    try {
        const data = await api.query(`/data/wow/item/19019?namespace=static-us&locale=en_US`);
        console.log(data);
        console.log("ITEM CLASS::: " + JSON.stringify(data.preview_item.stats.type))

        const icon = await api.query(`/data/wow/media/item/${data.id}?namespace=static-us&locale=en_US`);
        //console.log(icon);

        doc = `
        <h3>${data.name}</h3>
        <a href="https://classic.wowhead.com/?item=${data.id}"><img src="${icon.assets[0].value}" border="2"></a><br>
        <script>const whTooltips = {colorLinks: true, iconizeLinks: false, renameLinks: false};</script>
        <script src="https://wow.zamimg.com/widgets/power.js"></script>
        `;

        //res.send(doc);
        console.log(doc);

        //=> '<!doctype html> ...'
    } catch (error) {
        res.status(error.status).send(error.response.body);
        //=> 'Internal server error ...'
    }
})


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})