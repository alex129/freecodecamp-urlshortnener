require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');

//MONGOOSE
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const shortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
})

const shorturlModel = mongoose.model('shorturl', shortUrlSchema)

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: "false" }));
app.use(express.json());
app.use(express.raw());
app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

//SHORT URL
const router = express.Router();
router.use((req, res, next) => {
  if (req.body.url) {
    const urlDns = req.body.url.replace('https://', '').replace('http://').split('/')[0];
    dns.lookup(urlDns, function (err, addresses, family) {
      console.log(addresses);
      if (err)
        res.json({ error: 'invalid url' });
    });
  }
  next();
});
router.post('/shorturl', (req, res) => {
  if (req.body.url)
    shorturlModel.findOne({ original_url: req.body.url }, (err, shorturl) => {
      if (err || !shorturl) {
        shorturlModel.findOne({}).sort({ short_url: 'desc' }).exec((err, result) => {
          if (!err) {
            var shorturl = new shorturlModel({ original_url: req.body.url, short_url: result ? result.short_url + 1 : 1 });

            shorturl.save(function (err, data) {
              if (err) {
                console.log(err)
              }
              console.log(data)
              res.json({ original_url: data.original_url, short_url: data.short_url });
            });
          }
        });
      } else res.json({ original_url: shorturl.original_url, short_url: shorturl.short_url });
    });
});

router.get('/shorturl/:id', (req, res) => {
  shorturlModel.findOne({ short_url: req.params.id }, (err, result) => {
    if (result && !err)
      res.redirect(result.original_url);
    else
      res.json({ error: "No short URL found for the given input" });
  });
});

app.use('/api', router);
