var express = require("express");
var pg = require('pg');

var app = express();
app.use(express.logger());

console.log(process.env.DATABASE_URL);

app.get('/', function(request, response) {
  console.log("Sending");
pg.connect(process.env.DATABASE_URL, function(err, client) {
  var query = client.query('SELECT * FROM venues');

  query.on('row', function(row) {
    response.send(JSON.stringify(row));
  });
	});

  response.send('Hello World! Let us rejoice! Twice!'+process.env.PORT);
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
