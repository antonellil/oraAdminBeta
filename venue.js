var pg = require('pg');
var util = require('util');

var conString = process.env.DATABASE_URL || "postgres://soccerswim8:aaaaaaa1@localhost/mydb";

var client = new pg.Client(conString);

client.connect();
 
exports.getAll = function(req, res) {
    var  query = client.query("select * from venues",function(err,result){
        if(err) {
            res.send({error: true, errorMessage: String(err)});
        } else{
            res.send({error:false, data: JSON.stringify(result.rows)});
        }   
    });
};
 
exports.addVenue = function(req, res) {
    var venue = req.query;
    console.log('Inserting Venue');
    console.log(util.inspect(req.query, false, null));
  
    client.query("INSERT INTO venues (name) VALUES($1)",[venue.name]);

    res.send('done');
}
 
exports.deleteVenue = function(req, res) {
    var venue = req.query;
    console.log('Deleting Venue');
    client.query("DELETE FROM venues WHERE id = $1",[venue.id]);
    res.send('done');
}
