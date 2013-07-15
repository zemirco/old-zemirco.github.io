---
layout: post
title: "Sync multiple AngularJS apps without server via PouchDB"
date: 2013-07-10 20:34
comments: true
categories: [Angular.js, PouchDB, CouchDB]
---

Nowadays several solutions exist to keep web apps in sync and/or store data offline with JavaScript:

 - [Socket.io](http://socket.io/)
 - [Breeze.js](http://www.breezejs.com/)
 - [TowTruck](https://towtruck.mozillalabs.com/)
 - [Firebase](https://www.firebase.com/)
 - [Pusher](http://pusher.com/)
 - [Parse](https://parse.com/products)
 - and my latest favorite [Hood.ie](http://hood.ie/)

I could go on with that list but you get the idea. Some of the mentioned technologies are more powerful
and have more features out of the box than others. They usually need a server that runs your app and
takes care of all the business logic. In this post I will demonstrate how to build a web app that
syncs data automatically, runs on all modern platforms, stores data persistently and **doesn't need a server**.
The app is powered by [AngularJS](http://angularjs.org/) and [PouchDB](http://pouchdb.com/).

The video shows the final app in action. On the left side we have Chrome and Firefox showing our `index.html` from file and
on the right side you can see Futon, the admin panel for CouchDB.

<iframe width="640" height="480" src="http://www.youtube.com/embed/QSC1fnfUlU0" frameborder="0" allowfullscreen></iframe>
<br>
<br>

### Install CouchDB


First of all you have to install CouchDB. You could use some third party instance provider like [Cloudant](https://cloudant.com/) 
 or [Iris Couch](http://www.iriscouch.com/). However our final example won't work with them because we need to have CORS enabled on our CouchDB.
 CORS was introduced with v1.3. Cloudant instances are running on v1.0.2 whereas Iris Couch actually provides
  v1.3. Sadly you cannot enable CORS by hand. That's why we will work with our own instance.
  
Go to [couchdb.apache.org](http://couchdb.apache.org/) and click on the big fat download button. Download
the package for your operating system, select a mirror, wait and then open CouchDB. On my MacBook I get
a little CouchDB icon on my Menu Bar. Click on it and select **Open admin console**. Or just open your browser and navigate to
[127.0.0.1:5984/_utils](http://127.0.0.1:5984/_utils/). You are now inside Futon, which is the admin tool for CouchDB.

First of all we have to [enable CORS](http://docs.couchdb.org/en/latest/cors.html). Go to section *httpd* and
set **enable_cors** to true. Navigate to the bottom of the page and click on **Add a new section**. Enter the following into
the form that pops up

 - section: cors
 - option: origins
 - value: *

Now let's create our database. Click on **Create database ...** and enter `ng-db`. The name is important and we have
to use the exact name later on for the client code. That's it! Our CouchDB instance is running, CORS is enabled
and we have a database to work with. Next install PouchDB.

### Download PouchDB

To add PouchDB to your app you simply have to [download](http://download.pouchdb.com/pouchdb-nightly.min.js) the JS file. As always I recommend working with the
non-minified version during development and switch to the min version for deployment. Include the .js file inside
your index.html.

```html
<script src="pouchdb.js"></script>
```

Done. We can now start using PouchDB in our app.

### Create AngularJS app

Activate AngularJS as shown in the [docs](http://angularjs.org/).

```js
var myApp = angular.module('myApp', []);
```

#### PouchDB service

The first service we create simply makes the PouchDB instance available inside the AngularJS world.
It also turns on continuous replication so changes are automatically synced between database and client
no matter where they occur.

```js
myApp.factory('myPouch', [function() {

  var mydb = new Pouch('ng-pouch');
  Pouch.replicate('ng-pouch', 'http://127.0.0.1:5984/ng-db', {continuous: true});
  Pouch.replicate('http://127.0.0.1:5984/ng-db', 'ng-pouch', {continuous: true});
  return mydb;
  
}]);
```

#### PouchDB promises wrapper

Our second service is a simple wrapper around PouchDB's native API to save and remove documents. The
service provides two helper functions `return()` and `remove(id)` that both return promises. That keeps
the async code nice and tidy.

```js
myApp.factory('pouchWrapper', ['$q', '$rootScope', 'myPouch', function($q, $rootScope, myPouch) {
  
  return {
    add: function(text) {
      var deferred = $q.defer();
      var doc = {
        type: 'todo',
        text: text
      };
      myPouch.post(doc, function(err, res) {
        $rootScope.$apply(function() {
          if (err) {
            deferred.reject(err)
          } else {
            deferred.resolve(res)
          }
        });
      });
      return deferred.promise;
    },
    remove: function(id) {
      var deferred = $q.defer();
      myPouch.get(id, function(err, doc) {
        $rootScope.$apply(function() {
          if (err) {
            deferred.reject(err);
          } else {
            myPouch.remove(doc, function(err, res) {
              $rootScope.$apply(function() {
                if (err) {
                  deferred.reject(err)
                } else {
                  deferred.resolve(res)
                }
              });
            });
          }
        });
      });
      return deferred.promise;
    }
  }
  
}]);
```

#### PouchDB event listener

Our last service is a listener that emits events whenever PouchDB fires the `onChange` event. It either
emits `newTodo` when a new document is added to the database or `delTodo` when a document is deleted. The change 
object coming from PouchDB looks like the following

```
{
  "id": "6F48205D-E97B-4621-ACAD-4CD3DFAC074E",
  "seq": 1,
  "changes": [{"rev":"2-96ea3cf93a75c6510c08c95e42686aa1"}],
  "deleted": true
} 
```

From the key `deleted` we get a Boolean value that tells us if the change was a deletion or an addition
to our database. If the value is `true` we know that an object was deleted from our database and we therefore
emit a `delTodo` event with the document id. If the value is `false` we unfortunately don't get the new 
object directly from the `onChange` handler. We only get the document id and have to manually get it
via GET request. At the end we fire a `newTodo` event with the new document as data.

```js
myApp.factory('listener', ['$rootScope', 'myPouch', function($rootScope, myPouch) {
  
  myPouch.changes({
    continuous: true,
    onChange: function(change) {
      if (!change.deleted) {
        $rootScope.$apply(function() {
          myPouch.get(change.id, function(err, doc) {
            $rootScope.$apply(function() {
              if (err) console.log(err);
              $rootScope.$broadcast('newTodo', doc);
            })
          });
        })
      } else {
        $rootScope.$apply(function() {
          $rootScope.$broadcast('delTodo', change.id);
        });
      }
    }
  })
}]);
```

#### Main controller

Our controller combines the three services and creates a link to our view. First of all we create
an empty array that will hold our todo objects. The `submit()` function
is executed whenever the **Add** button is clicked. A click on the small cross calls the `remove(id)`
function. 

At the end of our controller we have the listener for our two custom events `newTodo` and `delTodo`.
It adds or removes items from the `todos` array.

```js
myApp.controller('TodoCtrl', ['$scope', 'listener', 'pouchWrapper', function($scope, listener, pouchWrapper) {
  
  $scope.submit = function() {
    pouchWrapper.add($scope.text).then(function(res) {
      $scope.text = '';
    }, function(reason) {
      console.log(reason);
    })
  };
  
  $scope.remove = function(id) {
    pouchWrapper.remove(id).then(function(res) {
//      console.log(res);
    }, function(reason) {
      console.log(reason);
    })
  };
  
  $scope.todos = [];
  
  $scope.$on('newTodo', function(event, todo) {
    $scope.todos.push(todo);
  });
  
  $scope.$on('delTodo', function(event, id) {
    for (var i = 0; i<$scope.todos.length; i++) {
      if ($scope.todos[i]._id === id) {
        $scope.todos.splice(i,1);
      }
    }
  });
  
}]);
```

One thing I haven't figured out yet is an error message similar to:

```html
GET http://127.0.0.1:5984/ng-db/_local%2F4e458454e3c7031672110dc4a02c72f4 404 (Object Not Found) 
```

The rest works absolutely fine and although I get this error message I can't see any problems during sync.

### Conclusion

We used AngularJS and PouchDB to build a small app that syncs serverless and stores data persistently.
 Changes are distributed automatically. They can be made inside the database, on any client or on any third
 party device that pushes changes to the connected CouchDB. AngularJS events update our models in the controller that pushes
 changes to our views via two-way data binding. It is possible to add todos to the app when offline and 
 as soon you are back online all data is synced to the connected devices. For more information about
 the topic visit [nobackend.org](http://nobackend.org/).