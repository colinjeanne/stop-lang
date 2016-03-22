# The STOP Language

The time has come. Stomp your elephant<sup>[1]</sup> feet on over, grab a cup
of your favorite joe<sup>[2]</sup>, and come see<sup>[3]</sup> the final word
in programming language design. You'll be ready to shower this ultimate
language with your finest gems<sup>[4]</sup>.

STOP<sup>[5]</sup> is a truely modern language drawing all the benefits of old
while excising their misinformed choices. STOP is founded on the principles of
simplicity, clarity, and compactness. To meet these goals, STOP provides a
small set of easily understood commands, only the essential set of types, and a
unified state handler. STOP is a deque-based<sup>[6]</sup>,
functional<sup>[7]</sup> programming language.

## Machine Model

A STOP machine is simple: a program is made of a list of commands and an
instruction pointer. The instruction pointer starts with the first command and
progresses forward, one command at a time, until it advances beyond the end of
the list of commands.

In order to provide maximal effectiveness for developers, some commands move
the instruction pointer in unique ways thus allowing for iteration or code
reuse. Because the nature of a problem is not always known ahead of time, some
commands are able to modify the set of commands. While the previous statement
may make some feel uneasy, rest assured that the deque-based model that STOP is
built on guarantees that commands are added in well-defined and expected
locations.

Each command has three parts: a name, a set of arguments, and a comment. These
parts are delimited by whitespace and, in order to avoid debate on which type
of whitespace<sup>[8]</sup> is best, the only valid whitespace character is the
space character. Any amount of whitespace is possible before a command, after a
command, or between the various parts of a command.

The canonical form of a command is

    NAME [data1 data2 data3...] [; Comment]

## Types

STOP has only a few types:

### Undefined
An undefined value. This type cannot be created directly but can appear in
contexts where a value must be present but not value exists. This type removes
many edge cases that would have otherwise existed for developers.

### Number
A numeric type. Numbers follow<sup>[9]</sup> the IEEE-754 standard. A common
number format for all numbers greatly simplifies arithmetic logic. There is no
need to worry about signed/unsigned mismatch<sup>[10]</sup> or integer to
floating point conversion. In STOP, numbers are almost always finite!

Numbers follow the patterns that a rational person would expect. Here are some
example numbers:

* `1`
* `+2`
* `2.5`
* `2.75`
* `300e-2`
* `0.004E3`
* `-1519940.54418e+01`

### String
Strings in STOP are far simpler<sup>[11]</sup> than in other languages. Strings
are immutable sequences of UTF-16 code units and are delimited with `"`. All
characters are supported within strings including the `"` character itself with
proper encoding.

Here are some sample strings:

* `"Gut"`
* `"Nylon"`
* `"Fluoro carbon"`
* `"Wound Metal\\Nylon"`
* `"\"Open\" and \"Closed\""`

### List
Lists are immutable ordered structures which contain zero or more values. Each
item in a list can be any STOP type. Lists are so fundamental to writing
interesting and useful programs that their existence is often times implied.

Some example lists:

* `[]`
* `[1]`
* `[1,2]`
* `[1, 2, 3]`
* `[["One", "two", "three"], ["Not only you and me"], ["Got", 180, "degress"], ["And I'm caught in between"]]`

### Reference
The last data type is the one which makes STOP such a powerful language.
References allow commands to accept the values returned by other commands and
so enable functional<sup>[12]</sup> composition across commands. References
come in several different flavors<sup>[13]</sup> in order to meet the needs of
complex, modern requirements.

### Direct vs. Indirect
A direct reference references the value returned by a command directly. When a
command directly references another command the other command is executed first
and the result is used as one of the arguments to the initial command. For
example, consider the program

    NOOP 1  ; (1)
    NOOP $0 ; (2)

Line (1) evaluates to `1`. The second command, when evaluated, must first
evaluate the direct reference `$0`: this causes the command at index 0 to be
evaluated again and the reference is replaced by the result of that evaluation.

An indirect reference evaluates to a direct reference. These are useful when
adding new commands to the program which themselves must reference other
commands. Consider the program

    NOOP "Don't copy" ; (1)
    PUSH "NOOP" $0    ; (2)

When (2) is evaluated the direct reference is evaluated first and is replaced
with the value `"Don't copy"` before the rest of the command is executed. The
command which is pushed is therefore

    NOOP "Don't copy"

However, it may be desirable to push a command that itself includes a direct
reference. The way to accomplish this is with an indirect reference. Consider
the program

    NOOP "Don't copy"     ; (1)
    PUSH "NOOP" $$0       ; (2)
    PUSH "NOOP" "Do copy" ; (3)

In this program, when (2) is evaluated the indirect reference decays into a
direct reference so that the command that is pushed is

    NOOP $0

If it were evaluated at the end of the program it would reference the value of
the command at index 0 and so would evaluate to `"Do copy"`.

### Absolute vs. Relative
References may either be absolute and refer to a specific command index or may
be relative and refer to a command with respect to the current position of the
instruction pointer.

Absolute references always take an integer. If the referenced index is greater
than the number of commands in the list then the index is interpreted as if it
were taken MOD the number of commands. Here are some examples:

* `$0`: The first command
* `$1`: The second command
* `$-1`: The last command
* `$-2`: The second to last command
* `$4`: The first command in a four command program, the last command in a five
command program, and the fifth command in a six command program.

Similarly, relative commands take an integer which defaults to zero if omitted.
Relative commands are relative to the current instruction pointer and, similar
to absolute commands, the index is interpreted MOD the number of commands. Here
are some examples:

* `$ip`: The current command
* `$ip+0`: The current command
* `$ip-0`: The current command
* `$ip+1`: The command directly after the current command
* `$ip-1`: The command directly before the current command

### Special Relativity
Because referencing the value of the current command is never useful - it will
lead to an infinite loop - there are three special relative references which
instead evaluate to the current value of the instruction pointer. They are:

* `$ip`
* `$ip+0`
* `$ip-0`

### Truthiness
An explicit Boolean data type is unnecessary in STOP because of the existence
of truthiness. A value is truthy if it is non-empty. If it is empty then it is
falsey. The falsey values are

* `undefined`
* `0`
* `""`
* `[]`

### Equality
Two STOP values are equal if they have the same type and the same value. Two
lists are equal if they have the same length and if each element of one is
equal to the corresponding element of the other.

## Commands

### ADD value1 value2 [...valueN]
The `ADD` command requires at least two values and will add them together with
addition being defined depending on the types of the values. Values are added
left to right.

If value1 is a list then the subsequent values are appended to the list unless
one of those values is itself a list in which case the right list is
concatenated to the left list.

When adding strings to strings the strings are concatenated. When adding
strings to any other type, the other type is interpreted as a string.

When adding numbers to numbers the numbers are added arithemtically.

The result of all other data type combinations is not a number.

    ADD 1 1 ; Returns 2

### ALTER string number
The `ALTER` command moves the first label with the given name in the list of
commands to the specified index. The command takes a string for the label's
name and an integer representing the index at which the label will be inserted.
The label is inserted before other commands at that location.

The index is interpreted MOD the number of commands.

This command returns `undefined`.

    ALTER "test" 1 ; Moves the label "test" to be the second command

### AND [value1 value2...]
The `AND` command requires will AND values together with AND being defined
depending on the types of the values. Values are ANDed left to right.

Providing the command no arguments is equivalent to providing the command with
a single undefined argument.

If the command is provided a single argument then the result is whether the
argument is truthy.

If the left and right values are lists then the result is the intersection of
the two lists.

If the left and right values are numbers then the result is the bitwise AND of
the two numbers.

Otherwise the operation returns 1 if all values are truthy and 0 otherwise.

    AND 5 3 ; Returns 1

### DIV value1 value2 [...valueN]
The `DIV` command requires at least two values and will divide with division
being defined depending on the types of the values. Values are divided left to
right.

When dividing numbers from numbers the numbers are divided arithemtically.

The result of all other data type combinations is not a number.

    DIV 18 6 ; Returns 3

### EJECT
The `EJECT` command takes no arguments and removes the last command in the list
of commands.

    EJECT ; Removes the last command

### EQUAL value1 value2 [...valueN]
The `EQUAL` command requires at least two values and returns 1 if all of its
arguments are equal and 0 otherwise.

    EQUAL 1 1 ; Returns 1

### ERROR [value1 value2...]
The `ERROR` command converts its values into strings that can be interpreted by
STOP and outputs them as a single line to standard error.

    ERROR "Oh" "teh" "noes" ; Outputs '["Oh", "teh", "noes"]'

### GOTO string [condition]
The `GOTO` command moves the instruction pointer to the first label with the
given name in the list of commands if an optional condition is truthy. The
command takes a string for the label's name. If the condition is not provided
then it is assumed to be truthy. If the condition is falsey then this command
does not move the instruction pointer.

This command returns `undefined`.

    GOTO "test" ; Jumps to the label "test"

### INJECT string [value1 value2...]
The `INJECT` command takes a command name and a set of values to use as the
arguments for the new command. The command is inserted as the last command in
the set of commands.

Indirect references in the set of values decay into direct references.

    INJECT "GOTO" "test" ; Inserts the command GOTO "test" as the last command

### ITEM list|string number
The `ITEM` command takes a single list or string and an nonnegative number
representing an index and returns the value at that index.

If the index is out of range then `undefined` is returned.

    ITEM [1, 2, 3] 2 ; Returns 3

### LABEL string
The `LABEL` command defines a label. This command takes a single string
representing the name of the label and returns `undefined`.

Multiple labels can have the same name.

    LABEL "test" ; Defines the label "test"

### LENGTH list|string
The `LENGTH` command takes a single list or string and returns the number of
elements in that list or string.

    LENGTH [1, 2, 3] ; Returns 3

### LESS value1 value2 [...valueN]
The `LESS` command requires at least two values and returns 1 if each argument
is less than all arguments to its right and 0 otherwise.

Numbers are compared numerically.

Strings are compared alphabetically.

    LESS 3 2 1 ; Returns 1

### MOD value1 value2 [...valueN]
The `MOD` command requires at least two values and will mod them with modulus
being defined depending on the types of the values. Values are modded left to
right.

When modding numbers from numbers the numbers the result is the remainder of a
division.

The result of all other data type combinations is not a number.

    MOD 18 5 ; Returns 3

### MUL value1 value2 [...valueN]
The `MUL` command requires at least two values and will multiple them together
with multiplication being defined depending on the types of the values. Values
are multiplied left to right.

If the left value is a list or a string and the right value is a nonnegative
integer then the list or string is concatenated with itself the specified
number of times.

When multiplying numbers to numbers the numbers are multiplied arithemtically.

The result of all other data type combinations is not a number.

    MUL 4 5 ; Returns 20

### NEQUAL value1 value2 [...valueN]
The `NEQUAL` command requires at least two values and returns 0 if any of its
arguments are equal to any of its other arguments and 1 otherwise.

    NEQUAL 1 1 ; Returns 0

### NOOP [value1 value2...]
The `NOOP` command returns its arguments. If no arguments are provided then the
command returns `undefined`. If a single argument is provided then it is
returned unchanged. If more than one argument is provided then they are
returned as a list.

    NOOP 1 "one" [1] ; Returns [1, "one", [1]]

### NOT [value1 value2...]
The `NOT` command requires will NOT values together with NOT being defined
depending on the types of the values. Values are NOTed left to right.

Providing the command no arguments is equivalent to providing the command with
a single undefined argument.

If the command is provided a single argument then the result is whether the
argument is falsey.

If the left and right values are lists then the result is the set of elements
in the left list that do not also exist in the right list.

Otherwise the operation returns 0.

    NOT 1 ; Returns 0

### OR [value1 value2...]
The `OR` command requires will OR values together with OR being defined
depending on the types of the values. Values are ORed left to right.

Providing the command no arguments is equivalent to providing the command with
a single undefined argument.

If the command is provided a single argument then the result is whether the
argument is truthy.

If the left and right values are lists then the result is the union of the two
lists with only distinct elements returned.

If the left and right values are numbers then the result is the bitwise OR of
the two numbers.

Otherwise the operation returns 1 if any of the values are truthy and 0
otherwise.

    OR "one" "two" ; Returns 1

### POP
The `POP` command takes no arguments and removes the first command in the list
of commands.

    POP ; Removes the first command

### PUSH "command" [value1 value2...]
The `PUSH` command takes a command name and a set of values to use as the
arguments for the new command. The command is inserted as the first command in
the set of commands.

Indirect references in the set of values decay into direct references.

    PUSH "GOTO" "test" ; Inserts the command GOTO "test" as the first command

### READ
The `READ` command reads a single line from standard input and returns the
data as interpreted as STOP values. The command takes not arguments.

    READ ; Reads a line from standard input

### SUB value1 value2 [...valueN]
The `SUB` command requires at least two values and will subtract them from one
another with subtraction being defined depending on the types of the values.
Values are subtracted left to right.

If left value is a list or a string and the right value is a number then the
item or character at that index is removed.

When subtracting numbers from numbers the numbers are subtracted
arithemtically.

The result of all other data type combinations is not a number.

    SUB 1 2 ; Returns -1

### WRITE [value1 value2...]
The `WRITE` command converts its values into strings that can be interpreted by
STOP and outputs them as a single line to standard out.

    WRITE "Hello world" ; Outputs '"Hello world"'

## License

The STOP language is open-sourced software licensed under the [MIT
license](http://opensource.org/licenses/MIT)

## Contributing

Submit a pull request. If you don't receive a response within a week, send a
mail to <colinjeanne@hotmail.com>.

[1]: https://php.net
[2]: https://java.com
[3]: https://gcc.gnu.org
[4]: https://www.ruby-lang.org
[5]: https://golang.org
[6]: http://forth.com/forth
[7]: https://www.google.com/?q=define:functional "(of a mental illness) having no discernible organic cause."
[8]: http://compsoc.dur.ac.uk/whitespace/tutorial.html
[9]: http://www.2ality.com/2012/04/number-encoding.html
[10]: http://stackoverflow.com/questions/15058757/c-signed-unsigned-mismatch
[11]: https://docs.python.org/3/library/stdtypes.html#text-sequence-type-str
[12]: https://www.google.com/?q=define:functional "(of a disease) affecting the operation, rather than the structure, of an organ."
[13]: https://www.baskinrobbins.com
