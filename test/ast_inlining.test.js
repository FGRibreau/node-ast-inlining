(function() {
  var da, dd, inliner, jsp, op, pro;
  require('nodeunit');
  jsp = require("uglify-js").parser;
  pro = require("uglify-js").uglify;
  inliner = require('../index');
  op = {
    substr: function(t, a) {
      return op.cssubstr(a.toLowerCase(), t.toLowerCase());
    },
    cssubstr: function(s, d) {
      return s.indexOf(d) !== -1;
    },
    contains: function(e, f) {
      return op.substr(e, ' ' + f + ' ');
    },
    any: function(t, a) {
      var i, targetLowerCase;
      if (a.length === 1) {
        return op.substr(t, a[0]);
      }
      i = a.length;
      targetLowerCase = t.toLowerCase();
      while (i--) {
        if (targetLowerCase.indexOf(a[i].toLowerCase()) !== -1) {
          return true;
        }
      }
      return false;
    }
  };
  exports["Helper inline_function should work"] = function(t) {
    var inlinedFunc, myFunc;
    myFunc = function(a, b, c) {
      var notUsed;
      notUsed = "ok";
      if (a === 1) {
        return op.substr("hello world", "world");
      }
      return true;
    };
    inlinedFunc = inliner.inline_function(myFunc, {
      op: op
    });
    t.notDeepEqual(myFunc.toString(), inlinedFunc, "the returned function differ");
    return t.done();
  };
  exports["Shouldn't inline complex function"] = function(t) {
    var a, ast, orginal_ast;
    a = "function anon(d){\n  return op.any(d.lang, ['fr','en','es'])\n}";
    ast = jsp.parse(a);
    orginal_ast = ["toplevel", [["defun", "anon", ["d"], [["return", ["call", ["dot", ["name", "op"], "any"], [["dot", ["name", "d"], "lang"], ["array", [["string", "fr"], ["string", "en"], ["string", "es"]]]]]]]]]];
    inliner.inline_ast(ast, {
      op: op
    });
    t.deepEqual(orginal_ast, ast, "don't inline complexe fonction");
    return t.done();
  };
  exports["Inline_ast should modify AST input"] = function(t) {
    var a, ast, original_ast;
    a = "function anon(d){\n  return op.substr(d.content, 'hello')\n}";
    ast = ["toplevel", [["defun", "anon", ["d"], [["return", ["call", ["dot", ["name", "op"], "substr"], [["dot", ["name", "d"], "content"], ["string", "hello"]]]]]]]];
    original_ast = ["toplevel", [["defun", "anon", ["d"], [["return", ["call", ["dot", ["name", "op"], "substr"], [["dot", ["name", "d"], "content"], ["string", "hello"]]]]]]]];
    t.deepEqual(ast, original_ast, "Equal");
    inliner.inline_ast(ast, {
      op: op
    });
    t.notDeepEqual(original_ast, ast, "Ast_after differ from the original ast");
    return t.done();
  };
  exports["Inline_ast should transfer arguments"] = function(t) {
    var a, ast;
    a = "function anon(d){\n  return op.cssubstr(t.toLowerCase(), a.toLowerCase());\n  //return op.substr(d.content, \"test\") === false\n}";
    ast = jsp.parse(a);
    inliner.inline_ast(ast, {
      op: op
    });
    t.equal(pro.gen_code(ast), "function anon(d){return t.toLowerCase().indexOf(a.toLowerCase())!==-1}");
    return t.done();
  };
  exports["Inline_ast should trasfer arguments(2)"] = function(t) {
    var a, ast, shouldBe;
    a = "function anon(d){\n  return op.substr(d.content,\"test\", undefined) === false\n}";
    ast = jsp.parse(a);
    inliner.inline_ast(ast, {
      op: op
    });
    shouldBe = ["toplevel", [["defun", "anon", ["d"], [["return", ["binary", "===", ["binary", "!==", ["call", ["dot", ["call", ["dot", ["string", "test"], "toLowerCase"], []], "indexOf"], [["call", ["dot", ["dot", ["name", "d"], "content"], "toLowerCase"], []]]], ["unary-prefix", "-", ["num", 1]]], ["name", "false"]]]]]]];
    t.deepEqual(ast, shouldBe, "Transfer Arguments on X level");
    return t.done();
  };
  exports["_transferArgs should transfer args"] = function(t) {
    var ret, shouldBe;
    shouldBe = {
      t: ["dot", ["name", "d"], "content"],
      a: ["string", "test"]
    };
    ret = inliner._transferArgs(void 0, ["t", "a"], [["dot", ["name", "d"], "content"], ["string", "test"], ["name", "undefined"]]);
    t.deepEqual(ret, shouldBe, "");
    return t.done();
  };
  exports["_transferArgs should transfer args on multiple level"] = function(t) {
    var ret, shouldBe;
    shouldBe = {
      "d": ["call", ["dot", ["dot", ["call", ["dot", ["dot", ["name", "d"], "content"], "toLowerCase"], []], "content"], "toLowerCase"], []],
      "s": ["call", ["dot", ["string", "test"], "toLowerCase"], []]
    };
    ret = inliner._transferArgs({
      "d": ["call", ["dot", ["dot", ["name", "d"], "content"], "toLowerCase"], []],
      "s": ["call", ["dot", ["string", "test"], "toLowerCase"], []]
    }, ["s", "d"], [["call", ["dot", ["string", "test"], "toLowerCase"], []], ["call", ["dot", ["dot", ["name", "d"], "content"], "toLowerCase"], []]]);
    t.deepEqual(ret, shouldBe);
    return t.done();
  };
  exports["Inline_ast should inline multiple call level"] = function(t) {
    var ast, fct;
    fct = "function myFunc(d) {return op.contains(d.user.name, 'reau')}";
    ast = jsp.parse(fct);
    inliner.inline_ast(ast, {
      op: op
    });
    t.deepEqual(ast, ["toplevel", [["defun", "myFunc", ["d"], [["return", ["binary", "!==", ["call", ["dot", ["call", ["dot", ["binary", "+", ["binary", "+", ["string", " "], ["string", "reau"]], ["string", " "]], "toLowerCase"], []], "indexOf"], [["call", ["dot", ["dot", ["dot", ["name", "d"], "user"], "name"], "toLowerCase"], []]]], ["unary-prefix", "-", ["num", 1]]]]]]]]);
    /*
    
      function myFunc(d) {
          return (" " + "reau" + " ").toLowerCase().indexOf(d.user.name.toLowerCase()) !== -1;
      }
      */
    return t.done();
  };
  exports["_replace should replace arguments"] = function(t) {
    var ast;
    t.expect(2);
    ast = [["binary", "+", ["binary", "+", ["string", " "], ["name", "f"]], ["string", " "]]];
    inliner._replace(ast, 0, {
      "f": ["string", "reau"],
      "e": ["dot", ["dot", ["name", "d"], "user"], "name"]
    });
    t.deepEqual(ast, [["binary", "+", ["binary", "+", ["string", " "], ["string", "reau"]], ["string", " "]]], "replace 1 argument");
    ast = [["name", "e"]];
    inliner._replace(ast, 0, {
      "f": ["string", "reau"],
      "e": ["dot", ["dot", ["name", "d"], "user"], "name"]
    });
    t.deepEqual(ast, [["dot", ["dot", ["name", "d"], "user"], "name"]], "replace 1 argument (but single entry)");
    return t.done();
  };
  exports["Inline_ast should inline multiple call with multiple call level"] = function(t) {
    var ast, fct;
    fct = "function myFunc(d) {\n  return (op.substr(d.generic.content, 'nantes') \n  || op.contains(d.user.name, 'fg') \n  && op.contains(d.user.name, 'reau'))}";
    /*
      After inlining:
    
      function myFunc(d) {
          return "nantes".toLowerCase().indexOf(d.generic.content.toLowerCase()) !== -1 
          || (" " + "fg" + " ").toLowerCase().indexOf(d.user.name.toLowerCase()) !== -1 
          && (" " + "reau" + " ").toLowerCase().indexOf(d.user.name.toLowerCase()) !== -1;
      }
      */
    ast = jsp.parse(fct);
    inliner.inline_ast(ast, {
      op: op
    });
    t.deepEqual(ast, ["toplevel", [["defun", "myFunc", ["d"], [["return", ["binary", "||", ["binary", "!==", ["call", ["dot", ["call", ["dot", ["string", "nantes"], "toLowerCase"], []], "indexOf"], [["call", ["dot", ["dot", ["dot", ["name", "d"], "generic"], "content"], "toLowerCase"], []]]], ["unary-prefix", "-", ["num", 1]]], ["binary", "&&", ["binary", "!==", ["call", ["dot", ["call", ["dot", ["binary", "+", ["binary", "+", ["string", " "], ["string", "fg"]], ["string", " "]], "toLowerCase"], []], "indexOf"], [["call", ["dot", ["dot", ["dot", ["name", "d"], "user"], "name"], "toLowerCase"], []]]], ["unary-prefix", "-", ["num", 1]]], ["binary", "!==", ["call", ["dot", ["call", ["dot", ["binary", "+", ["binary", "+", ["string", " "], ["string", "reau"]], ["string", " "]], "toLowerCase"], []], "indexOf"], [["call", ["dot", ["dot", ["dot", ["name", "d"], "user"], "name"], "toLowerCase"], []]]], ["unary-prefix", "-", ["num", 1]]]]]]]]]], "Multiple Calls");
    return t.done();
  };
  dd = function(ast, oneLine) {
    var i;
    i = 0;
    return console.log("\n--------------\n", JSON.stringify(ast).replace(/\[\[/gi, function(a) {
      if (!oneLine) {
        return "\n" + Array(++i).join("\t") + "[[";
      } else {
        return a;
      }
    }));
  };
  da = function(ast, beautify) {
    return console.log("\n--------------\n", pro.gen_code(ast, {
      beautify: beautify ||  true
    }));
  };
}).call(this);
