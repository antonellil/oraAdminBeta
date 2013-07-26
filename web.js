var express = require("express");
var app = express();
app.use(express.logger());

app.get('/', function(request, response) {
  console.log("Sending");
  response.send('Hello World! Let us rejoice! Twice!'+process.env.PORT);
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
