---
layout: post
title: "How to pass JavaScript variables from a server to Angular.js"
comments: true
categories:
twitter_desc: "Three different solutions for passing data from Express.js to an Angular.js controller"
---

I came across the problem of sending JavaScript variables from my backend,
in this case an [Express.js](http://expressjs.com/) server,
to my frontend, means an [Angular.js](http://angularjs.org/) controller. I'm using [Jade](http://jade-lang.com/) as my template engine but the
presented solutions should work with others, too.

Basically you've got three options for doing this:

  1. Put the variable into the view file inside a `script` tag
  2. Make an HTTP request from Angular and serve the data as JSON from the
  backend
  3. Be smart and use `ng-init`

At the end of the article you find a link to a GitHub repo containing working
examples for all the presented solutions. To play with the code fork and
modify it according to your needs or start from scratch and add code while
reading on. So, let's start.

First create an empty directory, use `express` command to create all necessary files and run
`npm install` to download additional modules. At the end start your server with `node app.js`.

```bash
mkdir express-to-ngcontroller
cd express-to-ngcontroller
express
npm install
node app.js
```

Afterwards you should see the message

```bash
Express server listening on port 3000
```

So far we've just set up our backend. Now it's time to add some Angular code to your `layout.jade`.

```
doctype 5
html(ng-app)
  head
    title= title
    link(rel='stylesheet', href='/stylesheets/style.css')
    script(src="https://ajax.googleapis.com/ajax/libs/angularjs/1.0.6/angular.min.js")
    script(src="/javascripts/controller.js")
  body
    a(href="/solution-one") solution one
    span -
    a(href="/solution-two") solution two
    span -
    a(href="/solution-three") solution three
    block content
```

Let's have a look at the above code. Activate Angular for the whole page by
adding `ng-app` as an attribute to the `html` tag. Load `angular.min.js` from
 Google CDN and `controller.js` from file. Inside the body I created a basic
 menu to navigate from one
solution to the other.

Last but not least create some dummy data at the server. In production this
data is loaded from a database, but in this example I want to keep everything
 nice and simple. Copy the following code to your `app.js`.

```js
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
```

Now everything should be set up and we can start tinkering with the different
 solutions.

### 1. Put variable inside view file

Inside your `app.js` file create an additional route for `GET /solution-one`

```javascript
app.get('/solution-one', function(req, res) {
  res.render('solutionOne', {
    title: 'Express and Angular marriage',
    users: users
  })
});
```

We pass our `users` object to the view as a local variable named
`users`. Running this code would throw an error as we haven't created the view
`solutionOne.jade` yet. Create this file inside the `views/` directory and
put the following code inside

{% raw %}

```
extends layout

block content
  div(ng-controller="UserCtrl")
    h1= title
    p Welcome to #{title}
    ul
      li(ng-repeat="user in users") {{ user.name }} - {{user.email}}
  script
    var users = !{JSON.stringify(users)}
```
{% endraw %}

With `ng-controller="UserCtrl"` we tell Angular which controller we'd like
 to use for all the DOM children of this element. At the bottom of the file
 we've put some extra JavaScript with a global variable called `users` that
 loads the contents from the local variable `users` passed to the view.
 Notice that we have to use `!{}` instead of `#{}`, which is usually used in
 Jade for interpolation. However `#{}` escapes HTML code and would create
 something like this

```js
var users = {&quot;1&quot;:{&quot;name&quot;:&quot;john&quot;,&quot;email&quot;:&quot;john@email.com&quot;},&quot;2&quot;:{&quot;name&quot;:&quot;peter&quot;,&quot;email&quot;:&quot;peter@email.com&quot;},&quot;3&quot;:{&quot;name&quot;:&quot;max&quot;,&quot;email&quot;:&quot;max@email.com&quot;}}
```

That's not what we want. We want a nicely formatted String representation of
our JSON object. That's why we need `!{}`.

Then we need to load the content of this variable into our Angular scope.
This is necessary for the `ng-repeat` directive as it doesn't work with
variables which are outside of the Angular scope. Open `controller.js` and
 put the following code inside.

```js
function UserCtrl($scope) {
  $scope.users = users;
}
```

Start the server with `node app.js` and navigate to `/solution-one`. You
should see a list with our three users where each list item contains the
`name` and `email`. Nice, solution one works but let's have a look at the
pros and cons.

#### Pro

Solution one is probably the easiest to understand and fastet to implement.
Every step is comprehensible and nothing fancy is going on.

#### Contra

Using global variables in JavaScript is a No-Go. However in this case it is
not that bad as the content of the global variable `users` is loaded into
scope at page load. Manipulating `users` afterwards doesn't have any effects
on the scope and our frontend.

Still it is not the best solution. Let's look at another one.

### 2. HTTP request from Angular to a JSON API

Inside `app.js` create another route for `GET /solution-two`

```js
app.get('/solution-two', function(req, res) {
  res.render('solutionTwo', {
    title: 'Express and Angular marriage'
  })
});
```

and create the view `solutionTwo.jade` inside the `views/` folder with the
following content

{% raw %}

```
extends layout

block content
  div(ng-controller="UserTwoCtrl")
    h1= title
    p Welcome to #{title}
    ul
      li(ng-repeat="user in users") {{user.name}} - {{user.email}}
```

{% endraw %}

You might have noticed that we haven't passed any data as local variables
from our Express backend to the view. When you start the server and navigate
with your browser to `/solution-one` you won't see any users listed. We did
add another controller `UserTwoCtrl` to our view and we will add some
functionality now.

```js
function UserTwoCtrl($scope, $http) {
  $http.get('/solution-two/data').success(function(data) {
    $scope.users = data
  })
}
```

As soon as the controller is initiated by Angular it automatically makes a
 GET request to `/solution-two/data` and assigns the fetched data to `$scope.users`.
 Now refresh the page and see what happened. You should see an
 error saying

```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

Your terminal running the server should log

```
GET /solution-two/data 404
```

It simply means that we haven't implemented the route `GET
/solution-two/data` yet. So let's do this by adding the following code to the
 `app.js` file

```js
app.get('/solution-two/data', function(req, res) {
  res.json(users);
});
```

Restart the server and with your browser go to `/solution-two/data`. You
should see our `users` object as JSON. Now go to `/solution-two` and, voila,
everything works as expected. Three list items are created each showing name
and email. The screenshot shows the extra request as the last action.

{% img https://s3.amazonaws.com/mircozeiss.com/angular-extra-http-request.png Angular HTTP request fetching JSON data %}

#### Pro

Making HTTP request in order to get JSON data is common these days.
Every major web service offers some kind of API to allow third party access.
In theses cases, where you don't have the necessary data on your own server,
it is the best solution to make an HTTP request from your frontend. You
could, of course, make the request from the server, get the data and send it
to the client as shown in solution one. This, however,
adds unnecessary overhead to our server and by calling the API from the
client we can save valuable ressources.

#### Contra

The second solutions needs the most additional code and also an extra route
from which the data is served as JSON. This can get a bit messy because you
basically have to serve every route twice. One for the view and one for the
data. Therefore it is still not the perfect solution which leads us to our last
method.

### 3. Be smart and use ng-init

The third and probably best solution makes use of the [ngInit](http://docs-angularjs-org-dev.appspot.com/api/ng.directive:ngInit) directive.

> The ngInit directive specifies initialization tasks to be executed before
the template enters execution mode during bootstrap.

What does that mean?

Short answer: The expression (variable + content) given to ngInit is loaded
into scope and made available under this name.

Let's have a look at the example from the Angular docs

{% raw %}

```html
<!doctype html>
<html ng-app>
  <head>
    <script src="http://code.angularjs.org/angular-1.0.2.min.js"></script>
  </head>
  <body>
    <div ng-init="greeting='Hello'; person='World'">
      {{greeting}} {{person}}!
    </div>
  </body>
</html>
```

{% endraw %}

The variable `$scope.greeting` holds the String `'Hello'` and `$scope.person='World'`. Both are avaible inside the scope although not explicitly
 specified inside a controller.

We could rewrite and simplify the example like this

```js
function MyCtrl($scope) {
  $scope.greeting = 'Hello';
  $scope.person = 'World'
}
```

and

{% raw %}

```html
<!doctype html>
<html ng-app>
  <head>
    <script src="http://code.angularjs.org/angular-1.0.2.min.js"></script>
    <script src="/javascripts/controller.js"></script>
  </head>
  <body>
    <div ng-controller="MyCtrl">
      {{greeting}} {{person}}!
    </div>
  </body>
</html>
```

{% endraw %}

So let's combine this approach and our initial problem. First,
add a new route `GET /solution-three` to `app.js` and create the
corresponding view `solutionThree.jade`:

```js
app.get('/solution-three', function(req, res) {
  res.render('solutionThree', {
    title: 'Express and Angular marriage',
    users: users
  })
});
```

{% raw %}


```
extends layout

block content
  div(ng-controller="UserThreeCtrl", ng-init="users= #{JSON.stringify(users)}")
    h1= title
    p Welcome to #{title}
    ul
      li(ng-repeat="user in users") {{user.name}} - {{user.email}}
```

{% endraw %}

As you can see we pass our `users` variable to the Jade template as a local
variable. Inside the template we convert the JSON object to its String
representation and assign it to the Angular variable `users`. Later on we
have access to this variable and use a regular `ngRepeat` directive to create
 the list of users. Start the server, navigate to `/solution-three` and
 you should the the expected list of users.

#### Pro

It is the cleanest solution. We don't have to use global variables and we
don't have to make an extra HTTP request. It is also the solution that needs
the least amount of code.

#### Contra

The concept behind `ngInit` might be a bit confusing at the beginning. For
further insights and to understand how Angular actually renders a page I
recommend reading [Bootstrap](http://docs.angularjs.org/guide/bootstrap) (not
 related to [Twitter's Bootstrap](http://twitter.github.io/bootstrap/)) and
 [HTML Compiler](http://docs.angularjs.org/guide/compiler).

### Conclusion

You've learned that several solutions exist for passing data from your backend to an Angular
controller. While solution one being the worst it depends on your architecture and your requirements
whether solution two or three fits better. I personally tend to use the last solution as I have to make
one less request to the server.

As promised at the beginning you can find the working example at GitHub under
 [server-vars-ngcontroller](https://github.com/zeMirco/zemirco.github.io/tree/source/code-examples/server-vars-ngcontroller).

**Pro Tip**: Don't mix Jade's `for user in users` and `ng-repeat="user in users"`
 from Angular. I did that once at the beginning and was totally frustrated
 because nothing worked as expected. You can image my feelings when I found
 that mistake. Well, it was late that night!