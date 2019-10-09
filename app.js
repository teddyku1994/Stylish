const express = require('express');
const path = require('path');
const app = express();
const productRouter = require('./routes/product');
const campaignRouter = require('./routes/marketing');
const accountRouter = require('./routes/account');
const checkoutRouter = require('./routes/checkout');
const PORT = 8080;

app.use(express.json());

// for body parser
const bodyPasrser = require('body-parser');
app.use(bodyPasrser.urlencoded({ extended: false }));
app.use(bodyPasrser.json());

  
// Routers
app.use('/', productRouter, campaignRouter);
app.use('/user', accountRouter);
app.use('/order', checkoutRouter);

// Pug Template
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Serve static files
app.use('/', express.static(path.join(__dirname, 'public')));

// App
app.get('/', (req, res) => {
});

// Admin Page
app.get('/admin', (req, res) => {
  res.redirect('/admin/product.html');
});

// Errors 
app.use((req, res, next) =>  {
  var err = new Error('Page not found');
  err.status = 404;
  next(err);
})

// Handling errors
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message);
});

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
