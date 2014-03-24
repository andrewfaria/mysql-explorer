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
        $('#table_holder').html('');
        $('#table_holder').append('<table id="selected_table" class="table table-striped table-bordered">');
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

    function switch_table(){
        var datTable = $('#selected_table').dataTable({
            //"sDom": "<'row'<'col-xs-6'T><'col-xs-6'f>r>t<'row'<'col-xs-6'i><'col-xs-6'p>>",
            "bProcessing": true,
            "bServerSide": true,
            "bLengthChange": true,
            "sAjaxSource": "/get_table_pages/" + current_table,
            fnServerParams: function( aoData ){
                aoData.push({"name":  "columns", "value": current_cols});
                aoData.push({"name":  "socket_id", "value": io.socket.sessionid});
            },
            fnDrawCallback: function( oSettings ){
                var oldVal = '&nbsp';
                $('td', datTable.fnGetNodes()).on('click', function(){
                    if($(this).text() != "Click to edit")
                        oldVal = $(this).text();
                    else
                        oldVal = "&nbsp;";
                });
                $('td', datTable.fnGetNodes()).editable('/update_table/' + current_table, {
                    "callback": function( sValue, y ) {
                        try{
                            sValue = JSON.parse(sValue);
                            console.log(sValue);
                        } catch(e) {
                            var aPos = datTable.fnGetPosition( this );
                            datTable.fnUpdate( sValue, aPos[0], aPos[1] );
                        }
                    },
                    "submitdata": function ( value, settings ) {
                        var row_vals = []
                        $(this).parent().find('td').each(function(){
                            if($(this).text() != "Click to edit")
                                row_vals.push($(this).text());
                            else
                                row_vals.push("&nbsp;");
                        });
                        row_vals[datTable.fnGetPosition( this )[2]] = oldVal;
                        return {
                            "columns": current_cols,
                            "socket_id": io.socket.sessionid,
                            "column" : datTable.fnGetPosition( this )[2],
                            "row_vals": row_vals
                        };
                    },
                    onblur : "submit",
                    height: "100%"
                });
            }
        });
    }

    io.on('table_switched', function(data){
        console.log(data);
        $('#table_holder').html('');
        $('#table_holder').append('<table id="selected_table" class="table table-striped table-bordered">');
        thead =$('<thead>')
        thead.append('<tr>');
        var first = true;
        tbody = $('<tbody>');
        current_cols = [];
        for( var i in data){
            for( var j in data[i]){
                if(first){
                    thead.find('tr').append('<th>' + j + '</th>');
                    current_cols.push(j);
                }
            }
            first = false;
        }
        $('#selected_table').append('<caption>' + current_table + '</caption>');
        $('#selected_table').append(thead);
        $('#selected_table').append(tbody);
        switch_table();
    });

    io.on('error', function(err){
        console.log(err);
    });
});
