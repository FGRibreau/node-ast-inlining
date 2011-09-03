inliner = require '../index'
# or 
# inliner = require 'ast-inlining'

f = 
  testInput: (data) ->
    # Method calls that will be inlined 
    a._startWith(data.content, 'ipsum') || f._contains(data.name, 'reau') || a._startWith(data.content, 'Lorem')

  _substr: (where, what) ->
    where.indexOf(what) != -1
  
  _contains: (where, what) ->
    f._substr(where, ' '+what+' ')
  
  # case sensitive
  _csstartWith: (where, what) ->
    where.indexOf(what) == 0

a = 
  _startWith: (where, what) ->
    f._csstartWith(where.toLowerCase(), what.toLowerCase())


# Inline calls
f.testInputInlined = inliner.inline_function(f.testInput, f:f, a:a)

console.log f.testInputInlined.toString()
###
# function anon_0(data) {
#   return data.content.toLowerCase().indexOf("ipsum".toLowerCase()) === 0 
#     || data.name.indexOf(" reau ") !== -1 
#     || data.content.toLowerCase().indexOf("Lorem".toLowerCase()) === 0;
# }
###