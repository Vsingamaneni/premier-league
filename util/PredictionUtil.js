const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');

const app = express();

//set views file
app.set('views', path.join(__dirname, 'views'));

//set view engine
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static(__dirname + '/public'));
app.use('/public', express.static('public'));

exports.sortSchedule = async function getSchedule(connection) {

    let sql = `Select * from SCHEDULE`;
    var schedules = [];

    await new Promise((resolve, reject) => {
        var result = connection.query(sql, function (err, results) {
            if (err) {
                reject(err);
            } else {

                if (results.length > 0) {
                    results.forEach(function (item) {
                        schedules.push(item);
                    });
                    resolve(schedules);
                } else {
                    resolve(schedules);
                }
            }
        });
    });


    schedules.forEach(schedule => {
        var d1 = new Date();
        var d2 = new Date(schedule.timer);
        if (d1.getTime() < d2.getTime()) {
            schedule.allow = true;
        } else {
            schedule.allow = false;
        }
        var inputInUtc = schedule.timer;
        var dateInUtc = new Date(Date.parse(inputInUtc));
        var dateInLocalTz = convertUtcToLocalTz(dateInUtc);

        schedule.localTime = moment(new Date(dateInLocalTz.toISOString()), 'MMMM Do YYYY, h:mm:ss a').format('MMM Do YYYY, h:mm A');
    });
    return schedules;
}

// returns the entire schedule for the given matchDay.
exports.getMatchdaySchedule = async function getMatchdaySchedule(connection, matchDay) {

    let sql = `Select * from SCHEDULE where matchDay =${matchDay}`;
    var matches = [];

    await new Promise((resolve, reject) => {
        var result = connection.query(sql, function (err, results) {
            if (err) {
                reject(err);
            } else {

                if (results.length > 0) {
                    results.forEach(function (item) {
                        if (!item.done) {
                            matches.push(item);
                        }
                    });
                    resolve(matches);
                } else {
                    resolve(matches);
                }
            }
        });
    });

    return matches;
}

// returns the entire predictions for the given matchDay and memberId.
exports.getMatchdayPredictions = async function getMatchdayPredictions(connection, memberId) {
    let sql = `Select * from PREDICTIONS where memberId = ${memberId}`;
    let matches = [];

    await new Promise((resolve, reject) => {
        connection.query(sql, function (err, results) {
            if (err) {
                reject(err);
            } else {
                if (results.length > 0) {
                    results.forEach(function (item) {
                        matches.push(item);
                        resolve(matches);
                    });
                } else {
                    resolve(matches);
                }
            }
        });
    });

    let userPredictions = new Map();

    if (matches.length > 0) {
        matches.forEach(function (match) {
            if (undefined != userPredictions.get(match.matchDay)) {
                let gameWeek = userPredictions.get(match.matchDay);
                gameWeek.push(match);
            } else {
                let weeksSchedule = [];
                weeksSchedule.push(match);
                userPredictions.set(match.matchDay, weeksSchedule);
            }
        });
    }
    return userPredictions;

}

exports.mapPredictionsToSchedule = function mapPredictionsToSchedule(predictions, schedule) {
    // schedule is a list
    if (schedule.length > 0) {
        schedule.forEach(function (match) {
            let allowPrediction = true;
            if (predictions.size > 0) {
                for (const [key, value] of predictions.entries()) {
                    if (match.matchDay == key && match.games == value.length){
                        allowPrediction = false;
                    }
                }
            }
            match.allow = allowPrediction;
        })
    }

    // predictions is a map

}

// Returns the current active matchDay
exports.getActiveMatchDay = async function getActiveMatchDay(connection) {
    let sql = `Select * from SCHEDULE where isActive = true LIMIT 1`;
    let matchDay;

    await new Promise((resolve, reject) => {
        connection.query(sql, function (err, results) {
            if (err) {
                reject(err);
            } else {
                if (results.length > 0) {
                    results.forEach(function (item) {
                        matchDay = item.matchDay;
                    });
                } else {
                    matchDay = 0;
                }
            }
        });
    });

    return matchDay;
}

exports.mapSchedule = function mapSchedule(schedule, includeFinishedGames) {
    let matchDaySchedule = new Map();

    if (schedule.length > 0) {
        schedule.forEach(function (match) {
            if (!match.done || includeFinishedGames) {
                if (undefined != matchDaySchedule.get(match.matchDay)) {
                    let gameWeek = matchDaySchedule.get(match.matchDay);
                    gameWeek.push(match);
                } else {
                    let weeksSchedule = [];
                    weeksSchedule.push(match);
                    matchDaySchedule.set(match.matchDay, weeksSchedule);
                }
            }
        });

    }
    return matchDaySchedule;
}

exports.predictionDetails = function predictionDetails(matchDaySchedule) {
    let finalPredictionSchedule = [];
    if (matchDaySchedule.size > 0) {
        for (const [key, value] of matchDaySchedule.entries()) {
            let singleSchedule = {'matchDay': key};
            singleSchedule.games = value.length;
            singleSchedule.deadline = value[0].timer;
            singleSchedule.allow = true;
            finalPredictionSchedule.push(singleSchedule);
        }
    }
    return finalPredictionSchedule;
}

exports.validateMatchDay = function validateMatchDay(req, matchDay) {
    let noError = true;
    let schedule = req.cookies.schedule;
    if (undefined != schedule) {
        schedule.forEach(function (match) {
            if (match.matchDay != matchDay) {
                noError = false;
            }
        });
    }
    return noError;
}

exports.validateMemberPredictions = function validateMemberPredictions(req) {
    let noError = true;
    let schedule = req.cookies.schedule;
    if (undefined != schedule) {
        schedule.forEach(function (match) {
            let selectedValue = returnSelectedValue(req, match.matchNumber);
            if (selectedValue == '--- Select Result ---') {
                noError = false;
            }
        });
    } else {
        noError = false;
    }
    return noError;
}

// Saves user predictions for the match day.
exports.saveMemberPredictions = async function saveMemberPredictions(connection, req, matchDay, res) {
    let isPredictionSaveSuccess = false;
    let loginDetails = JSON.parse(req.cookies.loginDetails);
    let schedule = req.cookies.schedule;
    if (undefined == schedule) {
        return;
    }

    const memberId = loginDetails.memberId;
    var matchNumber;
    var homeTeam;
    var awayTeam;
    var firstName;
    var selected;
    var predictedTime = new Date();

    schedule.forEach(function (match) {
        matchNumber = match.matchNumber;
        homeTeam = match.homeTeam;
        awayTeam = match.awayTeam;
        firstName = loginDetails.fName + ' ' + loginDetails.lName;
        selected = returnSelectedValue(req, matchNumber);

        let data = {
            memberId: memberId,
            matchNumber: matchNumber,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            firstName: firstName,
            selected: selected,
            predictedTime: predictedTime,
            matchDay: matchDay
        };

        let sql = "INSERT INTO PREDICTIONS SET ?";

        connection.query(sql, data, (err, results) => {
            if (err) {
                const alert = 'Unable to save predictions';
                res.cookie('alert', alert, {expires: new Date(Date.now() + 60 * 60000), httpOnly: true});
                return res.redirect('/predictions');
            }
            isPredictionSaveSuccess = true;
        });

    })
    return isPredictionSaveSuccess;
}

function returnSelectedValue(req, matchId) {
    let selectedvalue;
    if (undefined != matchId) {
        if (matchId == 1) {
            selectedvalue = req.body.selected1;
        } else if (matchId == 2) {
            selectedvalue = req.body.selected2;
        } else if (matchId == 3) {
            selectedvalue = req.body.selected3;
        } else if (matchId == 4) {
            selectedvalue = req.body.selected4;
        } else if (matchId == 5) {
            selectedvalue = req.body.selected5;
        } else if (matchId == 6) {
            selectedvalue = req.body.selected6;
        } else if (matchId == 7) {
            selectedvalue = req.body.selected7;
        } else if (matchId == 8) {
            selectedvalue = req.body.selected8;
        } else if (matchId == 9) {
            selectedvalue = req.body.selected9;
        } else if (matchId == 10) {
            selectedvalue = req.body.selected10;
        } else if (matchId == 11) {
            selectedvalue = req.body.selected11;
        } else if (matchId == 12) {
            selectedvalue = req.body.selected12;
        } else if (matchId == 13) {
            selectedvalue = req.body.selected13;
        } else if (matchId == 14) {
            selectedvalue = req.body.selected14;
        }
    }
    return selectedvalue;
}

// Time in local
function convertUtcToLocalTz(dateInUtc) {
    //Convert to local timezone
    return new Date(dateInUtc.getTime() - dateInUtc.getTimezoneOffset() * 60 * 1000);
}



