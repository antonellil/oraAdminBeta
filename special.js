/* Global modules */
var pg = require('pg');
var util = require('util');
var async = require('async');
var api_key = '8j2myhYSAHdm723y8jmHAfmh823rmyd';
var coords = {lat:null,lng:null};
var gm = require('googlemaps');

/* Connecting to PostgreSQL Database */
var conString = process.env.DATABASE_URL;
var client = new pg.Client(conString);
client.connect();
 
/* Helper functions - TODO move helper functions to separate helper file */
function validTimes(start,end) {
    endParts = end.split(':');
    startParts = start.split(':');
    endHr = (parseInt(endParts[0])+19) % 24;
    startHr = (parseInt(startParts[0])+19) % 24;
    edge = endHr==startHr ? endParts[1]>startParts[1] : true;
    return (start!='')&&(end!='')&&(endHr>=startHr)&&edge;
}

function parseTime(time) {
    var timeParts = time.split(":");
    var convertedMinutes = parseFloat(timeParts[1])/60.0;
    return parseFloat(String((parseInt(timeParts[0])+19) % 24)+String(convertedMinutes).replace("0",""));
}

function deg2rad(deg) {
    return deg * (Math.PI/180)
}
 
function getDistance(lat1,lng1,lat2,lng2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLng = deg2rad(lng2-lng1); 
    var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; 
    return parseFloat(d)*0.621371; //Returns in miles with conversion
}

function distanceSort(a,b) {
    if (a.distance > b.distance)
      return 1;
    if (a.distance < b.distance)
      return -1;
    return 0;
}

function addDistance(item) {
    item.distance = getDistance(coords.lat,coords.lng,item.lat,item.lng);
    return item;
}

/* Public functions for API calls */
exports.getAll = function(req, res) {
    var query_params = req.query;
    var radius = 2;

    query_params.type = query_params['type'] || ['drink','food'];

    var day = ((query_params['when'] == 'now') || (query_params['when'] == 'later')) ? query_params['today'] : query_params['tomorrow'];

    var time = query_params['when'] == 'now' ? ' and startvalue <= '+query_params['time']+' and endvalue > '+query_params['time']
                : ' and endvalue > '+query_params['time'];

    var whereClause = 'WHERE '+day.toLowerCase()+' = true and type in (\''+query_params['type'].join('\',\'')+'\')'+time;

    console.log(whereClause);

    if(query_params['location'] != 'current location') {
        console.log("geocoding address search");
        gm.geocode(query_params['location'], function(errG, data){
            if(errG || (typeof data.results[0] === 'undefined')) {
                res.jsonp({error: true, errorMessage: "Google geocoding error!"});
            } else {
                var gmLat = data.results[0].geometry.location.lat;
                var gmLng = data.results[0].geometry.location.lng;

                var upperLat = String(parseFloat(gmLat)+radius);
                var lowerLat = String(parseFloat(gmLat)-radius);
                whereClause += ' and lat < '+upperLat+' and lat > '+lowerLat;
                var upperLng = String(parseFloat(gmLng)+radius);
                var lowerLng = String(parseFloat(gmLng)-radius);
                whereClause += ' and lng < '+upperLng+' and lng > '+lowerLng;

                var sort = query_params['sort'] == 'distance' ? "point(lng,lat) <@> point("+query_params['lng']+","+query_params['lat']+")" : (query_params['sort'] == 'start' ? "startvalue,venue" : "endvalue,venue");

                var  query = client.query("select * from specials "+whereClause+" order by "+sort+" limit "+query_params['limit']+" offset "+query_params['offset'],[],function(err,result){
                    if(err) {
                        res.jsonp({error: true, errorMessage: String(err)});
                    } else{
                        coords.lat = gmLat;
                        coords.lng = gmLng;
                        result.lat = gmLat;
                        result.lng = gmLng;
                        result.rows.map(addDistance)
                        //result.rows.sort(distanceSort);
                        res.jsonp({error:false, data: result});
                    }   
                });
            }
        });
    } else {
        console.log("current location search");
        var upperLat = String(parseFloat(query_params['lat'])+radius);
        var lowerLat = String(parseFloat(query_params['lat'])-radius);
        whereClause += ' and lat < '+upperLat+' and lat > '+lowerLat;
        var upperLng = String(parseFloat(query_params['lng'])+radius);
        var lowerLng = String(parseFloat(query_params['lng'])-radius);
        whereClause += ' and lng < '+upperLng+' and lng > '+lowerLng;

        var sort = query_params['sort'] == 'distance' ? "point(lng,lat) <@> point("+query_params['lng']+","+query_params['lat']+")" : (query_params['sort'] == 'start' ? "startvalue,venue" : "endvalue,venue");
        
        var  query = client.query("select * from specials "+whereClause+" order by "+sort+" limit "+query_params['limit']+" offset "+query_params['offset'],[],function(err,result){
            if(err) {
                res.jsonp({error: true, errorMessage: String(err)});
            } else{
                coords.lat = query_params.lat;
                coords.lng = query_params.lng;
                result.lat = query_params.lat;
                result.lng = query_params.lng;
                result.rows.map(addDistance);
                res.jsonp({error:false, data: result});
            }   
        });
    }
};

exports.getSpecial = function(req,res) {
    var id = req.params.id;
    client.query("select * from specials where special_id = $1",[id],function(err,result){
        if(err) {
            return res.jsonp({error: true, errorMessage: String(err)});
        } else{
            return res.jsonp({error:false, data: result.rows});
        }   
    }); 
}

exports.getSpecialsVenue = function(req,res) {
    var id = req.query.venue_id;
    client.query("select * from specials where venue_id = $1",[id],function(err,result){
        if(err) {
            return res.jsonp({error: true, errorMessage: String(err)});
        } else{
            return res.jsonp({error:false, data: result.rows});
        }   
    }); 
}

exports.addSpecial = function(req, res) {
    var special = req.body;
    var status = 'Success!';
    
    special.specialSunday = false;
    special.specialMonday = false;
    special.specialTuesday = false;
    special.specialWednesday = false;
    special.specialThursday = false;
    special.specialFriday = false;
    special.specialSaturday = false;

    console.log(special);

    if(special.specialVenue=='' ||special.specialDescription =='' || special.specialValue=='' || (typeof special.specialDay === 'undefined') 
        || !validTimes(special.specialStart,special.specialEnd)) {
        status = 'Fill in all the fields correctly!';
        res.render('admin',{status:status});
    } else {
        client.query("select * from venues where venue_id = $1",[special.specialVenue],function(err,result){
            if(err) {
                status = String(err);
                res.render('admin',{status:status});
            } else{
                var venue = result.rows[0];
                special.specialDay.forEach(function(day){
                    switch(day) {
                        case '1':
                            special.specialSunday = true;
                            break;
                        case '2':
                            special.specialMonday = true;
                            break;
                        case '3':
                            special.specialTuesday = true;
                            break;
                        case '4':
                            special.specialWednesday = true;
                            break;
                        case '5':
                            special.specialThursday = true;
                            break;
                        case '6':
                            special.specialFriday = true;
                            break;
                        case '7':
                            special.specialSaturday = true;
                            break;
                        default:
                            break;
                    }
                }); 

                console.log("Inserting special");
                console.log(special);
                
                client.query("INSERT INTO specials (description,endtime,starttime,endValue,startValue,lat,lng,city, address,valuetype,value,venue,venue_id,type,date,sunday,monday,tuesday,wednesday,thursday,friday,saturday) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)",
                    [escape(special.specialDescription),
                    escape(special.specialEnd),
                    escape(special.specialStart),
                    parseTime(special.specialEnd),
                    parseTime(special.specialStart),
                    venue.lat,
                    venue.lng,
                    venue.city,
                    venue.address,
                    escape(special.specialAmount),
                    escape(special.specialValue),
                    venue.name,
                    venue.venue_id,
                    escape(special.specialType),
                    escape(special.specialDate),
                    special.specialSunday,
                    special.specialMonday,
                    special.specialTuesday,
                    special.specialWednesday,
                    special.specialThursday,
                    special.specialFriday,
                    special.specialSaturday],
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
 
exports.deleteSpecial = function(req, res) {
    var special = req.body;
    var status="Special deleted!";
    client.query("DELETE FROM specials WHERE special_id = $1",[special.specialDelete],function(err,result){
        if(err) {
            status = String(err);
            res.render('admin',{status:status});
        } else {
            res.render('admin',{status:status});
        }
    });
}
