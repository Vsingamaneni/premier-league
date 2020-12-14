const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
var cookieParser = require('cookie-parser');
var session = require("express-session");

// Routes for different api's
var userSession = require('./user');
var schedule = require('./schedule');
var predictions = require('./predictions');

const app = express();

app.use(cookieParser());
app.use(session({
  secret: 'AKe5OCBbfC',
  resave: true,
  saveUninitialized: false,
  cookie: { secure: true }
}));

// // dev config
// const connection=mysql.createConnection({
//     host:'localhost',
//     user:'root',
//     password:'',
//     database:'premier_league'
// });

const connection=mysql.createConnection({
    host:'premierleague.cxn0nyuxcvwi.us-east-2.rds.amazonaws.com',
    user:'root',
    password:'premier_league',
    database:'premier_league'
});



// MySQL GOOGLE CLOUD  config
// const connection=mysql.createConnection({
//     host:'34.71.143.66',
//     user:'root',
//     password:'',
//     port:3306,
//     socketPath:'/cloudsql/myreact-295818:us-central1:react-app',
//     database:'EmployeeDB'
// });


module.exports = app;

connection.connect(function(error){
    if(!!error) console.log(error);
    else console.log('Database Connected!');
}); 

//set views file
app.set('views',path.join(__dirname,'views'));
			
//set view engine
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(__dirname + '/public'));
app.use('/public', express.static('public'));


// User login and register Routes
//app.get('/', userSession.login);
app.get('/login', userSession.login);
app.get('/register', userSession.register);
app.post('/userLogin', userSession.userLogin);
app.post('/registerSave', userSession.registerUser);
app.get('/forget', userSession.forgetPass);
app.post('/retrieveUser', userSession.retrieveUser);
app.post('/validateSecurity', userSession.validateSecurityAnswer);
app.post('/updatePass', userSession.updatePassword);


// Schedule routes
app.get('/schedule', schedule.schedule);
app.get('/dashboard', schedule.dashboard);
app.get('/setcookie', schedule.setCookie);
app.get('/getcookie', schedule.getCookie);
app.get('/logout', schedule.removeCookie);

// Prediction routes
app.get('/predictions', predictions.predictions);
app.get('/predict/:matchDay/:memberId', predictions.predict);
app.post('/savePredictions/:matchDay', predictions.savePredictions);

app.get('/users',(req, res) => {
    //res.send('Hello There');
    let sql = "SELECT * FROM users";
    let query = connection.query(sql, (err, rows) => {
        if(err) throw err;
        res.render('schedule/user_index_nav', {
            title : 'DB Operations',
            users : rows,
            team : 'RR'
        });
    });
});


app.get('/',(req, res) => {
    let sql = "SELECT * FROM users";
    let query = connection.query(sql, (err, rows) => {
        if(err) throw err;
        res.render('user_index', {
            title : 'DB Operations',
            users : rows
        });
    });
});


app.get('/add',(req, res) => {
    res.render('user_add', {
        title : 'DB Operations'
    });
});

app.post('/save',(req, res) => { 
    let data = {name: req.body.name, email: req.body.email, phone_no: req.body.phone_no};
    let sql = "INSERT INTO users SET ?";
    let query = connection.query(sql, data,(err, results) => {
      if(err) throw err;
      res.redirect('/');
    });
});

app.get('/edit/:userId',(req, res) => {
    const userId = req.params.userId;
    let sql = `Select * from users where id = ${userId}`;
    let query = connection.query(sql,(err, result) => {
        if(err) throw err;
        res.render('user_edit', {
            title : 'DB Operations',
            user : result[0]
        });
    });
});


app.post('/update',(req, res) => {
    const userId = req.body.id;
    let sql = "update users SET name='"+req.body.name+"',  email='"+req.body.email+"',  phone_no='"+req.body.phone_no+"' where id ="+userId;
    let query = connection.query(sql,(err, results) => {
      if(err) throw err;
      res.redirect('/');
    });
});


app.get('/delete/:userId',(req, res) => {
    const userId = req.params.userId;
    let sql = `DELETE from users where id = ${userId}`;
    let query = connection.query(sql,(err, result) => {
        if(err) throw err;
        res.redirect('/');
    });
});


app.get('*',function (req, res) {
    res.redirect('/login');
});

// Server Listening
app.listen(8081, () => {
    console.log('Server is running at port 8081');
});