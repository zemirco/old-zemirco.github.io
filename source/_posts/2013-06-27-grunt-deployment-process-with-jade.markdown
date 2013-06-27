---
layout: post
title: "Grunt deployment process with Jade"
date: 2013-06-27 19:20
comments: true
categories: [Grunt, Express.js, Jade]
---

When building web projects you want to concatenate and minify CSS and JavaScript files
before deployment. Instead of having multiple single files you only
have one file with one single request. It also means you have to change the path to the script inside
your `.html` or `.jade` file. During development your code often looks like this.

```html
<script src="js/script1.js"></script>
<script src="js/script2.js"></script>
<script src="js/script3.js"></script>
<script src="js/script4.js"></script>
```

For deployment you might want to change this to a single request fetching a minified file.

```html
<script src="js/script.min.js"></script>
```

In this post I will demonstrate three solutions for this problem.

1. `grunt-usemin` with `.html` files
2. `grunt-preprocess` with a tmp/ , dev/ and prod/ folder
3. `grunt-preprocess` with only dev/ and prod/ folder

### Meet grunt-usemin

If you are using plain HTML files [grunt-usemin](https://github.com/yeoman/grunt-usemin) is your best friend. In your `index.html` file
you only have to add two lines of code.

```html
<!-- build:js js/app.js -->
<script src="js/script1.js"></script>
<script src="js/script2.js"></script>
<script src="js/script3.js"></script>
<script src="js/script4.js"></script>
<!-- endbuild -->
```

Add a task for `usemin` to your `Gruntfile.js`.

```js
useminPrepare: {
  html: ['deploy/views/example.html']
},
usemin: {
  html: ['deploy/views/example.html']
}
```

After running `grunt usemin` your `index.html` contains the link to the minified file.

```html
<script src="js/app.js"></script>
```

Unfortunately this doesn't work for `.jade` files as `grunt-usemin` spits out HTML code. Therefore
let's look at another solution.

### grunt-preprocess as an alternative

[grunt-preprocess](https://github.com/onehealth/grunt-preprocess) doesn't alter your code. It only shows or hides certain blocks depending
on various settings. You can use it in HTML, JavaScript, CSS, C, Java, etc.

#### Code in tmp/ and deploy to dev/ and prod/

One way to set up your app structure would be coding in a tmp/ folder and deploying to a development folder for testing and
to a production folder for final deployments.

```
/tmp
/dev
/prod
```

With this structure you can use `grunt-preprocess` as follows.

```
<!-- @if production=false -->
script(src="/javascripts/script1.js")
script(src="/javascripts/script2.js")
script(src="/javascripts/script3.js")
<!-- @endif -->

<!-- @if production=true -->
script(src="/javascripts/script.min.js")
<!-- @endif -->
```

You can't work with this file directly since it loads your single script files and also the minified file. Include 
the tasks for building dev and prod versions into your `Gruntfile.js`.

```js
preprocess: {
  // production version with min script
  prod: {
    src: ['deploy/views/layout-wrong.jade'],
    options: {
      inline: true,
      context: {
        production: true  // important
      }
    }
  },
  // development version
  dev: {
    src: ['deploy/views/layout-wrong.jade'],
    options: {
      inline: true,
      context: {
        production: false  // important
      }
    }
  }
}
```

The important part is the `context` where you can set the `production` variable to `true` or `false`.
When running `grunt preprocess:dev` you'll get

```
script(src="/javascripts/script1.js")
script(src="/javascripts/script2.js")
script(src="/javascripts/script3.js")
```

compared to running `grunt preprocess:prod`

```
script(src="/javascripts/script.min.js")
```

This setup adds extra overhead to your project folder and requires recompiling on every change. To neglect recompiling
you could add a **watch** task to your `Gruntfile` so the files are recreated every time you make changes. Still it is not an ideal 
solution.

#### Code in dev/ and deploy to /prod

Here is a neat little trick that allows working with your development files and deploying
files that contain the links to minified assets. So you don't have to work in a tmp folder and
build files either for your development or your deployment folder.

```
  <!-- @exclude -->
  script(src="/javascripts/script1.js")
  script(src="/javascripts/script2.js")
  script(src="/javascripts/script3.js")
  <!-- @endexclude -->

<!-- @exclude -->
//- <!-- @endexclude -->
  script(src="/javascripts/script.min.js")
```

The preprocess task in your Gruntfile looks like this

```js
preprocess: {
  inline: {
    src: ['deploy/views/layout.jade'],
    options: {
      inline: true
    }
  }
}
```

How does this work? Well, first of all if you start your Express app and navigate to the index page 
you will only see

```html
<script src="/javascripts/script.min.js"></script>
```

It is not documented but Jade won't complain when you use plain HTML comments. That allows us to use this
nifty trick. The line `script(src="/javascripts/script.min.js")` is commented out because of the `//-` one line
above. Therefore you can work with this file during development and `script.min.js` won't be called. 
Now comes the magic: if you build your deployment files everything between ` <!-- @exclude -->` and
`<!-- @endexclude -->` is removed from the file. That means your single script files don't exist anymore
and also the comment `//-` above the minified script will be removed. That means the line `script(src="/javascripts/script.min.js")`
is now active and calls your minified file.

To make this work keep an eye on the indentation of your `layout.jade` file. The following won't work.

```
<!-- @exclude -->
script(src="/javascripts/script1.js")
script(src="/javascripts/script2.js")
script(src="/javascripts/script3.js")
<!-- @endexclude -->

<!-- @exclude -->
//- <!-- @endexclude -->
  script(src="/javascripts/script.min.js")
```

It produces this output in Jade.

```jade
script(src="//ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js")
  script(src="/javascripts/script.min.js")
```

Compiled to HTML it looks like this and won't execute any code

```html
<script src="...">script(src="/javascripts/script.min.js")</script>
```

### Conclusion

Replacing links to your assets for deployment is easy. When dealing with `html` files 
use [grunt-usemin](https://github.com/yeoman/grunt-usemin). Otherwise give [grunt-preprocess](https://github.com/onehealth/grunt-preprocess) a try. You can find an example Express
app with all the relevant grunt tasks at [github](https://github.com/zeMirco/grunt-jade-preprocess). To get the app ready for deployment run the following
commands.

```bash
grunt deploy
cd deployment
node app.js
```

Now open your browser, navigate to [localhost:3000](http://localhost:3000) and take a look at
the source code. You should see only one JavaScript file `script.min.js`.