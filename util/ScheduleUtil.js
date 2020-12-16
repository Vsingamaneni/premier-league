const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
let predictionUtils = require('./PredictionUtil');
const moment = require('moment');


const app = express();

//set views file
app.set('views',path.join(__dirname,'views'));

//set view engine
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(__dirname + '/public'));
app.use('/public', express.static('public'));


exports.matchDetails = async function getMatchDetails(connection){
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

                        item.localTime = item.matchTime;

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