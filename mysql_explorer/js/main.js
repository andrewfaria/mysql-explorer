var io = io.connect();
var current_db = '';
var current_table = '';
$(document).ready(function(){

    $('#login').on('click', function(){
        var login = {
            username: $('#mysql_name').val(),
            password: $('#mysql_pass').val()
        }
        io.emit('login', login);
    });

    io.on('login', function(data){
        console.log(data);
        $('#login_box').remove();
        var dbdiv = $('#database_chooser');
        for(var i in data){
            var dbbutton  = $('<div>' + data[i].Database + '</div>');
            dbbutton.on('click', function(){
                current_db = $(this).text();
                io.emit('switch_db', $(this).text());
            });
            dbdiv.append(dbbutton);
        }
    });

    io.on('db_switched', function(data){
        console.log(data);
        var tablediv = $('#table_chooser');
        $('#selected_table').html('');
        tablediv.html('');
        for(var i in data){
            var tablebutton = $('<div>' + data[i]['Tables_in_' + current_db] + '</div>');
            tablebutton.on('click', function(){
                current_table = $(this).text();
                io.emit('switch_table', $(this).text());
            });
            tablediv.append(tablebutton);
        }
    });

    io.on('table_switched', function(data){
        console.log(data);
        $('#selected_table').html('');
        thead =$('<thead>')
        thead.append('<tr>');
        var first = true;
        tbody = $('<tbody>');
        for( var i in data){
            var tbodyrow = $('<tr>');
            for( var j in data[i]){
                if(first){
                    thead.find('tr').append('<th>' + j + '</th>');
                }
                tbodyrow.append('<td>' + data[i][j] + '</td>');
            }
            tbody.append(tbodyrow);
            first = false;
        }
        $('#selected_table').append('<caption>' + current_table + '</caption>');
        $('#selected_table').append(thead);
        $('#selected_table').append(tbody);
    });

    io.on('error', function(err){
        console.log(err);
    });
});
