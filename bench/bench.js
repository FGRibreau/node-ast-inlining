(function() {
  var ast, context, data, eval, f, fct, func1, func2, inliner, jslitmus, jsp, pro, sys, vm;
  jslitmus = require('jslitmus');
  jsp = require("uglify-js").parser;
  pro = require("uglify-js").uglify;
  vm = require('vm');
  sys = require('sys');
  inliner = require('../index');
  eval = function(sourceCode, isVerbose, evalContext) {
    try {
      vm.runInNewContext("this[\"-eval-\"] = function(code){ eval(code); };", evalContext);
      evalContext["-eval-"]("this.evaluate = function(){return " + (sourceCode || "") + "};");
      return evalContext.evaluate();
    } catch (error) {
      if (isVerbose) {
        throw error;
      }
      return false;
    }
  };
  fct = "function myFunc(data) {\n  return f.startWith(data.content, 'ipsum') || f.contains(data.name, 'reau') || f.startWith(data.content, 'Lorem')\n}";
  data = {
    lang: 'fr',
    content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod',
    name: 'fgribreau'
  };
  f = {
    substr: function(where, what) {
      return where.indexOf(what) !== -1;
    },
    contains: function(where, what) {
      return f.substr(where, ' ' + what + ' ');
    },
    startWith: function(where, what) {
      return f.csstartWith(where.toLowerCase(), what.toLowerCase());
    },
    csstartWith: function(where, what) {
      return where.indexOf(what) === 0;
    }
  };
  context = {
    f: f
  };
  ast = jsp.parse(fct);
  inliner.inline_ast(ast, context);
  func1 = eval(fct, true, context);
  func2 = eval(pro.gen_code(ast), true, context);
  console.log('Without inlining:', func1.toString(), "\n");
  console.log('With inlining:', func2.toString(), "\n\nTesting...");
  jslitmus.test('Without inlining', function() {
    return func1(data);
  });
  jslitmus.test('With inlining', function() {
    return func2(data);
  });
  jslitmus.on('complete', function(test) {
    return sys.log(test);
  });
  jslitmus.on('all_complete', function() {
    return console.log("\n", jslitmus.getGoogleChart());
  });
  jslitmus.runAll();
}).call(this);
