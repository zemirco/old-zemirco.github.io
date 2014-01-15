---
layout: post
title: "Lockit - an Express authentication solution"
date: 2014-01-15 10:51
comments: true
categories: [Bootstrap, Express.js]
---

What does every app need? **Users!**

What does every app therefore need to have? An **authentication solution**:

 - signup new users
 - allow existing users to login
 - help users who forgot their password
 - etc.
 
What's the most annoying part to write when building a new app? 
The **user authentication solution**.

Focus on building your app instead of reinventing the wheel and use [lockit](https://github.com/zeMirco/lockit).

### Concept

Lockit is inspired by Ruby's [devise](https://github.com/plataformatec/devise).
It consists of multiple single purpose modules that you could also use on their own. 
The main module `lockit` is just a wrapper around those

 - [lockit-login](https://github.com/zeMirco/lockit-login)
 - [lockit-signup](https://github.com/zeMirco/lockit-signup)
 - [lockit-delete-account](https://github.com/zeMirco/lockit-delete-account)
 - [lockit-forgot-password](https://github.com/zeMirco/lockit-forgot-password)
 - [lockit-sendmail](https://github.com/zeMirco/lockit-sendmail)
 - [lockit-couchdb-adapter](https://github.com/zeMirco/lockit-couchdb-adapter)
 - [lockit-mongodb-adapter](https://github.com/zeMirco/lockit-mongodb-adapter)
 - [lockit-utilities](https://github.com/zeMirco/lockit-utilities)
 - [lockit-template-blank](https://github.com/zeMirco/lockit-template-blank)
 
When you have problems please try to open an issue in the according repository.

### How to use

Install the module and the adapter for your database (couchdb or mongodb) via npm 

```
npm install lockit lockit-couchdb-adapter
```

Create a `config.js` in your `app/` folder with your database settings

```js
// database settings for CouchDB
exports.db = 'couchdb';
exports.dbUrl = 'http://127.0.0.1:5984/test';

// or if you want to use MongoDB
// exports.db = 'mongodb';
// exports.dbUrl = 'mongodb://127.0.0.1/test';
// exports.dbCollection = 'users';
```

**Important!** If you are using CouchDB you need to create the necessary views first.
Lockit comes with a helper file that does it automatically for you. Simply run

```
config=[PATH] node node_modules/lockit/createCouchViews.js
```

[PATH] should be the location of your config.js, i.e.

```
config=./config.js node node_modules/lockit/createCouchViews.js
```

If you don't use CouchDB you can simply continue here.

Use both modules in your `app.js` file

```js
var config = require('./config.js');
var lockit = require('lockit');
```

Activate the module by calling the main `lockit()` function

```js
// ... express stuff

// use middleware before router so your own routes have access to
// req.session.email and req.session.username

// sessions have to be enabled!
lockit(app, config);

// ... more express stuff
```

Include [bootstrap](http://getbootstrap.com/) css in your views/layout.jade

```
link(rel='stylesheet', href='/css/bootstrap.min.css')
```

Start your app like always with `node app.js`, open the browser and navigate to [localhost:3000/signup](http://localhost:3000/signup).
I've also included an [example app](https://github.com/zeMirco/lockit/tree/master/example) that you can download and run locally.
It has a special route `/profile` which demonstrates how to get user information from db and show them
in the browser.

You'll notice that nothing happens after you've signed up although
you should see a message that an email has been sent to you.
If you take a look at your database however, you should be able to see your just created user.
So the user is created but the email is simply not sent.
 
That's because the email service is not set up yet.
By default all email communication is stubbed (no emails are sent).
You need to have your own email service in order to send emails when a user signs up or
requests a new password. Under the hood lockit uses [nodemailer](https://github.com/andris9/Nodemailer) to send emails.
You can therefore use the same configuration in your `config.js` file.

```js
// default settings
exports.emailType = 'Stub';
exports.emailSettings = {
  service: 'none',
  auth: {
    user: 'none',
    pass: 'none'
  }
};

// change them to something similar like
// exports.emailType = 'SMTP';
// exports.emailSettings = {
//   service: 'Gmail',
//   auth: {
//     user: 'gmail.user@gmail.com',
//     pass: 'userpass'
//   }
// };
```

Now you are good to go. You can also change all the other stuff like email template,
welcome text, title and subject of the emails, etc. Take a look at the [lockit#configuration](https://github.com/zeMirco/lockit#configuration)
part at GitHub to see all possibilities.
 
### FAQ

1. How is this different to [passport](http://passportjs.org/)?

      Passport offers different strategies (local, OpenID, OAuth) for authentication.
      It assumes that you already have users in your db and only handles login, logout and route restriction.
      It does not send any emails on signup or when a user forgot a password.
      You can think of Lockit as a layer before Passport. I haven't tried it yet but it should work
      to use Lockit for signup, forgot password, delete account and on top of that Passport with
      the [local strategy](https://github.com/jaredhanson/passport-local).

2. Why didn't you use [Persona](http://www.mozilla.org/en-US/persona/)?

      Well, I've tried Persona and like it a lot for simple web based solutions. However authentication
      solutions should work on all devices and for all platforms. One big problem is that Persona does
      not work with PhoneGap and other environments that break when opening popups. See the related
      [issue #2034](https://github.com/mozilla/persona/issues/2034).

3. What about a SaaS solution like [userapp](https://www.userapp.io/)?

      User information is the most valuable, critical and sensible data. 
      Users trust you to handle them with care. 
      Therefore I don't like giving them away.

### Conclusion

Please give [lockit](https://github.com/zeMirco/lockit) a try. Leave comments, feedback and issues
 on GitHub or here in the comments. 
 
I'm not a security expert although I've read a lot about this topic while developing lockit.
So use it with care and probably do not use it for production yet. I'm sure there is room for improvements.