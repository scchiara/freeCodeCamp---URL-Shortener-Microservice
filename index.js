require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('node:dns');
const { URL } = require('node:url');
const { type } = require('express/lib/response');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Basic Configuration
const port = process.env.PORT || 3000;

const URLSchema = mongoose.Schema({
  original_url: {type: String, required: true, unique: true},
  short_url: {type: String, required: true, unique: true}
});

let URLModel = mongoose.model('url', URLSchema);

app.use("/", bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint

app.get('/api/shorturl/:short_url', function(req, res) {
  let short_url = req.params.short_url;

  // find original url from mongo
  URLModel.findOne({short_url: short_url}).then((foundURL) => {
   
    if(foundURL) {
      let original_url = foundURL.original_url;
      res.redirect(original_url);
    }
    // original url not found
    else {
      res.json({mag: "shorturl not exist"});
    }
    
    return;
  });
});

app.post('/api/shorturl', function(req, res) {
  let url = req.body.url;

  // validate url
  try {
    urlObj = new URL(url); 
    dns.lookup(urlObj.hostname, (err, address, family) => {
      // DNS domain not exist, no address returned
      if(!address) {
        res.json({ error: 'Invalid url' });
      } 
      // valid url
      else {
        let original_url = urlObj.href;

        // url not exist in mongo
        URLModel.findOne({original_url: original_url}).then(
          (foundURL) => {
            if(foundURL) {
              res.json({
                original_url: foundURL.original_url,
                short_url: foundURL.short_url
              });
            }

            // create shorturl and add to mongo
            else {
              let short_url = 1;
        
              // get last shorturl
              URLModel.find({}).sort({short_url: "desc"}).limit(1).then(
                (lastURL) => {
                  if(lastURL.length > 0) {
                    // increment last shorturl adding 1
                    short_url = parseInt(lastURL[0].short_url) + 1;
                  }

                  resObj = {
                    original_url: original_url,
                    short_url: short_url
                  }

                  // insert into mongo
                  let newURL = new URLModel(resObj);
                  newURL.save();
                  res.json(resObj);
                }
              )
            }
          }
        )

                
      }
    });
  }
  // invalid format url
  catch {
    res.json({ error: 'Invalid url' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
