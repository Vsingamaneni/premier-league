const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
let predictionUtils = require('./PredictionUtil');
const moment = require('moment');
var dateFormat = require('dateformat');

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
                        let inputInUtc = item.matchTime;
                        let dateInUtc = new Date(Date.parse(inputInUtc));
                        let dateInLocalTz = convertUtcToLocalTz(dateInUtc);

                        var utcTime = new Date(item.matchTime);
                        // var now_utc =  Date.UTC(utcTime.getUTCFullYear(), utcTime.getUTCMonth(), utcTime.getUTCDate(),
                        //     utcTime.getUTCHours(), utcTime.getUTCMinutes(), utcTime.getUTCSeconds());
                        //
                        // var utcTime = new Date(now_utc);

                        item.localTime = adjustForTimezone(utcTime, req.cookies.clientOffset);

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

/*function matchDaySchedule(matchDayScheduleMap){
    let finalSchedule = [];
    if (matchDayScheduleMap.size > 0  ){
        for (const [key, value] of matchDayScheduleMap.entries()) {
            let singleSchedule = {'matchDay': key};
            singleSchedule.games = value.length;
            singleSchedule.deadline = value[0].timer;
            singleSchedule.allow = true;
            finalSchedule.push(singleSchedule);
        }
    }
    return finalSchedule;
}*/

function convertUtcToLocalTz(dateInUtc) {
    //Convert to local timezone
    return new Date(dateInUtc.getTime() - dateInUtc.getTimezoneOffset()*60*1000);
}


function adjustForTimezone(date, clientOffset){
    var timeOffsetInMS = clientOffset * 60000;
    date.setTime(date.getTime() + timeOffsetInMS);
    return dateFormat(date, "yyyy-mm-dd h:MM:ss TT Z");
}