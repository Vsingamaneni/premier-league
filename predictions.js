const path = require('path');
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
var utils = require('./util/ScheduleUtil');
let predictionUtils = require('./util/PredictionUtil');

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

/*const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'premier_league'
});*/

const connection=mysql.createConnection({
    host:'premierleague.cxn0nyuxcvwi.us-east-2.rds.amazonaws.com',
    user:'root',
    password:'premier_league',
    database:'premier_league'
});

exports.predictions = app.get('/predictions', async (req, res) => {
    try {
        if (req.cookies.loginDetails) {
            let loginDetails = JSON.parse(req.cookies.loginDetails);
            let alert;
            if (undefined != req.cookies.alert) {
                alert = req.cookies.alert;
                res.cookie('alert', null, {expires: new Date(Date.now() + 0 * 0), httpOnly: true});
            }
            let schedule = await predictionUtils.sortSchedule(connection);
            let includeFinishedGames = false;
            let gameWeekSchedule = predictionUtils.predictionDetails(predictionUtils.mapSchedule(schedule, includeFinishedGames));

            res.render('predictions/prediction', {
                title: 'Predictions ',
                team: loginDetails.team,
                fname: loginDetails.fName,
                schedule: gameWeekSchedule,
                memberId: loginDetails.memberId,
                alert
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
        let userPredictions = await predictionUtils.getMatchdayPredictions(connection, matchDay, memberId);
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

// Update the predictions
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


        // Insert all the data into the predictions table.
        let data = {
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            country: req.body.country,
            securityQuestion: req.body.question,
            securityAnswer: req.body.securityAnswer,
            role: req.body.role,
            encryptedPass: jsonObj.passCrypto,
            salt: jsonObj.saltKey,
            isActive: 'N',
            isAdminActivated: 'N',
            paymentPref: req.body.preference,
            selectedTeam: req.body.favTeam
        };

        let sql = "INSERT INTO REGISTER SET ?";

        let query = connection.query(sql, data, (err, results) => {
            if (err) throw err;
            // res.redirect('/login');
            const success = 'Registration Successful';
            res.render('login/login', {
                success: success,
                title: 'Scoreboard'
            })

        });
    }
});
