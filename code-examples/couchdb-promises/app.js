
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

// get username and password from config file - NOT IN GITHUB REPO
// you have to use your own CouchDB instance
var config = require('./config.prod.json');
var nano = require('nano')('https://' + config.user +':' + config.pass + '@mirco.cloudant.com/blog-couchdb-promises/');

var Q = require('q');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/match', function(req, res) {

  Q.all([
    getScore("1"),
    getScore("2"),
    getScore("3"),
    getScore("4")
  ]).spread(function(pOne, pTwo, pThree, pFour) {
      res.render('match', {
        title: 'The match',
        john: pOne,
        jack: pTwo,
        chris: pThree,
        nick: pFour
      })
    })
});

app.post('/match', function(req, res) {
  var id = req.body.id;

  var doc = {
    playerId: id
  };

  save(doc)
    .then(function(body) {
      return getScore(id)
    }).then(function(score) {
      res.json({newScore: score});
    });

});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

// custom functions

// get score for player by playerId
var getScore = function(playerId) {

  var deferred = Q.defer();

  nano.view('goals', 'byPlayer_sum', {key: playerId}, function(err, body) {
    if (err) {
      deferred.reject(new Error(err));
    } else {
      if (!body.rows.length) {
        deferred.resolve(0);
      } else {
        deferred.resolve(body.rows[0].value);
      }
    }
  });

  return deferred.promise;

};

// save new docs to db
var save = function(doc) {

  var deferred = Q.defer();

  nano.insert(doc, function(err, body) {
    if (err) {
      deferred.reject(new Error(err));
    } else {
      deferred.resolve(body);
    }
  });

  return deferred.promise;

};