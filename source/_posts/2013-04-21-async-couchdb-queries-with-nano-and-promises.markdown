---
layout: post
title: "Async CouchDB queries with nano and promises"
comments: true
categories: [CouchDB, Promises, nano, MapReduce]
---

This post is about CouchDB and its `MapReduce` functionality. I'll use simple `reduce`
functions to gather some statistics about soccer players. [Nano](https://github.com/dscape/nano)
is used the query the database from
Node.js. To keep our code nice and tidy we'll make use of [Promises](https://github.com/promises-aplus/promises-spec)
through the [q](https://github.com/kriskowal/q) module.

### 1. CouchDB architecture

Assuming we want to record every goal in a match and create some statistics to see who
 scored the most goals. Each goal is a single document in our CouchDB database

```js
{
   "_id": "ee2459df977d62d196872dd0ae63ea13",
   "_rev": "1-e00b4c6130d022e7336cdafacd18f93a",
   "playerId": "4",
   "type": "goal"
}
```

The `type` key simply helps to differentiate between other documents (could be players with
name, age, price, etc.) and our `goal` documents.

With a simple `map` function we get every goal by player

```js
function(doc) {
  if (doc.type === 'goal') {
    emit(doc.playerId, 1)
  }
}
```

The result of the `map` function looks similar to the following table

<table class="table table-striped table-hover table-condensed table-bordered">
  <thead>
    <tr>
      <th>Key</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>“4”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“4”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“3”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“2”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“1”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“1”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“1”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“1”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“1”</td>
      <td>1</td>
    </tr>
  </tbody>
</table>

The **key** represents the `playerId` and the **value** is `1` for every key. We need this
**value**
later on to calculate the total amout of goals scored by each player.

To get this total amout of goals we simply have to sum up all **values** per player. Therefore our `reduce`
function looks like this

```js
_sum
```

`_sum` is a built in `reduce` function provided by CouchDB. More native functions can be found in the
[CouchDB Wiki](http://wiki.apache.org/couchdb/Built-In_Reduce_Functions). The result of the above function looks like this

<table class="table table-striped table-hover table-condensed table-bordered">
  <thead>
    <tr>
      <th>Key</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>“4”</td>
      <td>2</td>
    </tr>
    <tr>
      <td>“3”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“2”</td>
      <td>1</td>
    </tr>
    <tr>
      <td>“1”</td>
      <td>5</td>
    </tr>
  </tbody>
</table>

That's exactly what we wanted. We can now query our view and pass the playerId as **key** to get the final value.

### 2. Using the database with nano

Several modules exist on [npm](https://npmjs.org/search?q=couchdb) to interact with CouchDB. The most popular ones are
probably

 - [nano](https://github.com/dscape/nano) and
 - [cradle](https://github.com/cloudhead/cradle)

In this post I'll use nano. I haven't used cradle yet but I'm sure it offers similar functionality.

To save new documents to our db we use the `insert` function

```js
var id = "1";

var doc = {
  playerId: id
};

nano.insert(doc, function(err, body) {
  if (err) console.log(err);
  console.log('done');
});
```

The total amout of goals scored by each player is provided by the above created `MapReduce` function. We
can query this view using nano's `view` function

```js
nano.view('goals', 'byPlayer_sum', {key: playerId}, function(err, body) {
  if (err) console.log(err);
  if (!body.rows.length) {
    // no goals for this player
    console.log(0);
  } else {
    console.log(body.rows[0].value);
  }
});
```

This gives us the sum for each player that we pass to CouchDB as a parameter `{key: playerId}`.

So, now we can store new documents and retrieve the sum via nano from our db. The problem is loading
multiple sums for different players at the same time and then display the results to our users. The easiest solution
is using a series of callback functions

```js
nano.view('goals', 'byPlayer_sum', {key: 1}, function(err, bodyOne) {
  nano.view('goals', 'byPlayer_sum', {key: 2}, function(err, bodyTwo) {
     nano.view('goals', 'byPlayer_sum', {key: 3}, function(err, bodyThree) {
       nano.view('goals', 'byPlayer_sum', {key: 4}, function(err, bodyFour) {
         ...
       });
     });
  });
});
```

That approach leads to the famous spaghetti code/callback hell/pyramide/christmas tree/you name it. Another
huge drawback is that all the request are made one after the other. CouchDB is great in handling a lot of
concurrent requests (see [Why CouchDB?](http://guide.couchdb.org/draft/why.html)) so let's not waste this feature.

A second approach is making parallel requests and after each requests check if the others are already done.
If they are done, continue with the code. The idea works like this

```js
var done = [];
nano.view('goals', 'byPlayer_sum', {key: 1}, function(err, body) {
  done.push(body);
  if(done.length === 3) {
    continue();
  }
});

nano.view('goals', 'byPlayer_sum', {key: 2}, function(err, body) {
  done.push(body);
  if(done.length === 3) {
    continue();
  }
});

nano.view('goals', 'byPlayer_sum', {key: 3}, function(err, body) {
  done.push(body);
  if(done.length === 3) {
    continue();
  }
});

var continue = function() {
  // do something with the data in done
}
```

That isn't pretty either because we have to check for `done` in each request. Therefore let's use promises.

### 3. Wrapping query functions in promises

The defacto module for using promises is [q](https://github.com/kriskowal/q) by Kris Kowal. The documentation
is great and it is super easy to integrate as we will see now. Let's write a promise for saving new documents
to db

```js
var save = function(doc) {
  var deferred = Q.defer();

  nano.insert(doc, function(err, body) {
    if (err) {
      deferred.reject(new Error(err));
    } else {
      deferred.resolve(body);
    }
  })

  return deferred.promise;
}

```

Another promise would be retrieving the sum of goals for each player

```js
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
```

We can make use of these two functions as follows

```js
var doc = {
   "playerId": "4",
   "type": "goal"
};

save(doc)
  .then(function(body) {
    return getScore(4)
  }).then(function(score) {
    console.log(score);
  });
```

The above code almost reads like plain English. Save the new document to our db, then get the new score
for player with `id=4` and then log the score. Awesome!

We ended the second section with the problem of making multiple asyncronuous HTTP requests at the
 same time and deal with the values they each return. We already implemented the `getScore` function
  as a promise and used it in series with `then`. Using the same function more than once in parallel is
  almost as easy.

```js
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
```

`Q.all` turns an array of promises into a single promise. `Spread` does what it's named after
 and spreads the values over the arguments of our fulfillment handling function. That means
  `pOne` corresponds to the returned value of `getScore("1")`, `pTwo` to `getScore("2")` and so
  on. This makes it very easy to perform multiple asynchronuous HTTP request and continue as
soon as they are all done.

Here is a screenshot of a sample app I built to demonstrate all the principles I've talked about.

{% img https://s3.amazonaws.com/mircozeiss.com/couchdb-promises-nano.png Express app for analyzing soccer players %}


### Conclusion

CouchDB with Node.js, nano and q is a powerful combination. Huge web applications
 can be written while keeping a testable and maintainable structure. To learn more about promises
 I recommend watching the excellent talk by Alex McPherson [I .promise() to show you .when() to use Deferreds](http://www.youtube.com/watch?v=juRtEEsHI9E).
 In this post I didn't talk about [error handling](https://github.com/kriskowal/q#handling-errors) when using promises. That would have been too much,
 but make sure you always handle errors, as they might crash your whole application.

So start using promises today and
 follow the [unix philosophy](http://blog.izs.me/post/48281998870/unix-philosophy-and-node-js):

> Write programs that do one thing and do it well.

As always you can find the whole code with a working Express sample application at GitHub [couchdb-promises](https://github.com/zeMirco/zemirco.github.io/tree/source/code-examples/couchdb-promises).