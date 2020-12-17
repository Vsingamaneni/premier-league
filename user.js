const path = require('path');
const express = require('express');
var cryptPass = require('./password');
const bodyParser = require('body-parser');
var db = require('./db');
var jstz = require('jstz');

const urlencodedParser = bodyParser.urlencoded({extended: false})
const {check, validationResult} = require('express-validator')

const app = express();

app.locals.jstz = jstz;

//set views file
app.set('views', path.join(__dirname, 'views'));

//set view engine
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static(__dirname + '/public'));
app.use('/public', express.static('public'));

const connection = db.dbConnection();

exports.login = app.get('/login', function (req, res) {
    if (req.cookies.loginDetails) {
        return res.redirect('/dashboard');
    } else {
        res.render('login/login', {
            title: 'Scoreboard',
            jstz:jstz
        });
    }
});

exports.register = app.get('/register', function (req, res) {
    if (req.cookies.loginDetails) {
        res.redirect('/dashboard');
    }
    res.render('register/register', {
        title: 'Register'
    });
});

exports.register1 = app.get('/register1', function (req, res) {
    if (req.cookies.loginDetails) {
        res.redirect('/dashboard');
    }
    res.render('register/register1', {
        title: 'Register'
    });
});

exports.forgetPass = function (req, res) {
    res.render('register/forgot', {
        title: 'Register'
    });
};

// Validates user login and password to reset
exports.retrieveUser = app.post('/retrieveUser', urlencodedParser, [
    check('email', 'Email is not valid')
        .isEmail()
        .normalizeEmail({gmail_remove_dots: false})
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const alert = errors.array()
        return res.render('register/forgot', {
            title: 'Forget Password',
            alert
        });
    } else {
        const loginDetails = await cryptPass.loginUser(connection, req);
       return res.render('register/reset', {
            title: 'Register',
            loginDetails: loginDetails.securityQuestion,
            email: loginDetails.email
        });
    }
});

// Validates user login and password to reset
exports.validateSecurityAnswer = app.post('/validateSecurity', urlencodedParser, [
    check('securityAnswer', 'Enter Valid Security Answer')
        .custom((value, {req}) => value != 'Security Answer'),
    check('securityAnswer')
        .custom(async (value, {req}) => {
            var loginDetails = await cryptPass.loginUser(connection, req);
            if (value !== loginDetails.securityAnswer) {
                throw new Error('Security Answer didnt match');
            }
            return true;
        })
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const alert = errors.array()
        res.render('register/forgot', {
            title: 'Forgot Password',
            alert
        })
    } else {
        req.session.emailId = req.session.email;
        res.render('register/updatePass', {
            title: 'Update Password'
        });
    }
});

// Saves the user registration
exports.updatePassword = app.post('/updatePass', urlencodedParser, [
    check('password')
        .exists(),
    check('cpassword', 'Passwords does not match')
        .exists()
        .custom((value, {req}) => value === req.body.password)
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const alert = errors.array()
        res.render('register/updatePass', {
            title: 'Update Password',
            alert
        })
    } else {

        var jsonObj = cryptPass.encryptPassword(req.body.password);

        let sql = "UPDATE REGISTER SET encryptedPass='" + jsonObj.passCrypto + "',  salt='" + jsonObj.saltKey + "' where email ='" + req.session.emailId + "'";
        let query = connection.query(sql, (err, results) => {
            if (err) throw err;
            /*res.redirect('/login');*/
            var success = 'Password Updated';
            return res.render('login/login', {
                title: 'Scorecard',
                success: success
            });

        });
    }
});

// Validates user login and password and opens a session
exports.userLogin = app.post('/userLogin', urlencodedParser, [
    check('email', 'Email is not valid')
        .isEmail()
        .normalizeEmail({gmail_remove_dots: false}),
    check('password')
        .exists(),
    check('password', 'Incorrect Email or Password')
        .custom(async (value, {req}) => {
            var loginDetails = await cryptPass.loginUser(connection, req);
            var encryptedPass = cryptPass.validatePassword(req.body.password, loginDetails.encryptedPass, loginDetails.saltKey);
            if (!encryptedPass) {
                throw new Error('Incorrect Email or Password');
            }
            req.session.loginDetails = loginDetails;
            return true;
        })
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const alert = errors.array()
        res.render('login/login', {
            title: 'Scoreboard',
            alert
        })
    } else {
        try {
            var loginDetails = req.session.loginDetails;
            var clientOffset = req.body.clientOffset;
            var login = JSON.stringify({
                'fName': loginDetails.fName,
                'lName': loginDetails.lName,
                'email': loginDetails.email,
                'role': loginDetails.role,
                'memberId': loginDetails.memberId,
                'team': loginDetails.team
            });

            // res.cookie('loginDetails', login, {maxAge: 60 * 60 * 24 * 30, httpOnly: true});
            res.cookie('loginDetails', login, {expires: new Date(Date.now() + 100000 * 60000), httpOnly: true});
            res.cookie('clientOffset', clientOffset, {expires: new Date(Date.now() + 100000 * 60000), httpOnly: true});

            // set to 30 days
            //res.cookie('loginDetails', login, {expires: new Date(Date.now() + 720 * 3600000), httpOnly: true});

            res.redirect('/dashboard');
        } catch (e) {
            console.log('Unable to login user');
        }
    }
});

// Saves the user registration
exports.registerUser = app.post('/registerSave', urlencodedParser, [
    check('email', 'Email is not valid')
        .isEmail()
        .normalizeEmail({gmail_remove_dots: false}),
    check('cemail', 'Confirm Email is not valid')
        .isEmail()
        .normalizeEmail({gmail_remove_dots: false}),
    check('cemail', 'Emails Doesnt match')
        .exists()
        .custom((value, {req}) => value === req.body.email),
    check('cpassword', 'Passwords does not match')
        .exists()
        .custom((value, {req}) => value === req.body.password),
    check('country', 'Select Country')
        .custom((value, {req}) => value != '--- Select Country ---'),
    check('favTeam', 'Select Favourite Team')
        .custom((value, {req}) => value != '--- Select Favourite Team ---'),
    check('question', 'Select Security Question')
        .custom((value, {req}) => value != '--- Select Security Question ---'),
    check('secretKey', 'Wrong Secret Key')
        .custom(async (value, {req}) => {
            if (value !== await cryptPass.adminRules(connection)) {
                throw new Error('Enter matching Secret Key');
            }
            return true;
        }),
    check('preference', 'Select Payment Preference')
        .custom((value, {req}) => value != '--- Select Payment Preference ---')
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const alert = errors.array()
        res.render('register/register', {
            alert
        })
    } else {

        var jsonObj = cryptPass.encryptPassword(req.body.password);

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