---
layout: post
title: "GitHub like signup form with AngularJS and Bootstrap v3"
date: 2013-08-21 22:37
comments: true
categories: [Angular.js, Bootstrap, Express.js]
---

Building a modern and clean signup form still requires more coding than one might think. [GitHub](https://github.com/) 
has a simple signup form that I really like. Just three input fields (username, email and password) and you are ready
to go.

In this post we will build a fully featured copy of this signup form. AngularJS manages our frontend and a small Express.js 
app takes care of our backend. As an extra gimmick I added password verification to make sure that our users don't 
 have typos in their passwords. In the end we have some validation in the frontend and also in our backend. Take a look
 at the [final app](http://mysterious-escarpment-9591.herokuapp.com/signup). If everything was correct you should see a json object with your username, email and the hashed password
 in addition to some extra information. I also uploaded the whole code to GitHub [ng-signup-form](https://github.com/zeMirco/ng-signup-form).
 
### The layout

We use the brand new [Bootstrap v3](http://getbootstrap.com/) to build our page. Inside a panel component we have a form with
four input fields. The first one is for username, the second one for email and the last two ones are for password and
 password verification. 
 
{% img https://s3.amazonaws.com/mircozeiss.com/signup-form-layout.png Signup form built on top of Bootstrap v3 %}

### Backend with Express.js

Our backend consists of only three routes: `GET /signup`, `POST /signup` and `POST /signup/check/username`. Our main route `/` redirects
directly to `/signup` so when you open the page the signup form is immediately shown.

The code for the first route `GET /signup` looks like the following.

```js
app.get('/signup', function(req, res) {
  res.render('signup');
});
```

It simply takes our `signup.jade` template and renders it. Our second route `POST /signup` is the target for the signup form. Let's go through the code step by step.
First of all we get the values of the input fields from the request object.

```js
var username = req.body.username;
var email = req.body.email;
var password = req.body.password;
var verification = req.body.verification;
```

Afterwards we perform some input validation, check for duplicate username, create a salt and hashed password
and at the end send a response back to the user. Whenever we encounter invalid data we rerender the 
`signup.jade` template with an additional error message to tell the user what went wrong. Let's start with some input validation.

#### 1. Input validation on the backend

Although our submit button is disabled as long as we don't have valid values in our input fields, some clever
people will be able to send invalid data to our backend. That's why we have to double check the incoming data
on the server. We have to make sure that none of the fields are empty, the username doesn't contain any
non-url-safe characters, email value is a valid email address and finally that the provided password matches
the verification.

All in all the code looks like this.

```js
var error = null;
// regexp from https://github.com/angular/angular.js/blob/master/src/ng/directive/input.js#L4
var EMAIL_REGEXP = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;

// check for valid inputs
if (!username || !email || !password || !verification) {
  error = 'All fields are required';
} else if (username !== encodeURIComponent(username)) {
  error = 'Username may not contain any non-url-safe characters';
} else if (!email.match(EMAIL_REGEXP)) {
  error = 'Email is invalid';
} else if (password !== verification) {
  error = 'Passwords don\'t match';
}
  
if (error) {
  response.status(403);
  response.render('signup', {
    error: error
  });
  return
}
```

#### 2. Check for duplicate username

In a real world app you would query your database to check for duplicate usernames. In this example
I'm using an in-memory array with json data as dummy database. We simply loop through the array to see
if an entry with the requested username already exists. 

```js
// dummy db
var dummyDb = [
  {username: 'john', email: 'john@email.com'},
  {username: 'jack', email: 'jack@email.com'},
  {username: 'jim', email: 'jim@email.com'},
];

// check if username is already taken
for (var i = 0; i < dummyDb.length; i++) {
  if (dummyDb[i].username === username) {
    response.status(403);
    response.render('signup', {
      error: 'Username is already taken'
    });
    return;
  }
}
```

Pro tip: Never do the same for duplicate email addresses. Read more about this topic in Troy Hunt's excellent
post [Everything you ever wanted to know about building a secure password reset feature](http://www.troyhunt.com/2012/05/everything-you-ever-wanted-to-know.html).

#### 3. Create salt and hash password

Just for completeness and demonstration purpose I included a small function to create a random salt and hash the provided 
password. It might help beginners and reminds everyone never to save passwords in plain text to your db.

```js
// create salt and hash password
pass.hash(password, function(err, salt, hash){
  if (err) console.log(err);
  
  // yeah we have a new user
  var user = {
    username: username,
    email: email,
    salt: salt,
    hash: hash,
    createdAt: Date.now()
  };
  
  // for fully featured example check duplicate email, send verification link and save user to db
  
  response.json(200, user)
  
});
```

I used [pwd](https://github.com/visionmedia/node-pwd) to generate the salt and hash the password. You need to include the [pull request](https://github.com/visionmedia/node-pwd/pull/3/files)
from jlubawy to make this work for node v0.10 and above. An alternative is [bcrypt](https://github.com/ncb000gt/node.bcrypt.js/). 

That's it. We're are almost done with our backend. I will explain the third route `POST /signup/check/username` in the section
**Custom validators**.

### Form validation with AngularJS

A good starting point for form validation with AngularJS is the section in the guide [about forms](http://docs.angularjs.org/guide/forms).
First of all you might want to tell the browser not to validate your form since we'd like to use AngularJS for that. Simply add `novalidate`
as an attribute to your form.

In our example we use two of the built in validators namely `required` and `email`. `required` makes sure you really enter some content
into the input fields and `email` uses a regular expression to verify a correct format of the email address. To show error message whenever one
of those validators returns an error we use Bootstrap's `.help-block` class in conjunction with the `ngShow` directive.

```
span.help-block(ng-show="form.username.$dirty && form.username.$error.required") Please choose a username
span.help-block(ng-show="form.email.$dirty && form.email.$error.email") Email is invalid
```

You might wonder what `$dirty` is doing in our code. Every form and every form element in the AngularJS world has two states: `$pristine` and
`$dirty`. Your form gets the `$pristine` state on initial page load before you start entering text into the input fields. So before touching your form it is `$pristine`. As soon as you start
entering values the forms loses this state and gets the `$dirty` state because you started working with it. AngularJS also provides CSS classes
to allow for different styling of these states `.ng-pristine` and `.ng-dirty`. Read more about that topic in the AngularJS docs about [FormController](http://docs.angularjs.org/api/ng.directive:form.FormController).
If we used the same code as above but without `form.username.$dirty` and `form.email.$dirty` the span blocks would be visible on page load.

#### Custom validators

Our first custom validator sends a `POST` request to the server to check if the username is already taken. We will use a similar
structure as GitHub does. They send a request to `/signup_check/username` and if the username is already taken they respond with
a status of 403 and the message `Username already taken`. The same goes for usernames that contain invalid characters.

{% img https://s3.amazonaws.com/mircozeiss.com/github-dev-tools-headers.png Chrome dev tools showing request and response headers %}

Here is the code of our Express app.

```js
app.post('/signup/check/username', function(req, res) {
  var username = req.body.username;
  // check if username contains non-url-safe characters
  if (username !== encodeURIComponent(username)) {
    res.json(403, {
      invalidChars: true
    });
    return;
  }
  // check if username is already taken - query your db here
  var usernameTaken = false;
  for (var i = 0; i < dummyDb.length; i++) {
    if (dummyDb[i].username === username) {
      usernameTaken = true;
      break;
    }
  }
  if (usernameTaken) {
    res.json(403, {
      isTaken: true
    });
    return
  }
  // looks like everything is fine
  res.send(200);
});
```

We first check for non-url-safe characters and afterwards if the username is already taken. If one of those is the case
we send status 403 and some json data back to the client to tell it what went wrong. If everything is fine we simply send
a status of 200 without any data.

On the client side we build a custom directive called `unique-username`.

```js
app.directive('uniqueUsername', ['$http', function($http) {  
  return {
    require: 'ngModel',
    link: function(scope, elem, attrs, ctrl) {
      scope.busy = false;
      scope.$watch(attrs.ngModel, function(value) {
        
        // hide old error messages
        ctrl.$setValidity('isTaken', true);
        ctrl.$setValidity('invalidChars', true);
        
        if (!value) {
          // don't send undefined to the server during dirty check
          // empty username is caught by required directive
          return;
        }
        
        // show spinner
        scope.busy = true;
        
        // send request to server
        $http.post('/signup/check/username', {username: value})
          .success(function(data) {
            // everything is fine -> do nothing
            scope.busy = false;
          })
          .error(function(data) {
            
            // display new error message
            if (data.isTaken) {
              ctrl.$setValidity('isTaken', false);
            } else if (data.invalidChars) {
              ctrl.$setValidity('invalidChars', false);
            }

            scope.busy = false;
          });
      })
    }
  }
}]);
```

We can use this directive in the same way we did before with `required` and `email` validators.

```js
span.help-block(ng-show="form.username.$dirty && form.username.$error.isTaken") Username already taken
span.help-block(ng-show="form.username.$dirty && form.username.$error.invalidChars") Username may not contain any non-url-safe characters
```

The `uniqueUsername` directive also shows a spinner while talking to the server. Through `ng-show="busy"` we can hide and show the spinner.
The icon is taken from the Glyphicons that come with Bootstrap and some CSS makes it spin.

```css
@-webkit-keyframes rotating {
  from {
    -webkit-transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
  }
}

.rotating {
  float: right;
  position: relative;
  top: -24px;
  right: 10px;
  -webkit-animation: rotating 1s linear infinite;
}
```

Our second custom form validation method checks whether the password and the password verification input fields have exactly the
same values. Again we use a custom directive for that.

```js
app.directive('match', [function () {
  return {
    require: 'ngModel',
    link: function (scope, elem, attrs, ctrl) {
      
      scope.$watch('[' + attrs.ngModel + ', ' + attrs.match + ']', function(value){
        ctrl.$setValidity('match', value[0] === value[1] );
      }, true);

    }
  }
}]);
```

To use this directive apply it to the password input field as well as the verification input field.

```
input.form-control(type="password", name="password", id="password", ng-model="password", required, match="verification")
input.form-control(type="password", name="verification", id="verification", ng-model="verification", required, match="password")
```

The error message works as expected but only show it when the verification input fields contains a value.

```
span.help-block(ng-show="form.verification.$dirty && form.verification.$error.match && !form.verification.$error.required") Passwords don't match
```

Last but not least we keep the submit button disabled as long as our form contains validation errors.

```
input.btn.btn-primary(type="submit", value="Sign up", ng-disabled="form.$invalid")
```

### Conclusion

We've built a signup form very similar to the one GitHub uses with an Express.js backend and AngularJS
on the frontend. In addition to the form validators already provided by AngularJS we've implemented two
custom form validators for unique usernames and password verification. Take a look at the final [app](http://mysterious-escarpment-9591.herokuapp.com/signup). Try usernames like
**john**, **jack** and **jim**.

One thing I couldn't achieve is sending invalid usernames and emails back from the server to the client.
So that the input fields already contain the false information and the user just has to correct them. That
doesn't work because AngularJS doesn't allow an invalid email inside an input field of type `email`. To
better understand the problem take a look at a quick [example](http://plnkr.co/edit/XzcCA7?p=preview). If you've got an idea how to solve this problem
please feel free to comment below or provide an answer to my question at [stackoverflow](http://stackoverflow.com/questions/18217916/how-to-init-invalid-email-and-show-in-inputtype-email). Thank you!