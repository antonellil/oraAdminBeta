var pg = require('pg');
var util = require('util');
var gm = require('googlemaps');
var yelp = require('yelp').createClient({
    consumer_key: "lYhFgc9TxUXLpwHanSuYBA", 
    consumer_secret: "n9489yxGzqd8fICRWj3mOjweQZg",
    token: "R3OjAykK_dRXiSie25BBPB5wvkXI4IFI",
    token_secret: "G_xIg5IZUw1AFdixVGIoPI3X46I"
});

var conString = process.env.DATABASE_URL || "postgres://soccerswim8:aaaaaaa1@localhost/mydb";

var client = new pg.Client(conString);

client.connect();
 
exports.getAll = function(req, res) {
    var  query = client.query("select * from venues",function(err,result){
        if(err) {
            res.send({error: true, errorMessage: String(err)});
        } else{
            res.send({error:false, data: result.rows});
        }   
    });
};

exports.getVenue = function(req,res) {
    var id = req.params.id;
    client.query("select * from venues where id = $1",[id],function(err,result){
        if(err) {
            return res.send({error: true, errorMessage: String(err)});
        } else{
            return res.send({error:false, data: result.rows});
        }   
    }); 
}

exports.addVenue = function(req, res) {
    var venue = req.body;
    var status = 'Success!';
    gm.geocode(req.body.venueAddress+','+req.body.venueCity+','+req.body.venueState, function(errG, data){
        if(errG || (typeof data.results[0] === 'undefined')) {
            status = 'Google geocode error! Try Again.';
            res.render('admin',{status:status});
        } else {
            var lat = data.results[0].geometry.location.lat;
            var lng = data.results[0].geometry.location.lng;
            client.query("select name from venues where name = $1 and city = $2",[escape(venue.venueName),escape(venue.venueCity)],function(err,result){
                    if(err) {
                        status = 'Error checking if venue exists.';
                        res.render('admin',{status:status});
                    } else{
                        if(result.rows.length>0){
                            status = 'Venue already exists!';
                            res.render('admin',{status:status});
                        } else {
                            console.log('Inserting Venue: Lat='+lat+', lng='+lng+', details='+JSON.stringify(venue));
                            client.query("INSERT INTO venues (name,address,city,state,lat,lng) VALUES($1,$2,$3,$4,$5,$6)",
                                [escape(venue.venueName),escape(venue.venueAddress),escape(venue.venueCity),escape(venue.venueState),lat,lng],
                                function(err, result) {
                                    if(err) {
                                        status = 'Error: '+String(err);
                                    }
                                    res.render('admin',{status:status});
                                }
                            );
                        }
                    }

                }
            );    
        }
    });
}
 
exports.deleteVenue = function(req, res) {
    var venue = req.query;
    console.log('Deleting Venue');
    client.query("DELETE FROM venues WHERE id = $1",[venue.id]);
    res.send('done');
}
