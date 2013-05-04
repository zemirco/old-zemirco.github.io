---
layout: post
title: "Mozilla Persona example app with Express and CouchDB"
date: 2013-05-03 20:25
comments: true
categories: [Mozilla Persona, CouchDB, Express.js, nano]
---

[Mozilla Persona](https://developer.mozilla.org/en-US/docs/Persona) gained a lot of attention recently.
The developers have released [Beta 2](http://identity.mozilla.com/post/47541633049/persona-beta-2) at the 
beginning of last month and aim to bring Persona to [half of the worldwide Internet population](https://blog.mozilla.org/beyond-the-code/2013/04/09/persona-beta2/) in the near future.

Although Mozilla has a [quick setup guide](https://developer.mozilla.org/en-US/docs/Persona/Quick_Setup) to demonstrate the basic implementation
it is not as trivial to create a fully featured web app with [CSRF protection](http://www.adambarth.com/papers/2008/barth-jackson-mitchell-b.pdf), 
[Content Security Policy](https://developer.mozilla.org/en-US/docs/Security/CSP) and database in the backend. That's why I wrote
this simple example application to learn more about the system and help others to get started.

The app is built on the following open source stack

 - [CouchDB](http://couchdb.apache.org/) hosted at [Cloudant](https://cloudant.com/)
 - [nano](https://github.com/dscape/nano)
 - [Express](http://expressjs.com/)
 - [Request](https://github.com/mikeal/request)
 - [jQuery](http://jquery.com/)
 - [Bootstrap](http://twitter.github.io/bootstrap/)

To see the demo visit [mysterious-coast-9759.herokuapp.com](http://mysterious-coast-9759.herokuapp.com/). The code is available at 
GitHub [mozilla-persona-express-couchdb](https://github.com/zeMirco/mozilla-persona-express-couchdb/).

{% img https://s3.amazonaws.com/mircozeiss.com/mozilla-persona-example.png Mozilla Persona example app with Express and CouchDB %}

### Related projects

Several other examples already exist. Take a look at 

 - [123done](https://github.com/mozilla/123done)
 - [node.js-persona-example](https://github.com/lloyd/node.js-persona-example)
 - [myfavoritebeer.org](https://github.com/lloyd/myfavoritebeer.org)
 - [browserid-cookbook](https://github.com/mozilla/browserid-cookbook/tree/master/node-express)

They were the foundation and inspiration for my own project. Without them I couldn't have done it. Therefore, thanks to the authors!
Especially to [Lloyd Hilaiel](http://lloyd.io/), [Francois Marier](http://fmarier.org/) and [Shane Tomlinson](https://shanetomlinson.com/). 

However, all of the examples were missing some features I'd like to see. These are

 - proper DB implementation
 - CSRF protection
 - Content Security Policy (CSP)
 - cookie for `loggedInUser` variable
 - use of request module (imho makes code easier to read)
 - simplicity

So I tried to take the best parts from the above examples and throw them together in my own app.

### Getting started

I won't cover the basic implementation. Read more about those steps in [quick setup](https://developer.mozilla.org/en-US/docs/Persona/Quick_Setup).
I'd like to focus more on the advanced stuff. 

Let's start by implementing our database. We want to save our users identified by their email address and an additional property, which is the username.
As we are using CouchDB a sample document looks like the following.

```js
{
   "_id": "mirco.zeiss@gmail.com",
   "_rev": "31-a51c569f771348de72f06a0886b51ab0",
   "username": "zeMirco"
}
```

Every time a user logs in with Persona `navigator.id.request()` is called and a `POST` request to `/auth/login` is made.

```js
onlogin: function(assertion) {
  var token = $('#token').val();
  $.post('/auth/login', {assertion: assertion, _csrf: token}, function(data) {
    window.location.reload();
  });
}
```

We'll get to the `token` and `_csrf` stuff later in this post. On the server the assertion is verified by posting it and the `audience` to Mozilla.
As soon as we get a valid answer back we have to do the following:

 1. Check if the email is stored in our db
 2. If not create a new user with an empty `username` property and save him to the db
 3. If the email is already present in our db do nothing (we have a returning user)
 
Unfortunately Persona doesn't tell us whether the user is a new or existing one. That's why we have to check for existence on every login. CouchDB provides a handy feature to check for document existence. Instead of making a full `GET` request with the email as `key`
we can simply use a lightweight `HEAD` request. Read more about this trick at [Use your head checking CouchDB document existence](http://eclipsesource.com/blogs/2013/03/01/use-your-head-checking-couchdb-document-existence/).
If we get back an error with status code `404` we have a new user. Therefore save him to db.
 
```js
db.head(email, function(err, body, header) {
  if (err) console.log(err);
  if (err && err.status_code === 404) {
    // email is not in db
    var doc = {
      username: ''
    };
    db.insert(doc, email, function(err, body) {
      if (err) console.log(err);
      resp.send(200);
    })
  } else {
    // email is already stored in db
    resp.send(200);
  }
});
```

Sweet, we can now save our users to db and differentiate between new and existing ones. Problem is we somehow have to remember who is logged in and who isn't.
We don't want ours users to make the login call on every request. Therefore we have to use **sessions**.
 
### Cookie session

Express offers cookie based session support via the [connect](http://www.senchalabs.org/connect/) [cookieSession](http://www.senchalabs.org/connect/cookieSession.html) middleware.
You could also use Mozilla's own implementation [node-client-sessions](https://github.com/mozilla/node-client-sessions) or some key value stores like Redis.
Read more about the pros and cons of cookies vs stores at [Using secure client-side sessions to build simple and scalable Node.JS applications](https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3/).

To enable cookie sessions in Express add the following middleware to your config.

```js
// built in middleware
app.use(express.cookieParser('your secret here'));
app.use(express.cookieSession());
```

You can now create sessions on login `req.session.email = email` and destroy them on logout `req.session = null`. Our users can also
visit the `/profile` route which is protected and not accessible for users without any valid session.

```js
// middleware to restrict access to internal routes like /profile
function restrict(req, res, next) {
  if (req.session.email) {
    next();
  } else {
    res.redirect('/');
  }
}

// use the middleware in your routes
app.get('/profile', restrict, profile.get);
```

### Content Security Policy

[Content Security Policy](https://developer.mozilla.org/en-US/docs/Security/CSP) (simply said) tells the browser to use JavaScript (and images, style sheets, frames, etc.)
only from your own domain while forbidding inline script and script from third party URLs. It adds another layer of security against XSS attacks.

[Helmet](https://github.com/evilpacket/helmet) is a great middleware to set CSP headers in Express. It also offers several other layers of security.
In my app I'll write the headers by hand as it only requires a few lines of code.

Check for browser support and implementation at [caniuse#contentsecuritypolicy](http://caniuse.com/#feat=contentsecuritypolicy). 
Firefox and IE10 need the `X-Content-Security-Policy` header while Safari and Chrome need `X-WebKit-CSP`.

```js
var policy =  "default-src 'self';" +
              "frame-src 'self' https://login.persona.org;" +
              "script-src 'self' 'unsafe-inline' https://login.persona.org;" +
              "style-src 'self' 'unsafe-inline'";

app.use(function(req, res, next) {
  // Firefox and Internet Explorer
  res.header("X-Content-Security-Policy", policy);
  // Safari and Chrome
  res.header("X-WebKit-CSP", policy);
  // continue with next middleware
  next();
});
```

In theory adding `'unsafe-inline'` shouldn't be necessary but I got errors in Chrome caused by jQuery. Maybe they are related to [jQuery bug #13507](http://bugs.jquery.com/ticket/13507).
You can verify the headers in the browser's development tools.

{% img https://s3.amazonaws.com/mircozeiss.com/persona-csp.png Content Security Policy Headers %}

### CSRF protection

A great explanation for Cross-Site Request Forgery is the paper [Robust Defenses for Cross-Site Request Forgery](http://www.adambarth.com/papers/2008/barth-jackson-mitchell-b.pdf).
Express provides a built in middleware [csrf](http://www.senchalabs.org/connect/csrf.html) which makes the use of CSRF very easy. 

Our own custom middleware makes the `token` variable available to all our views and we can use it whenever we have to change the state on the server.

```js
app.use(function(req, res, next) {
  res.locals.token = req.session._csrf;
  next();
});
```

That's usually done by adding a hidden input field to the forms.

```jade
form#login.navbar-form.pull-right
  input#token(type="hidden", name="_csrf", value=token)
  button.btn(type="submit") Login
```

The token is sent to the server and `app.use(express.csrf());` checks if it is equal to `req.session._csrf`. If it isn't Express throws a `403` error.
We not only have to include the token in forms but also when we make ajax requests.

```js
var token = $('#token').val();
$.post('/auth/login', {assertion: assertion, _csrf: token}, function(data) {
  window.location.reload();
});
```

That explains the additional `_csrf` key.

### Sending *loggedInUser* from server to client JavaScript

The [`navigator.id.watch`](https://developer.mozilla.org/en-US/docs/DOM/navigator.id.watch) function requires the `loggedInUser` parameter,
which tells Persona what you believe about the user's state.

[123done](https://github.com/mozilla/123done/blob/master/static/js/123done.js#L42-L44) makes a GET request to `/api/auth_status` in order to get `loggedInUser`

```js
$.get('/api/auth_status', function(data) {
  loggedInEmail = JSON.parse(data).logged_in_email;
  ...
});
```

and the server responds with the current session.

```js
app.get('/api/auth_status', function(req, res) {
  res.send(JSON.stringify({
    logged_in_email: req.session.user || null,
  }));
});
```

[node.js-persona-example](https://github.com/lloyd/node.js-persona-example/blob/master/views/index.ejs#L15) uses inline JavaScript
and puts the variable via [ejs](https://github.com/visionmedia/ejs) directly into the view.

```html
navigator.id.watch({
  loggedInUser: <%- JSON.stringify(email) %>,
  ...
})
```

The server renders the view with the local variable `email` with holds the current session.

```js
app.get('/', function(req, res) {
  res.render('index.ejs', { email: req.session.email || null });
});
```

[myfavoritebeer.org](https://github.com/lloyd/myfavoritebeer.org/blob/master/static/js/main.js#L135-L138) also makes a GET request. This time to `/api/whoami`.

```js
$.get('/api/whoami', function (res) {
  if (res === null) loggedOut();
  else loggedIn(res, true);
}, 'json');
```

The server responds with the email from the current session and the corresponding image from [Libravatar](https://www.libravatar.org/).

```js
app.get("/api/whoami", function (req, res) {
  if (req.session && typeof req.session.email === 'string') {
    respondWithUserInfo(req, res);
  } else {
    return res.json(null);
  }
});

function respondWithUserInfo(req, res) {
  libravatar.url({email: req.session.email, size: 32, http: false},
    function (error, avatar) {
      if (error) {
        return res.json({'email': req.session.email, 'avatar': ''});
      }
      return res.json({'email': req.session.email, 'avatar': avatar});
    });
}
```

Last but not least [browserid-cookbook](https://github.com/mozilla/browserid-cookbook/blob/master/node-express/views/layout.jade#L17-L22)
uses inline script (this time with Jade instead ejs) to pass the current user to the frontend.

```jade
if user
  script
    var loggedInUser = '#{user}';
else
  script
    var loggedInUser = null;
```

The server sets the local variable `loggedInUser` from the current session.

```js
exports.index = function(req, resp){
  resp.render('index', { 
    title: 'Express', 
    user: req.session.email, 
    csrf: req.session._csrf 
  })
};
```

In summary two examples use inline script and two use extra GET requests. What's the better implementation?

In my opinion both aren't perfect. Inline script is probably the easiest but worst solution, as it won't work with a strict Content Security Policy.
An extra GET request costs time and you have to implement an additional route on your server. That's why I chose a third solution. I use cookies to send 
the current user from our backend to the frontend. Mozilla also recommends this way.

> ... you might examine the browser's cookies to determine who is signed in.

We can set the cookie via a custom middleware. If the user isn't logged in and doesn't have a valid session no cookie is needed.

```js
app.use(function(req, res, next) {
  if (req.session.email) {
    res.cookie('email', req.session.email);
  }
  next();
});
```

On the client we can read the cookie via the awesome [jquery-cookie](https://github.com/carhartl/jquery-cookie) plugin.

```js
var email = $.cookie('email') || null;
```

Cookies have the advantage that they save the extra request to the server and don't require inline script.

### Conclusion

A few more steps than just the quick setup are needed to build a full featured web app based on Mozilla Persona. However it isn't rocket science and I've learned a lot while developing this app.
Persona is a great technology and admins will have less to worry about, as no passwords are stored in the db. 


I'm sure my example is far from being perfect so if you see any mistakes or find room for improvements please open an [issue](https://github.com/zeMirco/mozilla-persona-express-couchdb/issues) at GitHub.