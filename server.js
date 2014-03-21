var express = require('express.io');
var mysql = require('mysql');
var app = express();

var connection_obj = {};

app.http().io();

app.io.route('login', function(req){
    console.dir(req.data);
    var thisConnection = mysql.createConnection({
        socketPath: "/var/run/mysqld/mysqld.sock",
        user: req.data.username,
        password: req.data.password
    });

    thisConnection.connect();

    thisConnection.query('SHOW DATABASES', function(err, rows){
        if (err) req.io.emit('error', err);

        req.io.emit('login', rows);

        connection_obj[req.io.socket.id] = thisConnection;
    });

});

app.io.route('switch_db', function(req){
    var thisConnection = connection_obj[req.io.socket.id];
    thisConnection.changeUser({database: req.data}, function(err){
        if (err) req.io.emit('error', err);

        thisConnection.query('SHOW TABLES', function(err, rows){
            if (err) req.io.emit('error', err);

            req.io.emit('db_switched', rows);
        });
    });
});

app.io.route('switch_table', function(req){
    var thisConnection = connection_obj[req.io.socket.id];
    thisConnection.query('SELECT * FROM ' + req.data, function(err, rows){
        if (err) req.io.emit('error', err);

        req.io.emit('table_switched', rows);
    });
});

app.use(function(req, res, next) {
    console.log(__dirname + req.path)
    res.sendfile(__dirname + req.path)
})

app.io.route('disconnect', function(req){
    try {
        connection_obj[req.io.socket.id].end();
        delete connection_obj[req.io.socket.id];
    } catch (err) {
        console.log(err);
    }
});

app.listen(8181);
