
const express = require('express')
const url = require('url')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  //.use(express.static(path.join(__dirname, 'public')))
  .use(express.static("public"))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('/getRate'))
  .get('/getRate', (req, res) => {
    const parts = url.parse(req.url, true);
    const query = parts.query;
    var cost = 0;
    let params = {};
    if ( query.mail && ['stamped', 'metered', 'flats', 'retail'].includes(query.mail) && !isNaN(parseFloat(query.weight))) {
      var subResult = calculateRate(query.mail, query.weight)
      params.input = prepareQuery(query.mail);
      if (isNaN(subResult)) {
        params.result = subResult;
        params.input = "";
      } else {
        params.result = "$" + subResult.toFixed(2);
        params.input = query.weight + " oz " + prepareQuery(query.mail);
      }
    }
    res.setHeader('Content-Type', 'text/html');
    res.render('pages/response', params)
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
  
  function prepareQuery(mailType) {
    switch (mailType) {
      case  "stamped":
        return  "Letter (stamped)";
      case  "metered":
        return  "Letter (metered)";
      case  "flats":
        return  "Large Envelope (flats)";
      case  "retail":
        return  "First-Class Package Service - Retail";
      default:
        return null;
    }
  }

  function calculateRate(mailType, weight) {
  
    switch (mailType) {
      case "stamped":
        return stamped(weight);
      case "metered":
        return metered(weight);
      case "flats":
        return flats(weight);
      case "retail":
        return retail(weight);
      default:
        return null;
    }
  }
  
  function stamped(weight) {

    if (weight >= 3.5) {
      return "Too heavy: consider using large envelope";
    }

    var rate = .55;
    for (var i = 1; i < weight; i++) {
      rate += .15;
    }
    return rate;
  }
  
  function metered(weight) {

    if (weight > 3.5) {
      return "Too heavy: consider using large envelope";
    }

    var rate = .50;
    for (var i = 1; i < weight; i++) {
      rate += .15;
    }
    return rate;
  }
  
  function flats(weight) {

    if (weight > 13) {
      return "Too heavy: considered using package"
    }

    var rate = 1;
    for (var i = 1; i < weight; i++) {
      rate += .2;
    }
    return rate;
  }

  function retail(weight) {

    if (weight > 13) {
      return "Too heavy: unable to calculate price"
    }

    var rate = 3.80;

    if (weight > 4) {
      rate += .8;
    }

    if (weight > 8) {
      rate += .7;
    }

    if(weight > 12) {
      rate += .6;
    }
    return rate;
  }