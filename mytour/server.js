require('dotenv').config();
const express      = require('express');
const path         = require('path');
const fs           = require('fs');
const cookieParser = require('cookie-parser');
const cors         = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'frontend', 'public');

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(PUBLIC));

// Debug route
app.get('/debug', (req, res) => {
  res.json({
    __dirname,
    PUBLIC,
    cssExists:  fs.existsSync(path.join(PUBLIC, 'css', 'style.css')),
    jsExists:   fs.existsSync(path.join(PUBLIC, 'js',  'app.js')),
    htmlExists: fs.existsSync(path.join(PUBLIC, 'index.html')),
  });
});

// API Routes
app.use('/api/auth',     require('./backend/routes/auth'));
app.use('/api/hotels',   require('./backend/routes/hotels'));
app.use('/api/bookings', require('./backend/routes/bookings'));
app.use('/api',          require('./backend/routes/misc'));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Route not found.' });
  }
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log('\n🚀  Mytour.vn  ->  http://localhost:' + PORT);
  console.log('📁  Static     ->  ' + PUBLIC);
  console.log('🗄️   DB Host    ->  ' + (process.env.DB_HOST || 'localhost'));
  console.log('\n✅  Mo trinh duyet: http://localhost:' + PORT + '\n');
});

module.exports = app;
