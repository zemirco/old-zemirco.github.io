---
layout: post
title: "Building offline applications with AngularJS and PouchDB"
date: 2013-06-17 19:20
comments: true
categories: [offline, Angular.js, PouchDB]
---

You may have read my other post about [Async CouchDB queries with nano and promises](http://mircozeiss.com/async-couchdb-queries-with-nano-and-promises/). In that post I built a small app to track how many goals a player
scored per match. Every action was stored as a single document in CouchDB. JavaScript promises were
used to access the data which allowed functions be easily reused.

In this article I will build the same application without any backend. I use [PouchDB](http://pouchdb.com/) as my database
and [AngularJS](http://angularjs.org/) as the frontend framework.

### PouchDB

I'd like to talk a little more about PouchDB since you can find a lot of intro articles for AngularJS
but not as many for PouchDB.

> PouchDB is a JavaScript library that allows you to store and query data for web applications that need to work offline, and sync with an online database when you are online.

PouchDB provides the same API as CouchDB but works in the browser. If you already know CouchDB you 
also know how to work with PouchDB. The library is under active development and currently available as an alpha version.
Although it is an alpha version it is very stable and so far I didn't have any problems with the code.

The [documentation](http://pouchdb.com/api.html) is a good starting point. Some handy features that were added recently and are not yet in the
documentation are

 - built in map reduce functions
 - and query functions.
 
#### Built in map reduce functions

You might know the built in map reduce functions from CouchDB. They are `_count`, `_sum` and `_stats`. All are written in Erlang
and allow fast access to your data. PouchDB also has those built in functions. Therefore you don't have to write your own and pass them as
a parameter into the query function. A simple query looks like the following.

```js
var map = function(doc) {
  if (doc.type === 'goal') {
    emit(doc.playerId, null)
  }
};

pouchdb.query({map: map, reduce: '_count'}, {key: '1'}, function(err, res) {
  if (err) console.log(err);
  console.log(res);
});
```

The code above loops through all documents in our db. Whenever the mapping function finds one that has the type `goal` it emits it sorted by
`playerId`. The query function afterwards simply counts all documents with the playerID `'1'` and returns the sum.

Here is the code for the all the built in functions so you know what they do.

`_count` [(source)](https://github.com/daleharvey/pouchdb/blob/master/src/plugins/pouchdb.mapreduce.js#L37) counts all documents.

```js
function(keys, values, rereduce){
  if (rereduce){
    return sum(values);
  } else {
    return values.length;
  }
}
```

`_sum` [(source)](https://github.com/daleharvey/pouchdb/blob/master/src/plugins/pouchdb.mapreduce.js#L33) returns the sum of all document values.
It would return the same value as `_count` when every document is emitted with values equals `1`.

```js
function(keys, values){
  return sum(values);
}
```

`_stats` [(source)](https://github.com/daleharvey/pouchdb/blob/master/src/plugins/pouchdb.mapreduce.js#L45) provides some basic statistical
analysis for our data.

```js
function(keys, values, rereduce){
  return {
    'sum': sum(values),
    'min': Math.min.apply(null, values),
    'max': Math.max.apply(null, values),
    'count': values.length,
    'sumsqr': (function(){
      var _sumsqr = 0;
      for(var idx in values){
        _sumsqr += values[idx] * values[idx];
      }
      return _sumsqr;
    })()
  };
  }
```

#### Query functions

Query functions are needed to [fetch a document](http://pouchdb.com/api.html#fetch_a_document) when you don't know the document's ID. I couldn't find anything about query 
functions with individual keys in the documentation. So I looked at the tests and found the [test](https://github.com/daleharvey/pouchdb/blob/decb29d057065f01a6121e129b24cd02240ef1b2/tests/test.views.js#L109-L124)
for opts.key.

```js
db.query(queryFun, {reduce: false, key: 'key2'}, function(_, res) {
  equal(res.rows.length, 1, 'Doc with key');
  db.query(queryFun, {reduce: false, key: 'key3'}, function(_, res) {
    equal(res.rows.length, 2, 'Multiple docs with key');
    start();
  });
});
```

It shows that we can simply use the `key` property to look for specific results in our db. The same goes for `startkey` and `endkey` 
 properties. Their documentation is in section [fetch documents](http://pouchdb.com/api.html#fetch_documents) describing the `allDocs()` method.

### Marry PouchDB and AngularJS

Since both frameworks are implemented independently, they don't know how to work with each other. We
have to bring PouchDB into the AngularJS world in order to have access from the controller. The best
way to do this is using a `service`.

```js
services.factory('pouchdb', function() {
  Pouch.enableAllDbs = true;
  return new Pouch('myPouch');
});
```

Inject this service whenever you want to use PouchDB from your controller.

```js
myApp.controller('AppCtrl', ['$scope', 'pouchdb', function($scope, pouchdb) {
  // more code here
}]);
```

### Wrapping PouchDB into promises

The PouchDB API will probably support promises at some point [in the future](https://github.com/daleharvey/pouchdb/issues/608). At the moment it does not.
If you've read my post about [async CouchDB queries with nano and promises](http://mircozeiss.com/async-couchdb-queries-with-nano-and-promises/), you know
promises come in really handy. As AngularJS offers promises through the `$q` module we can build some wrapper functions to interact with our data.

The wrapper is an AngularJS **factory** and consists of two functions. The first one `add(playerId)` adds a goal document to the db.

```js
add: function(playerId) {
  var deferred = $q.defer();
  var doc = {
    type: 'goal',
    playerId: playerId
  };
  pouchdb.post(doc, function(err, res) {
    $rootScope.$apply(function() {
      if (err) {
        deferred.reject(err)
      } else {
        deferred.resolve(res)
      }
    });
  });
  return deferred.promise;
}
```

We need the `$rootScope.$apply()` function because AngularJS doesn't know what's happening inside the `pouchdb.post()` callback.
It loses the scope and would neither `reject` nor `resolve` the promise. Read more about this topic at [AngularJS and scope.$apply](http://jimhoskins.com/2012/12/17/angularjs-and-apply.html)
by Jim Hoskins.

The second function `getScore(playerId)` counts all documents per player and returns the total amount. If no documents are found 
for a certain `playerId` it returns 0.

```js
getScore: function(playerId) {
  var deferred = $q.defer();
  var map = function(doc) {
    if (doc.type === 'goal') {
      emit(doc.playerId, null)
    }
  };
  pouchdb.query({map: map, reduce: '_count'}, {key: playerId}, function(err, res) {
    $rootScope.$apply(function() {
      if (err) {
        deferred.reject(err);
      } else {
        if (!res.rows.length) {
          deferred.resolve(0);
        } else {
          deferred.resolve(res.rows[0].value);
        }
      }
    });
  });
  return deferred.promise;
}
```

We can now inject this helper service into our controller and start using it. First of all get the score for each player
on page load.

```js
$q.all([
  pp.getScore('1'),
  pp.getScore('2'),
  pp.getScore('3')
]).then(function(res) {
    $scope.score['1'] = res[0];
    $scope.score['2'] = res[1];
    $scope.score['3'] = res[2]
  });
```

A click on a button invokes the `incScore()` function that calls our `add()` from the helper service. It creates a new
document, saves it to db and calculates the new score.
 
```js
$scope.incScore = function(id) {
  pp.add(id)
    .then(function(res) {
      return pp.getScore(id);
    })
    .then(function(score) {
      $scope.score[id] = score;
    })
}
```

A working example with all code can be found at [plnkr#BoxJTY](http://plnkr.co/edit/BoxJTY?p=preview). Play with the scores of each player and afterwards
close your browser. Then open your browser again and navigate to the example page. Et voilà, the individual scores stay the same. The
values were stored in the browser's db, completely offline. Be careful when you empty the cache. All 
values will be lost. You will also notice that when you visit the example with a different browser the
individual scores are not the same. That's because each browser (even each browser version) uses its own
private database that is not shared with other browsers or browser versions. If you want to transfer the score
to other browsers or mobile devices you have to implement a backend solution.

### Testing

Not long ago I tweeted the following

<blockquote class="twitter-tweet"><p>when writing your next uber <a href="https://twitter.com/search/%23angularjs">#angularjs</a> blog post provide appropriate tests</p>&mdash; Mirco Zeiss (@zeMirco) <a href="https://twitter.com/zeMirco/status/344182488098291713">June 10, 2013</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

The AngularJS folks are quite passionate about testing and so am I. It can be annoying sometimes and of course
takes more time but it is well worth it and will one day save your a**. In addition it will improve 
the quality of your code and therefore the quality of your blog post.

So let's write some tests for our new services. Before we start we have to think about which 
things can actually be tested.

1. `Pouch.enableAllDbs` should be set to `true`
2. The returned object should be an instance of Pouch
3. The name of our db should be **myPouch**
4. The service should be able to save an object to db
5. The service should be able to retrieve an object from db

When all the above tests pass we can be pretty sure that we've done a good job.

#### 1. Check if enableAllDbs is set to true

Setting `enableAllDbs` to `true` isn't necessary for this small example app. However if you'd like
to obtain a list of all databases one day this feature must have been set to `true` in advance.

The test looks like this.

```js
it('should set "enableAllDbs" to true', inject(function(pouchdb) {
  expect(Pouch.enableAllDbs).toBeTruthy();
}));
```

That was easy. Just three lines of code. Cool, testing is fun!

#### 2. Verify the constructor of the object returned from the service

This is also a very simple test.

```js
it('should return a Pouch instance', inject(function(pouchdb) {
  expect(pouchdb instanceof Pouch).toBeTruthy();
}));
```

Really that's it? Yep quite nice, right?

#### 3. Verify the name of our db

I'm sorry but I have to disappoint you. Testing is not always as easy as in the first two examples. The following is an asynchronous test and that's not as
simple with AngularJS and Jasmine. 

```js
it('should create a db with name "myPouch"', inject(function(pouchdb) {
  var result;
  
  pouchdb.info(function(err, res) {
    result = res;
  });
  
  waitsFor(function() {
    return result;
  });
  
  runs(function() {
    expect(result.db_name).toEqual('_pouch_myPouch');
  });
  
}));
```

First we have to call the `info()` method which gives us some information
about our db in the callback. Within that callback we save the info to our global variable `result`. The
`waitsFor()` and `runs()` functions are needed by Jasmine to wait for the result from our info callback and
then continue with the test.

#### 4. Test if service can save objects to db

For this test we simply use our new service, save an object to the database and check for the correct callback.

```js
it('should allow saving new objects via a promise', inject(function(pp) {
  var result;
  
  pp.add('1').then(function(res) {
    result = res;
  });
  
  waitsFor(function() {
    return result;
  });
  
  runs(function() {
    expect(result.ok).toBeTruthy();
  });
  
}));
```

#### 5. Test if service can retrieve objects from db

For our last test we try to retrieve the before saved object and check whether we got the right score.

```js
it('should allow retrieving new objects via a promise', inject(function(pp) {
  var result;
  
  pp.getScore('1').then(function(res) {
    result = res;
  });
  
  waitsFor(function() {
    return result;
  });
  
  runs(function() {
    expect(result).toBe(1);
  });
  
}));
```

That's it! We can now safely assume that our service is working correctly and does what we expect.

### Conclusion

AngularJS and PouchDB are awesome frameworks. I hope their engineers 
and the community will support both for a long time to come. Combined they are a match made in heaven. AngularJS gives you all the
tools to keep your frontend code nice and tidy while PouchDB takes care of your data. Use both to write
offline applications that run in the browser on every modern device.