const path = require('path');
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
let utils = require('./util/ScheduleUtil');
var predictionUtils = require('./util/PredictionUtil');
var db = require('./db');
var moment = require('moment');


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

exports.dashboard = app.get('/dashboard', async (req, res) => {
    try {
        if (req.cookies.loginDetails) {
            let loginDetails = JSON.parse(req.cookies.loginDetails);

            let schedule = await utils.matchDetails(connection, req);

            // var x = new Date();
            // var offset= -x.getTimezoneOffset();
            // console.log((offset>=0?"+":"-")+parseInt(offset/60)+":"+offset%60)

            // console.log(moment().format('Z'));
            //
            // var dt = new Date(Date.parse('Dec 15, 2020 17:00:00'+" UTC"));
            // dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
            // console.log(dt);
            return res.render('schedule/dashboard', {
                title: 'Dashboard',
                team: loginDetails.team,
                fname: loginDetails.fName,
                dashboard: schedule[0],
                moment: moment
            });
        } else {
            return res.render('login/login', {
                title: 'Scoreboard'
            });
        }
    } catch (e) {
        console.log('error in dashboard');
    }
});

exports.schedule = app.get('/schedule', async (req, res) => {
    try {
        if (req.cookies.loginDetails) {
            let loginDetails = JSON.parse(req.cookies.loginDetails);
            let schedule = await utils.matchDetails(connection, req);
            let scheduleMap = predictionUtils.mapSchedule(schedule, true);

            res.render('schedule/schedule', {
                title: 'Schedule ',
                team: loginDetails.team,
                fname: loginDetails.fName,
                schedule: schedule,
                scheduleMap: scheduleMap
            });
        } else {
            res.redirect('/login');
        }
    } catch (e) {
        console.log('error processing schedule', e);
        res.redirect('/login');
    }
});

exports.setCookie = app.get('/setcookie', function (req, res) {
    // setting cookies
    let loginDetails = JSON.stringify({
        'username': 'vamsi',
        'email': 'v@gmail.com'
    });

    res.cookie('loginDetails', loginDetails, {maxAge: 60 * 60 * 24 * 30, httpOnly: true});
    return res.send('Cookie has been set');
});

exports.getCookie = app.get('/getcookie', function (req, res) {
    if (req.cookies.loginDetails) {
        let loginDetails = JSON.parse(req.cookies.loginDetails);
        if (loginDetails.email) {
            return res.send(loginDetails.memberId + ", " + loginDetails.email + ", " + loginDetails.fName + ", " + loginDetails.lName + ", " + loginDetails.team);
        }
    }

    return res.send('No cookie found');
});

exports.removeCookie = app.get('/logout', function (req, res) {
    res.cookie('loginDetails', '', {expires: new Date(0)});

    let username = req.cookies['loginDetails'];
    if (username) {
        req.cookies['loginDetails'] = null;
    }

    let clientOffset = req.cookies['clientOffset'];
    if(clientOffset) {
        req.cookies['clientOffset'] = null;
    }
    res.redirect('/login');
});