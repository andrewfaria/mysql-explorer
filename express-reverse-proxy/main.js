var request = require('request');

module.exports = function(app, url, port, route){
  var PROXY_URL = url + ':' + port + '/' + route;

  app.use(function(req, res, next){
    var re = new RegExp("^\/" + route + "(.*)$")
    var proxy_path = req.path.match(re);
    if(proxy_path){
      var proxy_url = PROXY_URL + proxy_path[1];
      req.pipe(request({
        uri: proxy_url,
        method: req.method
      })).pipe(res);
    } else {
      next();
    }
  });
}
