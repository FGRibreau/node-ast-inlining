/*!
 * Node-ast-inlining
 * Copyright(c) 2011 Francois-Guillaume Ribreau <github@fgribreau.com>
 */

var jsp = require("uglify-js").parser
,   pro = require("uglify-js").uglify
,   _ = require('underscore');

function inliner(){
  this.__inlinerAnon = 0;
}

// Public API

// Usage
// require('ast-inlining').inline_function(function(){return ...;}, {});
// require('ast-inlining').inline_function(functionSourceCode, {});
inliner.prototype.inline_function = function(fct, context, _option){
  var option = _.extend({beautify:true, optimizeSize:true}, _option);

  // Bug fix for Uglify
  var sourceCode = this._uglifyAnonBugFix(typeof fct != 'string' ? fct.toString() : fct);
  
  // Generate AST
  var ast = jsp.parse(sourceCode);

  // Inline if possible
  this.inline_ast(ast, context);

  // Optimize (in size) if wanted
  if(option.optimizeSize){
    ast = pro.ast_squeeze(ast, context);
  }

  // Return the generate code
  return pro.gen_code(ast, option);
};

inliner.prototype.inline_ast = function(root, _context){
  var context = _context || {};
  
  var queue = [{context:root,parentContext:root, parentContextIndex:0}]// [context, parentContext]
  , c = null;

  while(c = queue.pop()){

    // We've found a call, if this call is present in the context inline it
    if(c.context[0] == 'call' && this._getAccessors(c.context[1]).reverse()[0] in context){
      c.parentContext[c.parentContextIndex] = this._inlineCall(c.context, context);

    } else {
      // Find others array in c.context array
      var i = c.context.length;

      while(i--){
        if(Array.isArray(c.context[i])){
          queue.push({context:c.context[i], parentContext:c.context, parentContextIndex:i});
        }
      }
    }
  }
};

// Private API
inliner.prototype._uglifyAnonBugFix = function(fctSourceCode){
  // Uglify dislike anonymous function
  return fctSourceCode.replace(/function\s?\(/,'function anon_'+(this.__inlinerAnon++)+'(');
}

inliner.prototype._inlineCall = function(callRoot, context, parentArgsValue){
  // Get the function source-code
  // Uglify dislike anonymous function
  var fct = this._getFunction(callRoot[1], context).toString().replace(/function\s?\(/,'function anon_'+(this.__inlinerAnon++)+'(');

  // Get the function's AST
  var fctAst = jsp.parse(fct);

  // If the first function instruction isn't return abort
  // @TODO: Inline if the fct LOC < 10 
  if(fctAst[1][0][3][0][0] !== 'return'){
    return callRoot;
  }

  // Function's arguments
  var fctArgs = fctAst[1][0][2];

  // Get each function arguments value (AST)
  var argsValue = this._transferArgs(parentArgsValue, fctArgs, callRoot[2]);
  
  // Now, all we have to do is replace arguments variable by their calling value
  var queue = [{context:fctAst, parentContext:fctAst, parentContextIndex:0}]// [context, parentContext]
  , c = null;

  while(c = queue.pop()){

    // This is a variable ! Is it a function argument ?
    if(c.context[0] == 'name' && argsValue[c.context[1]]){

      // Yes, replace ["name","xxx"] by it's calling value
      c.parentContext[c.parentContextIndex] = argsValue[c.context[1]];

    } else if(c.context[0] == 'call' && this._getAccessors(c.context[1]).reverse()[0] in context){

      // This is a subcall ! Inline it !
      c.parentContext[c.parentContextIndex] = this._inlineCall(c.context, context, argsValue);

    }else {
      // Find others array in c.context array
      var i = c.context.length;

      while(i--){
        if(Array.isArray(c.context[i])){
          queue.push({context:c.context[i],parentContext:c.context, parentContextIndex:i});
        }
      }
    }
  }

  // Return the function's body after return
  return fctAst[1][0][3][0][1];
};

// Forward arguments between successive calls
// and apply call modification on these arguments if necessary
// @retur {hash} {arg1Name:[ASTValue], arg2Name:[ASTValue2]}
inliner.prototype._transferArgs = function(parentArgsValue, fctArgs, callingArgs){
  var args = {}
  , i = fctArgs.length;

  while(i--){
    args[fctArgs[i]] = callingArgs[i];

    if(parentArgsValue){
      this._replace(args,fctArgs[i], parentArgsValue);
    }
  }

  return args;
};

inliner.prototype._replace = function(parentContext, parentContextIndex, hashReplace){
  var queue = [{context:parentContext[parentContextIndex], parentContext:parentContext, parentContextIndex:parentContextIndex}]// [context, parentContext]
  , c = null;

  while(c = queue.pop()){

    // We've found a var, check if it's an argument
    if(c.context[0] == 'name' && hashReplace[c.context[1]]){
      // Replace ["name","xxx"] by his calling value
      c.parentContext[c.parentContextIndex] = hashReplace[c.context[1]];  

    } else {
      // Find others array in c.context array
      var i = c.context.length;

      while(i--){
        if(Array.isArray(c.context[i])){
          queue.push({context:c.context[i],parentContext:c.context, parentContextIndex:i});
        }
      }
    }
  }

}

inliner.prototype._getAccessors = function(methodAccessors, context){
  var call = _.flatten(methodAccessors)
  , i = call.length
  , accessors = [];

  while(call[--i] && call[i] != 'name'){
    if(call[i] != 'name')
      accessors.push(call[i]);
  }

  return accessors;
};


inliner.prototype._getFunction = function(methodAccessors, context){
  var ctx = context
  , accessors = this._getAccessors(methodAccessors, context)
  , accessor;

  while(accessor = accessors.pop()){
    if(typeof ctx[accessor] === 'undefined'){
      throw new Error("The context doesn't have the '"+accessor+"' attribute.");
    }

    ctx = ctx[accessor];
  }

  return ctx;
}


module.exports = new inliner();