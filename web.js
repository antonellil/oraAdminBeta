//Modules
//----------------------------------------------------------------------------------
var express = require("express");
var pg = require('pg');
var hbs = require('hbs');

//Local files
//----------------------------------------------------------------------------------
var hash = require('./pass').hash
var venue = require('./venue');
var special = require('./special');

//Global variables
//----------------------------------------------------------------------------------
var app = express();
var users = {
  louis: { username: 'louis' }
};

//App initiation
//----------------------------------------------------------------------------------
app.set('view engine', 'html');
app.set('jsonp callback', true);
app.engine('html', hbs.__express);
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser('shhhh, very secret'));
app.use(express.session());
app.use(express.static(__dirname + '/public'));

//Session persistent message middleware
//----------------------------------------------------------------------------------
app.use(function(req, res, next){
	var err = req.session.error
	, msg = req.session.success;
	delete req.session.error;
	delete req.session.success;
	res.locals.message = '';
	if (err) res.locals.message = err;
	if (msg) res.locals.message = msg;
	next();
});

//Hash password - TODO pull user from database
//----------------------------------------------------------------------------------
hash('foobar', function(err, salt, hash){
  if (err) throw err;
  users.louis.salt = salt;
  users.louis.hash = hash;
});

//Authentication functions
//----------------------------------------------------------------------------------
function authenticate(name, pass, fn) {
	console.log('authenticating %s:%s', name, pass);
	var user = users[name];
	// query the db for the given username
	if (!user) return fn(new Error('cannot find user'));
	// apply the same algorithm to the POSTed password, applying
	// the hash against the pass / salt, if there is a match we
	// found the user
	hash(pass, user.salt, function(err, hash){
		if (err) return fn(err);
		if (hash == user.hash) return fn(null, user);
		fn(new Error('invalid password'));
	})
}

function restrict(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		req.session.error = 'Access denied!';
		res.redirect('/');
	}
}

//Admin application routing
//----------------------------------------------------------------------------------
app.get('/', function(req, res) {
	res.render('index');
});

app.get('/admin', restrict, function(req, res) {
   res.render('admin');
});

app.get('/logout', function(req, res){
	req.session.destroy(function(){
		res.redirect('/');
	});
});

app.post('/login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
      // Regenerate session when signing in to prevent fixation 
      req.session.regenerate(function(){
        // Store the user in the session store to be retrieved
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.username;
        res.redirect('/admin');
      });
    } else {
      req.session.error = 'Authentication failed';
      res.redirect('/');
    }
  });
});

//Public API Routing
//----------------------------------------------------------------------------------
app.get('/venues', venue.getAll);
app.get('/venue/:id', venue.getVenue);
app.get('/specials', special.getAll);
app.get('/special/:id', special.getSpecial);
app.get('/specials/venue', special.getSpecialsVenue);
app.get('/venueyelp', venue.yelpVenue);

//Restricted API Routing
//----------------------------------------------------------------------------------
app.post('/venueAdd', restrict, venue.addVenue);
app.post('/specialAdd', restrict, special.addSpecial);
app.post('/specialDelete', restrict, special.deleteSpecial);
app.post('/venueDelete', restrict, venue.deleteVenue);

//App listen
//----------------------------------------------------------------------------------
var port = process.env.PORT || 5000;
app.listen(port);
