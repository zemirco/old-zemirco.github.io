---
layout: post
title: "Flexbox-grid: Tiny yet powerful grid built on CSS flex"
date: 2013-10-28 21:13
comments: true
categories: [CSS, flex, grid, topcoat]
---

Today I'd like to introduce [flexbox-grid](https://github.com/zeMirco/flexbox-grid).

It is a CSS grid that is not only inspired by [Bootstrap](http://getbootstrap.com/css/#grid) but also uses the same class names.
So you might ask yourself right now:
[Why](http://unsemantic.com/)
[the](http://semantic.gs/)
[f***ing](http://yuilibrary.com/yui/docs/cssgrids/)
[hell](http://purecss.io/grids/)
[another](http://foundation.zurb.com/grid.php)
[grid](http://www.getskeleton.com/#grid)?
Well, first of all for learning and playing with the CSS [flex property](https://developer.mozilla.org/en-US/docs/Web/CSS/flex). Secondly, actually using flex. None of the grids above
makes use of flex. That's totally understandable because it is not yet [supported](http://caniuse.com/#feat=flexbox)
by all major browsers.

<iframe width="100%" height="430" src="http://caniuse.com/flexbox/embed/description"></iframe>

However I'd like to focus solely on modern browsers and devices. Last but not least, the killer argument that seems to apply
to every new CSS/JS/*** library, it is [fast](http://updates.html5rocks.com/2013/10/Flexbox-layout-isn-t-slow) and tiny.
And by tiny I mean really tiny. Gzipped only 660 bytes. Here is the report from
[cssmin](https://github.com/gruntjs/grunt-contrib-cssmin).

Original: 9192 bytes.
Minified: 7476 bytes.
Gzipped:  660 bytes.

[Topcoat](http://topcoat.io/) has already [forked the grid](https://github.com/topcoat/grid) and added it to its portfolio.

### About the project

[flexbox-grid](https://github.com/zeMirco/flexbox-grid) is built with [Stylus](http://learnboost.github.io/stylus/).

The default number of columns is 12 and the default gutter width (space between the columns) is 1rem.
You can change that by editing `var-columns` and `var-gutter-width` inside [flexbox-grid.styl](https://github.com/zeMirco/flexbox-grid/blob/master/flexbox-grid.styl).
Afterwards run `grunt` to get the `.css` and `.min.css` files.

#### Basic grid

The basic grid has four main `col-*` classes. One for phone, one for tablets, one for desktop and one for large
desktop. The breakpoints are the same as in [Bootstrap](http://getbootstrap.com/css/#grid).

 - `col-xs-*` - phones, up to 480px
 - `col-sm-*` - tablets, 768px and up
 - `col-md-*` - desktops, 992px and up
 - `col-lg-*` - large desktops, 1200px and up

<iframe width="100%" height="300" src="http://jsfiddle.net/m9MFc/4/embedded/result,html,css/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

#### Offset classes

By using the `col-*-offset-x` we can shift columns to the right. This class simply adds a left margin that has the width
of x columns. Therefore the columns above and below are all perfectly aligned with the offset column.

<iframe width="100%" height="300" src="http://jsfiddle.net/AXCPk/6/embedded/result,html,css/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

#### Mix grid and offset classes

Of course you can mix the basic grid class with offset classes. You just have to make sure that in the end everything sums
up to twelve or less than twelve columns. That means you could use the following classes in one `row`:

 - `col-xs-2`
 - `col-xs-2 col-xs-offset-4`
 - `col-xs-2 col-xs-offset-2`

or

 - `col-lg-6`
 - `col-lg-2 col-lg-offset-3`
 - `col-lg-1`

<iframe width="100%" height="200" src="http://jsfiddle.net/Ax5xU/5/embedded/result,html,css/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

#### Auto width columns

That's a pretty cool feature of flex. You can just put as many divs with class `col-auto` as you want in one `row` and they
will automatically share the available space among them. You don't have to think and calculate stuff like "hm .. I want four
equally wide divs in my row ... in my setup each row consists of 12 columns ... 12/4 is 3 and I therefore have to use
`col-lg-3`".

<iframe width="100%" height="200" src="http://jsfiddle.net/H7PPV/1/embedded/result,html,css/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

#### Mix fixed width and auto width columns

Again you can mix fixed width and auto width columns without causing any layout weirdness. In the example below all
`col-auto` columns have a light blue background to distinguish them from the fixed width rows.

<iframe width="100%" height="200" src="http://jsfiddle.net/fmDgH/2/embedded/result,html,css/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

#### Nesting

It is also possible to nest different types of columns. Similar to Bootstrap you can start a new `row` within one `col-*`.
You just have to remember that inside this new `row` your columns will again sum up to a maximum number of 12.

<iframe width="100%" height="200" src="http://jsfiddle.net/LafLy/2/embedded/result,html,css/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

#### Responsive features

The initial relase of [flexbox-grid](https://github.com/zeMirco/flexbox-grid) did not have any responsive features. With v1.0.0 I've added the same responsive
classes that Bootstrap has. You don't have to learn anything new and switching back and forth between those two libraries
is easy as. Simply use `col-xs-*`, `col-sm-*`, `col-md-*` and `col-lg-*` to target different devices.

<iframe width="100%" height="300" src="http://jsfiddle.net/cAHeq/2/embedded/result,html,css/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

### Conclusion

I've learned a lot about Stylus and the CSS flex property while working on this project. Quite often we simply take things
for granted and rely on stuff that's already available and works well. However from time to time we have to leave our
comfort zone and have to think outside the box. That's how we continuously improve our skills. Especially for mobile and
low bandwidth we need to focus on performance and simplicity. It's a good reason to rewrite everything from scratch while
making use of new technologies like flex. Depending on the project you are working on you can start using flex today and
enjoy all the [possibilities](http://philipwalton.github.io/solved-by-flexbox/) it offers.