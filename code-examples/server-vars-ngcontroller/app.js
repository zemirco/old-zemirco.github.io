
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

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

//app.get('/', routes.index);

var users = {
  1: {
    name: 'john',
    email: 'john@email.com'
  },
  2: {
    name: 'peter',
    email: 'peter@email.com'
  },
  3: {
    name: 'max',
    email: 'max@email.com'
  }
};

app.get('/solution-one', function(req, res) {
  res.render('solutionOne', {
    title: 'Express and Angular marriage',
    users: users
  })
});

app.get('/solution-two', function(req, res) {
  res.render('solutionTwo', {
    title: 'Express and Angular marriage'
  })
});

app.get('/solution-two/data', function(req, res) {
  res.json(users);
});

app.get('/solution-three', function(req, res) {
  res.render('solutionThree', {
    title: 'Express and Angular marriage',
    users: users
  })
});

app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
