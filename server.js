var express = require('express.io');
var mysql = require('mysql');
var app = express();

var connection_obj = {};

app.http().io();

app.use(express.urlencoded())
app.use(express.json())

app.io.route('login', function(req){
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
    thisConnection.query('SELECT * FROM ' + req.data + ' LIMIT 1', function(err, rows){
        if (err) req.io.emit('error', err);

        req.io.emit('table_switched', rows);
    });
});


app.get('/get_table_pages/:current_table', function(req, res){
    thisConnection = connection_obj[req.query.socket_id];
    var columns = req.query.columns.split(',');
    
    for(var i in columns){
        columns[i] = mysql.escapeId(columns[i]);
    }
    var limit = "";
    if(req.query.iDisplayStart && req.query.iDisplayLength != '-1') {
        limit = "\nLIMIT " + parseInt(req.query.iDisplayStart) + ", " + parseInt(req.query.iDisplayLength)
    }

    var order = "";

    if ( req.query.iSortCol_0 ) {
        order = "\nORDER BY  ";
        for( var i = 0; i < parseInt(req.query.iSortingCols); i++){
            iSortCol = parseInt(req.query["iSortCol_" + i]);
            if(req.query["bSortable_" + iSortCol] == "true"){
                var dir = "";
                if(req.query["sSortDir_" + i] == 'asc'){
                    dir = "ASC";
                } else {
                    dir = "DESC";
                }
                order += columns[iSortCol] + " " + dir  + ", ";
            }
            order = order.slice(0, -2);
            if (order == "\nORDER BY") {
                order = "";
            }
        }
    }

    where = "";
    if ( req.query.sSearch ){
        where = "\nWHERE (";
        for(var i = 0; i < columns.length; i++){
            where += columns[i] +  "LIKE '%" + thisConnection.escape(req.query.sSearch).slice(1, -1) + "%' OR ";
        }
        where = where.slice(0, -3);
        where += ')';
    }

    for( var i = 0; i < columns.length; i++) {
        if(req.query["bSearchable_" + i] == "true" && req.query["sSearch_" + i]) {
            if(where == "")
                where = "\nWHERE ";
            else
                where += " AND ";
            where += columns[i] + " LIKE '%" + thisConnection.escape(req.query["sSearch_" + i]).slice(1, -1) + "%' ";
        }
    };

    query = "SELECT SQL_CALC_FOUND_ROWS " + columns.join(", ") + "\nFROM " + req.params.current_table + where +  order +  limit;

    thisConnection.query(query, function(err, rows){
        if(err) res.send(500, err);
        var result = rows;
        thisConnection.query("SELECT FOUND_ROWS()", function(err, rows){
            if(err) res.send(500, err);

            var iFilteredTotal = rows[0]['FOUND_ROWS()'];

            thisConnection.query("SELECT COUNT(" + columns[0] + ") FROM " + req.params.current_table, function(err, rows){
                if(err) res.send(500, err);

                var iTotal = rows[0]['COUNT(' + columns[0] + ')'];

                var output = {
                    sEcho: parseInt(req.query.sEcho),
                    iTotalRecords: iTotal,
                    iTotalDisplayRecords: iFilteredTotal,
                    aaData: []
                }

                for(var i in result){
                    var row = [];
                    for (var j in result[i]) {
                        row.push(result[i][j]);
                    }
                    output.aaData.push(row);
                }
                res.send(output);
            });
        });
    });

});

app.post('/update_table/:current_table', function(req, res){
    thisConnection = connection_obj[req.body.socket_id];
    var query = "UPDATE " + mysql.escapeId(req.params.current_table) + "\nSET ";
    query += mysql.escapeId(req.body.columns[parseInt(req.body.column)]) + "=" + thisConnection.escape(req.body.value)
    query += "\nWHERE "
    for(var i in req.body.columns){
        query += mysql.escapeId(req.body.columns[i]) + "=" + thisConnection.escape(req.body.row_vals[i]) + " AND "
    }
    query = query.slice(0, -5);
    thisConnection.query(query, function(err, rows){
        if(err) res.send(err);

        res.send(req.body.value);
    });
});

app.use(function(req, res, next) {
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
