const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
let predictionUtils = require('./PredictionUtil');
var dateFormat = require('dateformat');
var moment = require('moment');
var mom = require('moment-timezone');

const app = express();

//set views file
app.set('views',path.join(__dirname,'views'));

//set view engine
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(__dirname + '/public'));
app.use('/public', express.static('public'));


exports.matchDetails = async function getMatchDetails(connection, req){
    let sql = `Select * from SCHEDULE order by matchNumber asc`;
    return await new Promise( (resolve,reject) => {
        let result = connection.query(sql, function(err, results) {

            if(err){
                reject(err);
            } else {
                let schedule = [];
                if (results.length > 0){
                    results.forEach(function(item) {
                        item.clientTime = clientTimeZone(item.timer, req.cookies.clientOffset);
                        item.momentClientTime = clientTimeZoneMoment(item.timer, req.cookies.clientOffset)
                        item.formatTimer = item.timer;

                        schedule.push(item);
                    });
                    resolve(schedule);
                } else {
                    resolve(schedule);
                }
            }
        });
    });
}

exports.generateMatchDay = function generateMatchDay(schedule){
    return predictionUtils.mapSchedule(schedule, true);

}

function convertUtcToLocalTz(dateInUtc) {
    //Convert to local timezone
    return new Date(dateInUtc.getTime() - dateInUtc.getTimezoneOffset()*60*1000);
}

function clientTimeZone(date, clientTimeZone){
    console.log("Timezone : " + clientTimeZone);
    console.log("date string : " + date);

    let dateLocal = new Date(date);
    console.log("date after conversion " + dateLocal);

    let usaTime =
        dateLocal.toLocaleString("en-US", {
            timeZone: "America/New_York"
        });

    console.log("Time after timezone " + usaTime);
    return usaTime;
}

function clientTimeZoneMoment(date, clientTimeZone){
    //var format = 'YYYY/MM/DD HH:mm:ss ZZ';
    var format = 'lll';
    return mom(date).tz(clientTimeZone).format(format);
}

function adjustZone(date, clientOffset){
    let utcDate = new Date(date.toLocaleString('en-US', { timeZone: clientOffset }));
    return dateFormat(utcDate, "yyyy-mm-dd h:MM:ss TT Z");
}