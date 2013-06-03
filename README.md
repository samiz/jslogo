JSLogo is an experiment in writing a browser-based language interpreter.

Demo here: http://samiz.github.io/jslogo/logo.html

*What works*

* Arithmetic
* Turtle graphics
* Procedures and procedure calls
* Tail-call elimination

*What's not yet implemented*

* Lists and list operartions
* Assigning to variables (setting parameters works fine though)
* Quoting "word
* Only a few of the Logo built-ins exist currently

= What needs to be improved =
* Some parts of the parser
* Better error reporting
* While performance is more or less acceptable, it can be optimized further

*A note about lists*

The traditional Logo list syntax [a, b, c] serves now as lambdas. Typical Logo implementations represent data lists by brackets and simulates lambdas by letting the user write them as lists of commands. This works well since Logo typically uses dynamic scope, but I'm trying to implement Lexical scope in JSLogo so now I have a problem.

Possible solutions:
* Just use dynamic scope
* Use a different syntax for lambdas & lists
* Compromise, have each list that's mentioned in code store a pointer to its creation environment; i.e be able to be used as both list and lambda as needed. Doesn't seem like a good solution since we'd have 2 meanings for each list, and one of them is not always an acceptable meaning (how to specify consing or car-cdr?).



