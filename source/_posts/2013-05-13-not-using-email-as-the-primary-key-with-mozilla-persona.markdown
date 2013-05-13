---
layout: post
title: "Not using email as the primary key with Mozilla Persona"
date: 2013-05-13 20:53
comments: true
categories: [Mozilla Persona, CouchDB, Express.js, nano]
---

Based on the feedback for my last post [Mozilla Persona example app with Express and CouchDB](http://mircozeiss.com/mozilla-persona-example-app-with-express-and-couchdb/)
I made some small but quite important changes in the architecture of my app.

[Francois Marier](http://fmarier.org/) suggested that we shouldn't use our users' email addresses as the primary key
in our db. That's also what Mozilla's [implementer's guide](https://developer.mozilla.org/en-US/docs/Mozilla/Persona/The_implementor_s_guide/Enabling_users_to_change_their_email_address?redirectlocale=en-US&redirectslug=Persona%2FThe_implementor_s_guide%2FEnabling_users_to_change_their_email_address) is telling. So
I took the code from my last post and refactored everything. Each user is now identified by a unique key and not anymore by his email address.
You can find the current version of the example app at GitHub [mozilla-persona-express-couchdb](https://github.com/zeMirco/mozilla-persona-express-couchdb).

### Using views to find users

In the first version of my app I used the email as the primary key. Getting a user from db was as simple as a `GET` request 
with the appropriate email address. Now that I don't have the email as the primary key anymore and every user is stored under 
a random string, we have to use a simple **CouchDB view**.

```js
"views": {
  "byEmail": {
    "map": "function(doc){
      if (doc.type === 'user') {
        emit(doc.email, doc)
      }
    }"
  }
}
```

Every user document looks like the following

```js
{
   "_id": "3115b40189b7dfa4d007ff7fc8536af4",
   "_rev": "2-359ee1c1e888690c9c6468b55fa48fa7",
   "type": "user",
   "email": "mirco.zeiss@gmail.com",
   "username": "zeMirco"
}
```

Combined with the **view** from above gives us the following table, which we can query with the `email` as `key`.

<table class="table table-striped table-hover table-condensed table-bordered">
  <thead>
    <tr>
      <th>Key</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>“test@mockmyid.com”</td>
      <td>{...}</td>
    </tr>
    <tr>
      <td>“mirco.zeiss@gmail.com”</td>
      <td>{...}</td>
    </tr>
  </tbody>
</table>

### Querying the view

In the first version of the app I used a simple `GET` request to retrieve the user object.

```js
db.get(email, function(err, doc) {
  ...
})
```

I changed those lines as we have to query the view now.

```js
db.view('users', 'byEmail', {key: email}, function(err, body) {
  ...
})
```

Unfortunately that means we can't use the [`HEAD` request](http://eclipsesource.com/blogs/2013/03/01/use-your-head-checking-couchdb-document-existence/) to check for document existence.
This is now done by checking the amout of `rows` we get back as an answer.

### Let the user change his email address

With the new architecture in place users are able to change their email addresses as described in Mozilla's [Implementer's Guide](https://developer.mozilla.org/en-US/docs/Mozilla/Persona/The_implementor_s_guide/Enabling_users_to_change_their_email_address?redirectlocale=en-US&redirectslug=Persona%2FThe_implementor_s_guide%2FEnabling_users_to_change_their_email_address).
I haven't yet implemented this feature but will do so in the near future and write about my experiences. So stay tuned!