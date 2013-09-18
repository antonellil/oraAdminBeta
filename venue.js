/* Global modules */
var pg = require('pg');
var util = require('util');
var gm = require('googlemaps');
var yelp = require('yelp').createClient({
    consumer_key: "lYhFgc9TxUXLpwHanSuYBA", 
    consumer_secret: "n9489yxGzqd8fICRWj3mOjweQZg",
    token: "R3OjAykK_dRXiSie25BBPB5wvkXI4IFI",
    token_secret: "G_xIg5IZUw1AFdixVGIoPI3X46I"
});

/* Connecting to PostgreSQL Database */
var conString = process.env.DATABASE_URL;
var client = new pg.Client(conString);
client.connect();
 
exports.getAll = function(req, res) {
    var query = req.query;
    var  query = client.query("select * from venues where city = '"+query.city+"'",function(err,result){
        if(err) {
            res.jsonp({error: true, errorMessage: String(err)});
        } else{
            res.jsonp({error:false, data: result.rows});
        }   
    });
};

exports.getVenue = function(req,res) {
    var id = req.params.id;
    client.query("select * from venues where venue_id = $1",[id],function(err,result){
        if(err) {
            return res.jsonp({error: true, errorMessage: String(err)});
        } else{
            return res.jsonp({error:false, data: result.rows});
        }   
    }); 
}

exports.addVenue = function(req, res) {
    var venue = req.body;
    var status = 'Success!';
    if(req.body.venueCity=='' || req.body.venueAddress == '') {
        status = 'Fill in all the fields!';
        res.render('admin',{status:status});
    } else {
        gm.geocode(req.body.venueAddress+','+req.body.venueCity+','+req.body.venueState, function(errG, data){
            if(errG || (typeof data.results[0] === 'undefined')) {
                status = 'Google geocode error! Try Again.';
                res.render('admin',{status:status});
            } else {
                var lat = data.results[0].geometry.location.lat;
                var lng = data.results[0].geometry.location.lng;
                
                console.log('Inserting Venue: Lat='+lat+', lng='+lng+', details='+JSON.stringify(venue));
                client.query("INSERT INTO venues (name,address,city,state,lat,lng) VALUES($1,$2,$3,$4,$5,$6)",
                    [escape(venue.venueName),escape(venue.venueAddress),escape(venue.venueCity),escape(venue.venueState),lat,lng],
                    function(err, result) {
                        if(err) {
                            status = String(err);
                        }
                        res.render('admin',{status:status});
                    }
                );
            }
        });
    }
}
 
exports.deleteVenue = function(req, res) {
    var venue = req.body;
    console.log(venue);
    var status="Venue deleted!";
    console.log('Deleting Venue');
    client.query("DELETE FROM venues WHERE venue_id = $1",[venue.venueDelete],function(err,result){
        if(err) {
            status = 'Error: '+String(err);
            res.render('admin',{status:status});
        } else {
            res.render('admin',{status:status});
        }
    });
}

exports.yelpVenue = function(req, res) {
    var query = req.query;

    yelp.search({term: unescape(query.venue),limit:1,ll:String(query.lat)+','+String(query.lng)}, function(error, data) {
        if(error){
            console.log(String(query.lat)+','+String(query.lng));
            console.log(error);
            res.jsonp({error: true, errorMessage: String(error)});
        } else{
            res.jsonp({error: false, data: data});
        }
    });    
}
