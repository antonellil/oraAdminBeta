/* Global modules */
var pg = require('pg');
var util = require('util');
var async = require('async');
var api_key = '8j2myhYSAHdm723y8jmHAfmh823rmyd';

/* Connecting to PostgreSQL Database */
var conString = process.env.DATABASE_URL || "postgres://soccerswim8:aaaaaaa1@localhost/mydb";
var client = new pg.Client(conString);
client.connect();
 
function validTimes(start,end) {
    endParts = end.split(':');
    startParts = start.split(':');
    endHr = (parseInt(endParts[0])+19) % 24;
    startHr = (parseInt(startParts[0])+19) % 24;
    edge = endHr==startHr ? endParts[1]>startParts[1] : true;
    return (start!='')&&(end!='')&&(endHr>=startHr)&&edge;
}

exports.getAll = function(req, res) {
    /*var api_key_req = req.query.api_key;
    if(api_key != api_key_req) {
        res.send({error: true, errorMessage: 'Get outta here buddy'});
    } else{*/
        var query_params = req.query;
        var whereClause = '';

        for(var param in query_params){
            if(whereClause == '') {
                whereClause = ' WHERE '
            } else {
                whereClause += ' and '
            }

            if(param=='day'){
                console.log(query_params[param].toLowerCase());
                whereClause += query_params[param].toLowerCase()+' = true';
            } else if(param=='lat') {
                var upper = String(parseFloat(query_params[param])+1);
                var lower = String(parseFloat(query_params[param])-1);
                whereClause += 'lat < '+upper+' and lat > '+lower;
            } else if(param=='lng') {
                var upper = String(parseFloat(query_params[param])+1);
                var lower = String(parseFloat(query_params[param])-1);
                whereClause += 'lng < '+upper+' and lng > '+lower;
            }    
        }

        var  query = client.query("select * from specials"+whereClause,[],function(err,result){
            if(err) {
                res.send({error: true, errorMessage: String(err)});
            } else{
                res.send({error:false, data: result.rows});
            }   
        });
    /*}*/
};

exports.getSpecial = function(req,res) {
    var id = req.params.id;
    client.query("select * from specials where special_id = $1",[id],function(err,result){
        if(err) {
            return res.send({error: true, errorMessage: String(err)});
        } else{
            return res.send({error:false, data: result.rows});
        }   
    }); 
}

exports.getSpecialsVenue = function(req,res) {
    var id = req.query.venue_id;
    client.query("select * from specials where venue_id = $1",[id],function(err,result){
        if(err) {
            return res.send({error: true, errorMessage: String(err)});
        } else{
            return res.send({error:false, data: result.rows});
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
                
                client.query("INSERT INTO specials (description,endtime,starttime,lat,lng,city, address,valuetype,value,venue,venue_id,type,sunday,monday,tuesday,wednesday,thursday,friday,saturday) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)",
                    [escape(special.specialDescription),
                    escape(special.specialEnd),
                    escape(special.specialStart),
                    venue.lat,
                    venue.lng,
                    venue.city,
                    venue.address,
                    escape(special.specialAmount),
                    escape(special.specialValue),
                    venue.name,
                    venue.venue_id,
                    escape(special.specialType),
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