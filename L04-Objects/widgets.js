// Some animation widgets, squeezed together in one source file for simplicity of reading

// "Interface" of a widget object:
// getElement(), to return a DOM node standing for this object
// tick(), called to advance the animation to the next step
// isDone(), querying whether this part of the animation is done

// This function returns an animation of a given widget,
// advancing to a new frame every 'period' milliseconds.
function animation(widget, period) {
    function ticker() {
        window.setTimeout(function() {
            widget.tick();
            if (!widget.isDone()) { ticker(); }
        }, period);
    }

    ticker();
    return widget.getElement();
}

// Behold: the prototypical widget!
var Widget = {
    reset: function() { },
    tick: function() { },
    isDone: function() { return true; }
};
// We use safe defaults for everything having to do with state change over time.
// Only getElement() needs to be overridden, for the simple case of a static widget.

// Animation of monospaced text, rotating through a sequence of sprites.
// The argument is an array of arrays of lines of text (strings).
function AsciiAnimation(sprites) {
    var that = Object.create(Widget);

    var span = document.createElement('span');
    span.style.display = "inline-block";
    var pre = document.createElement('pre');
    span.appendChild(pre);

    var useSprite = function(i) {
        pre.innerHTML = "";
        sprites[i].each(function(line) { pre.innerHTML += line + "\n"; });
    };

    var animationFrame = 0;
    useSprite(0);

    that.getElement = function() {
        return span;
    };

    that.reset = function() {
        animationFrame = 0;
    };

    that.tick = function() {
        animationFrame += 1;
        if (animationFrame < sprites.length) {
            useSprite(animationFrame);
        }
    };

    that.isDone = function() {
        return animationFrame >= sprites.length;
    };

    return that;
}

// Play an animation over and over again, given a function for creating new widgets.
function RepeatIndefinitely(widget) {
    var that = Object.create(widget);

    that.isDone = function() {
        if (widget.isDone()) {
            widget.reset();
        }

        return false;
    };

    return that;
}

// Play an animation a certain number of times.
function Repeat(widget, times) {
    var that = Object.create(widget);

    that.isDone = function() {
        if (times <= 0) {
            return true;
        }

        if (widget.isDone()) {
            times -= 1;
            widget.reset();
        }

        return false;
    };

    return that;
}

// Graphics via the HTML canvas.
function Canvas(width, height, withContext) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext('2d');
    withContext(context);

    var that = Object.create(Widget);

    that.getElement = function() {
        return canvas;
    };

    return that;
}

function Circle(radius) {
    return Canvas(radius*2+10, radius*2+10, function(context) {
        context.beginPath();
        context.arc(radius+5, radius+5, radius, 0, 2 * Math.PI, false);
        context.fillStyle = 'green';
        context.fill();
        context.lineWidth = 5;
        context.strokeStyle = '#003300';
        context.stroke();
    });
}

// Lay out a widget array horizontally.
function Horizontal(widgets) {
    var span = document.createElement('span');
    widgets.each(function(widget) { span.appendChild(widget.getElement()); });

    var that = Object.create(Widget);

    that.getElement = function() {
        return span;
    };

    that.reset = function() {
        widgets.each(function(widget) { widget.reset(); });
    };

    that.tick = function() {
        widgets.each(function(widget) { widget.tick(); });
    };

    that.isDone = function() {
        return widgets.reduce(function(widget, b) { return widget.isDone() && b; }, true);
    };

    return that;
}

// Wrap a widget with a certain amount of padding, with width expressed in CSS width format.
function WithPadding(widget, width) {
    width = width || "10px";
    var span = document.createElement("span");
    span.style.display = "inline-block";
    span.style.padding = width;
    span.appendChild(widget.getElement());

    var that = Object.create(widget);

    that.getElement = function() {
        return span;
    };

    return that;
}

// Repeat a single widget scheme (represented as a function returning a widget)
// some number of times, horizontally.
function RepeatHorizontal(makeWidget, count) {
    return Horizontal(Array.create(makeWidget, count));
}

// Like RepeatHorizontal(), but with padding added around each widget.
function RepeatHorizontalWithPadding(makeWidget, count, width) {
    return RepeatHorizontal(function () { return WithPadding(makeWidget(), width); }, count);
}

// Plays a list of widgets in sequence, starting each after the prior one finishes.
function Sequence(widgets) {
    var span = document.createElement("span");
    span.appendChild(widgets[0].getElement());

    var position = 0;

    var that = Object.create(Widget);

    that.getElement = function() {
        return span;
    };

    that.reset = function() {
        widgets.each(function(widget) { widget.reset(); });
        position = 0;
    };

    that.tick = function() {
        widgets[position].tick();
    };

    that.isDone = function() {
        while (position < widgets.length && widgets[position].isDone()) {
            position += 1;
        }

        return position >= widgets.length;
    };

    return that;
}

function Textbox(text, bgcolor, width, height) {
    var span = document.createElement('span');
    span.style.display = "table-cell";
    span.style.width = width;
    span.style.height = height;
    span.style.borderWidth = "2px";
    span.style.backgroundColor = bgcolor;
    span.style.textAlign = "center";
    span.style.verticalAlign = "middle";
    span.innerHTML = text;

    var that = Object.create(Widget);

    that.getElement = function() {
        return span;
    };

    return that;
}

Widget.ChangingPosition = function(maxTime, atTime) {
    var parent = this;
    var that = Object.create(this);

    var span = document.createElement("span");
    span.style.position = "absolute";
    span.appendChild(this.getElement());
    var time = 0;

    var moveIt = function() {
        var pos = atTime(time);
        span.style.left = pos.left + "px";
        span.style.top = pos.top + "px";
    };

    moveIt();

    that.getElement = function() {
        return span;
    };

    that.tick = function() {
        if (!this.isDone()) {
            time += 1;
            moveIt();

            parent.tick();
        }
    };

    that.isDone = function() {
        return time >= maxTime;
    };

    return that;
}


//// Some example animations

var stickman = AsciiAnimation([
    [" o ",
     "-|-",
     "/ \\"],
    ["o  ",
     "|- ",
     "|\\ "],
    [" o ",
     "-|-",
     "/ \\"],
    ["  o",
     " -|",
     " /|"]
]);

var current = Horizontal([Repeat(stickman, 5),
                          Textbox(":-)", "blue", "50px", "10px")
                          .ChangingPosition(10, function(time) {
                              return {left: time*5,
                                      top: time*10};
                          })
                         ]);