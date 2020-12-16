const path = require('path');
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
var utils = require('./util/ScheduleUtil');
let predictionUtils = require('./util/PredictionUtil');
var db = require('./db');

const urlencodedParser = bodyParser.urlencoded({extended: false})
const {check, validationResult} = require('express-validator')

const app = express();

//set views file
app.set('views', path.join(__dirname, 'views'));

//set view engine
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static(__dirname + '/public'));
app.use('/public', express.static('public'));

const connection = db.dbConnection();

exports.predictions = app.get('/predictions', async (req, res) => {
    try {
        if (req.cookies.loginDetails) {
            let loginDetails = JSON.parse(req.cookies.loginDetails);
            let alert;
            let msg;
            let fail;
            if (undefined != req.cookies.alert) {
                alert = req.cookies.alert;
                res.cookie('alert', null, {expires: new Date(Date.now() + 0 * 0), httpOnly: true});
            }

            if (undefined != req.cookies.msg) {
                msg = req.cookies.msg;
                res.cookie('msg', null, {expires: new Date(Date.now() + 0 * 0), httpOnly: true});
            }

            if (undefined != req.cookies.fail) {
                fail = req.cookies.fail;
                res.cookie('fail', null, {expires: new Date(Date.now() + 0 * 0), httpOnly: true});
            }

            let schedule = await predictionUtils.sortSchedule(connection);
            let includeFinishedGames = false;
            let gameWeekSchedule = predictionUtils.predictionDetails(predictionUtils.mapSchedule(schedule, includeFinishedGames));

            // Check for current active predictions and block prediction again.
            /*let matchDay = await predictionUtils.getActiveMatchDay(connection);*/
            let userPredictions = await predictionUtils.getMatchdayPredictions(connection, loginDetails.memberId);
            if (userPredictions.size > 0 ){
                predictionUtils.mapPredictionsToSchedule(userPredictions, gameWeekSchedule);
            }

            res.render('predictions/prediction', {
                title: 'Predictions ',
                team: loginDetails.team,
                fname: loginDetails.fName,
                schedule: gameWeekSchedule,
                memberId: loginDetails.memberId,
                alert,
                msg,
                fail
            });

        } else {
            res.redirect('/login');
        }
    } catch (e) {
        console.log('error processing schedule', e);
        res.redirect('/login');
    }
});

exports.predict = app.get('/predict/:matchDay/:memberId', async (req, res) => {
    if (req.cookies.loginDetails) {
        let loginDetails = JSON.parse(req.cookies.loginDetails);
        const matchDay = req.params.matchDay;
        const memberId = req.params.memberId;
        let schedule = await predictionUtils.getMatchdaySchedule(connection, matchDay);
        let matchDeadline;

        if (schedule.length > 0){
            matchDeadline = schedule[0].timer;
        }
        res.cookie('schedule', schedule, {expires: new Date(Date.now() + 100 * 60000), httpOnly: true});

        return res.render('predictions/matchDayPredictions', {
            title: 'Match Day Predictions ',
            team: loginDetails.team,
            fname: loginDetails.fName,
            schedule: schedule,
            memberId: loginDetails.memberId,
            matchDay: matchDay,
            matchDeadline: matchDeadline
        });
    }
    return res.render('login/login', {
        title: 'Scoreboard'
    });
});

// Save the predictions
exports.savePredictions = app.post('/savePredictions/:matchDay', urlencodedParser, [
    check('selected1', 'Select All games')
        /*.custom((value, {req}) => value != '--- Select Result ---')*/
        .custom((value, {req}) => {
            const matchDay = req.params.matchDay;

            if (!predictionUtils.validateMatchDay(req, matchDay)) {
                throw new Error('You are trying to select wrong matches' );
            }

            if (!predictionUtils.validateMemberPredictions(req)) {
                throw new Error('You must select all games for Matchday : ' + matchDay);
            }
            return true;
        })

], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const alert = errors.array();
        res.cookie('schedule', null, {expires: new Date(Date.now() + 0 * 0), httpOnly: true});
        res.cookie('alert', alert, {expires: new Date(Date.now() + 60 * 60000), httpOnly: true});
        return res.redirect('/predictions');
    } else {
        const matchDay = req.params.matchDay;
        if (predictionUtils.saveMemberPredictions(connection, req, matchDay, res)){
            const msg = [];
            msg.push('Predictions saved successfully for matchDay : ' + matchDay);
            res.cookie('msg', msg, {expires: new Date(Date.now() + 60 * 60000), httpOnly: true});
            return res.redirect('/predictions');
        } else {
            const fail = [];
            fail.push('Unable to save predictions for matchDay : ' + matchDay);
            res.cookie('fail', fail, {expires: new Date(Date.now() + 60 * 60000), httpOnly: true});
            return res.redirect('/predictions');
        }
    }
});


// Get the user predictions to update
exports.savePredictions = app.get('updatePredictions/:matchDay/:memberId', async (req, res) => {
    if (req.cookies.loginDetails) {
        let loginDetails = JSON.parse(req.cookies.loginDetails);
        const matchDay = req.params.matchDay;
        const memberId = req.params.memberId;
        let schedule = await predictionUtils.getMatchdaySchedule(connection, matchDay);

        res.cookie('schedule', schedule, {expires: new Date(Date.now() + 100 * 60000), httpOnly: true});

        return res.render('predictions/matchDayPredictions', {
            title: 'Match Day Predictions ',
            team: loginDetails.team,
            fname: loginDetails.fName,
            schedule: schedule,
            memberId: loginDetails.memberId,
            matchDay: matchDay
        });
    }
    return res.render('login/login', {
        title: 'Scoreboard'
    });
});
