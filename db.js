const mysql = require('mysql');

var connection;

// // Localhost DB config
// module.exports = {
//     dbConnection: function () {
//         connection = mysql.createConnection({
//             host:'localhost',
//             user:'root',
//             password:'',
//             database:'premier_league'
//         });
//         return connection;
//     }
// };


// AWS DB Config
module.exports = {
    dbConnection: function () {
        connection = mysql.createConnection({
                host:'premierleague.cxn0nyuxcvwi.us-east-2.rds.amazonaws.com',
                user:'root',
                password:'premier_league',
                database:'premier_league'
        });
        return connection;
    }
};

/*// Google Cloud DB Config
module.exports = {
    dbConnection: function () {
        connection = mysql.createConnection({
                host:'34.71.143.66',
                user:'root',
                password:'',
                port:3306,
                socketPath:'/cloudsql/myreact-295818:us-central1:react-app',
                database:'EmployeeDB'
        });
        connection.connect();
        return connection;
    }
};*/

