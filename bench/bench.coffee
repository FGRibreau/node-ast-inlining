# Dependencies
jslitmus = require 'jslitmus'
jsp = require("uglify-js").parser
pro = require("uglify-js").uglify
vm = require 'vm'
sys = require 'sys'

inliner = require '../index'

# Helpers
eval = (sourceCode, isVerbose, evalContext) ->
  try
    vm.runInNewContext("this[\"-eval-\"] = function(code){ eval(code); };", evalContext)
    evalContext["-eval-"] "this.evaluate = function(){return " + (sourceCode or "") + "};"
    return evalContext.evaluate()
  catch error
    throw error if isVerbose
    return false

# f.startWith & f.contain are going to be inlined
fct = """
  function myFunc(data) {
    return f.startWith(data.content, 'ipsum') || f.contains(data.name, 'reau') || f.startWith(data.content, 'Lorem')
  }
  """;

# Stub
data = 
  lang:'fr'
  content:'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod'
  name:'fgribreau'

f = 
  substr: (where, what) ->
    where.indexOf(what) != -1
  
  contains: (where, what) ->
    f.substr(where, ' '+what+' ')
  
  startWith: (where, what) ->
    f.csstartWith(where.toLowerCase(), what.toLowerCase())
  
  # case sensitive
  csstartWith: (where, what) ->
    where.indexOf(what) == 0

context =
  f:f
    

ast = jsp.parse(fct);
inliner.inline_ast(ast, context)


func1 = eval(fct, true, context)
func2 = eval(pro.gen_code(ast), true, context)

console.log 'Without inlining:', func1.toString(),"\n"
console.log 'With inlining:', func2.toString(),"\n\nTesting..."


jslitmus.test('Without inlining', () ->
    func1(data)
)

jslitmus.test('With inlining', () ->
    func2(data)
)
# Log the test results
jslitmus.on('complete', (test) ->
    sys.log(test)    
)

jslitmus.on('all_complete', () ->
  console.log("\n",jslitmus.getGoogleChart());
)

# Run it!
jslitmus.runAll()