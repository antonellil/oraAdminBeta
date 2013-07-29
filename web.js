//Modules
var express = require("express");
var pg = require('pg');
var hbs = require('hbs');

//Local files
var hash = require('./pass').hash
var blogEngine = require('./blog');
var venue = require('./venue');
var special = require('./special');

//Global variables
var app = express();
var users = {
  louis: { username: 'louis' }
};


app.set('view engine', 'html');
app.engine('html', hbs.__express);

app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser('shhhh, very secret'));
app.use(express.session());

// Session-persisted message middleware

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

//When you create a user, generate a salt and hash the password

hash('foobar', function(err, salt, hash){
  if (err) throw err;
  users.louis.salt = salt;
  users.louis.hash = hash;
});

//Auth function
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

//Restricting function
function restrict(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		req.session.error = 'Access denied!';
		res.redirect('/');
	}
}

//Application routing
app.get('/', function(req, res) {
	res.render('index');
});

app.get('/admin', restrict, function(req, res) {
   res.render('admin',{title:"My Blog", entries:blogEngine.getBlogEntries()});
});

app.get('/logout', function(req, res){
	// destroy the user's session to log them out
	// will be re-created next request
	req.session.destroy(function(){
		res.redirect('/');
	});
});

app.post('/login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation 
      req.session.regenerate(function(){
        // Store the user's primary key 
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.username;
        res.redirect('back');
      });
    } else {
      req.session.error = 'Authentication failed';
      res.redirect('/');
    }
  });
});

//API routing
app.get('/venues', venue.getAll);
//app.get('/specials', special.getAll);
app.get('/venueAdd', restrict, venue.addVenue);
//app.post('/special', restrict, special.addSpecial);
//app.delete('/special/:id', restrict, special.deleteSpecial);
app.get('/venueDelete', restrict, venue.deleteVenue);

var port = process.env.PORT || 5000;
app.listen(port);
