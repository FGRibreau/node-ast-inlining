require 'nodeunit'
jsp = require("uglify-js").parser
pro = require("uglify-js").uglify

inliner = require '../index'

op = 
  substr: (t, a) ->
    op.cssubstr(a.toLowerCase(), t.toLowerCase())
  
  cssubstr: (s, d) ->
    s.indexOf(d) != -1
  
  contains: (e, f) ->
    op.substr(e, ' '+f+' ')
  
  any: (t, a) ->
      if a.length == 1
        return op.substr(t,a[0])

      i = a.length
      targetLowerCase = t.toLowerCase()

      while i--

        if targetLowerCase.indexOf(a[i].toLowerCase()) != -1
          return true
      
      return false


exports["Helper inline_function should work"] = (t) ->

  myFunc = (a, b, c) ->
    notUsed = "ok"

    if a == 1
      return op.substr("hello world", "world")

    return true
  
  inlinedFunc = inliner.inline_function(myFunc, {op:op})

  t.notDeepEqual(myFunc.toString(), inlinedFunc, "the returned function differ")

  t.done()


exports["Shouldn't inline complex function"] = (t) ->
  a = """function anon(d){
    return op.any(d.lang, ['fr','en','es'])
  }"""

  ast = jsp.parse(a)

  orginal_ast = ["toplevel",[["defun","anon",["d"],[["return",["call",["dot",["name","op"],"any"],[["dot",["name","d"],"lang"],["array",[["string","fr"],["string","en"],["string","es"]]]]]]]]]]; # == ast

  inliner.inline_ast(ast, {op:op})

  t.deepEqual(orginal_ast, ast, "don't inline complexe fonction")

  t.done()

exports["Inline_ast should modify AST input"] = (t) ->

  a = """function anon(d){
    return op.substr(d.content, 'hello')
  }"""

  ast =  ["toplevel",[["defun","anon",["d"],[["return",["call",["dot",["name","op"],"substr"],[["dot",["name","d"],"content"],["string","hello"]]]]]]]]

  original_ast = ["toplevel",[["defun","anon",["d"],[["return",["call",["dot",["name","op"],"substr"],[["dot",["name","d"],"content"],["string","hello"]]]]]]]]


  t.deepEqual(ast, original_ast, "Equal")

  inliner.inline_ast(ast, {op:op})

  t.notDeepEqual(original_ast, ast, "Ast_after differ from the original ast")

  t.done()


exports["Inline_ast should transfer arguments"] = (t) ->
  
  a = """
  function anon(d){
    return op.cssubstr(t.toLowerCase(), a.toLowerCase());
    //return op.substr(d.content, "test") === false
  }
  """

  ast = jsp.parse(a)
  inliner.inline_ast(ast, {op:op})
  t.equal(pro.gen_code(ast), "function anon(d){return t.toLowerCase().indexOf(a.toLowerCase())!==-1}")

  t.done()


exports["Inline_ast should trasfer arguments(2)"] = (t) ->

  a = """
  function anon(d){
    return op.substr(d.content,"test", undefined) === false
  }
  """

  ast = jsp.parse(a);
  inliner.inline_ast(ast, {op:op})

  shouldBe = ["toplevel",[["defun","anon",["d"],[["return",["binary","===",["binary","!==",["call",["dot",["call",["dot",["string","test"],"toLowerCase"],[]],"indexOf"],[["call",["dot",["dot",["name","d"],"content"],"toLowerCase"],[]]]],["unary-prefix","-",["num",1]]],["name","false"]]]]]]]

  t.deepEqual ast, shouldBe, "Transfer Arguments on X level"
  t.done()

exports["_transferArgs should transfer args"] = (t) ->

  shouldBe =
    t:["dot",["name","d"],"content"]
    a:["string","test"]


  ret = inliner._transferArgs(undefined, ["t","a"], [["dot",["name","d"],"content"],["string","test"],["name","undefined"]])

  t.deepEqual ret, shouldBe, ""

  t.done()

exports["_transferArgs should transfer args on multiple level"] = (t) ->

  shouldBe = {"d":["call",["dot",["dot",["call",["dot",["dot",["name","d"],"content"],"toLowerCase"],[]],"content"],"toLowerCase"],[]],"s":["call",["dot",["string","test"],"toLowerCase"],[]]}


  ret = inliner._transferArgs({"d":["call",["dot",["dot",["name","d"],"content"],"toLowerCase"],[]],"s":["call",["dot",["string","test"],"toLowerCase"],[]]}, ["s","d"], [["call",["dot",["string","test"],"toLowerCase"],[]],["call",["dot",["dot",["name","d"],"content"],"toLowerCase"],[]]])

  t.deepEqual ret, shouldBe

  t.done()


exports["Inline_ast should inline multiple call level"] = (t) ->
  fct = """
  function myFunc(d) {return op.contains(d.user.name, 'reau')}
  """

  ast = jsp.parse(fct);

  inliner.inline_ast(ast, {op:op});

  t.deepEqual ast, ["toplevel",[["defun","myFunc",["d"],[["return",["binary","!==",["call",["dot",["call",["dot",["binary","+",["binary","+",["string"," "],["string","reau"]],["string"," "]],"toLowerCase"],[]],"indexOf"],[["call",["dot",["dot",["dot",["name","d"],"user"],"name"],"toLowerCase"],[]]]],["unary-prefix","-",["num",1]]]]]]]]

  ###

  function myFunc(d) {
      return (" " + "reau" + " ").toLowerCase().indexOf(d.user.name.toLowerCase()) !== -1;
  }
  ###

  t.done()

exports["_replace should replace arguments"] = (t) ->
  t.expect 2

  ast = [["binary","+",["binary","+",["string"," "],["name","f"]],["string"," "]]]

  inliner._replace(ast, 0, {"f":["string","reau"],"e":["dot",["dot",["name","d"],"user"],"name"]})

  t.deepEqual(ast, [["binary","+",["binary","+",["string"," "],["string","reau"]],["string"," "]]], "replace 1 argument")


  ast = [["name","e"]]

  inliner._replace(ast, 0, {"f":["string","reau"], "e":["dot",["dot",["name","d"],"user"],"name"]})

  t.deepEqual(ast, [["dot",["dot",["name","d"],"user"],"name"]], "replace 1 argument (but single entry)")

  t.done()


exports["Inline_ast should inline multiple call with multiple call level"] = (t) ->
  # Before inlining:
  fct = """
    function myFunc(d) {
      return (op.substr(d.generic.content, 'nantes') 
      || op.contains(d.user.name, 'fg') 
      && op.contains(d.user.name, 'reau'))}
  """

  ###
  After inlining:

  function myFunc(d) {
      return "nantes".toLowerCase().indexOf(d.generic.content.toLowerCase()) !== -1 
      || (" " + "fg" + " ").toLowerCase().indexOf(d.user.name.toLowerCase()) !== -1 
      && (" " + "reau" + " ").toLowerCase().indexOf(d.user.name.toLowerCase()) !== -1;
  }
  ###

  ast = jsp.parse(fct);

  inliner.inline_ast(ast, {op:op})

  t.deepEqual ast, ["toplevel",[["defun","myFunc",["d"],[["return",["binary","||",["binary","!==",["call",["dot",["call",["dot",["string","nantes"],"toLowerCase"],[]],"indexOf"],[["call",["dot",["dot",["dot",["name","d"],"generic"],"content"],"toLowerCase"],[]]]],["unary-prefix","-",["num",1]]],["binary","&&",["binary","!==",["call",["dot",["call",["dot",["binary","+",["binary","+",["string"," "],["string","fg"]],["string"," "]],"toLowerCase"],[]],"indexOf"],[["call",["dot",["dot",["dot",["name","d"],"user"],"name"],"toLowerCase"],[]]]],["unary-prefix","-",["num",1]]],["binary","!==",["call",["dot",["call",["dot",["binary","+",["binary","+",["string"," "],["string","reau"]],["string"," "]],"toLowerCase"],[]],"indexOf"],[["call",["dot",["dot",["dot",["name","d"],"user"],"name"],"toLowerCase"],[]]]],["unary-prefix","-",["num",1]]]]]]]]]], "Multiple Calls"


  t.done()


# Helper
dd = (ast, oneLine) ->
  i = 0
  console.log "\n--------------\n", JSON.stringify(ast).replace(/\[\[/gi, (a) ->
    if !oneLine then "\n"+Array(++i).join("\t")+"[[" else a
  )

# Show only calls
da = (ast, beautify) ->
  console.log "\n--------------\n", pro.gen_code(ast,{beautify: beautify || true})
