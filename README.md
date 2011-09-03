# Node Ast Inlining

Node Ast Inlining is a small (~200 LOC) library that [inline and expand](http://en.wikipedia.org/wiki/Inline_expansion) function call

### Work In Progress

Node Ast Inlining currently inling only method calls and expand simple function with one return statement.

### Installation

This package can be installed via [npm](http://npmjs.org/) as follows

    % npm install ast-inlining -g

### Usage
    
    var inliner = require('../index')
    ,   f = {
      testInput: function(data) {
        // Method calls that will be inlined 
        return a._startWith(data.content, 'ipsum') || f._contains(data.name, 'reau') || a._startWith(data.content, 'Lorem');
      },

      _substr: function(where, what) {
        return where.indexOf(what) !== -1;
      },
      _contains: function(where, what) {
        return f._substr(where, ' ' + what + ' ');
      },
      _csstartWith: function(where, what) {
        return where.indexOf(what) === 0;
      }
    }
    , a = {
      _startWith: function(where, what) {
        return f._csstartWith(where.toLowerCase(), what.toLowerCase());
      }
    }

    // For now we need to explicitly declare the testInput call context
    var context = {f:f, a:a};

    f.testInputInlined = inliner.inline_function(f.testInput, context);

    console.log(f.testInputInlined.toString());
    /*
    * function anon_0(data) {
    *   return data.content.toLowerCase().indexOf("ipsum".toLowerCase()) === 0 
    *     || data.name.indexOf(" reau ") !== -1 
    *     || data.content.toLowerCase().indexOf("Lorem".toLowerCase()) === 0;
    * }
    */

### API

   * `inline_function(fct, context [, option])` Inline-expands method calls inside `fct` given the `context` 
   * `inline_ast(ast, context)` Inline-expands method calls inside `ast` given the `context` 

### Benchmark

    % node bench/bench.js

![Benchmark](http://chart.apis.google.com/chart?chtt=Operations/second%20on%20node|(v0.4.11%20/%20darwin)&chts=000000,10&cht=bhg&chd=t:1464000,1648000&chds=0,1648000&chxt=x&chxl=0:|0|1.648M&chsp=0,1&chm=tWithout%20inlining(1.464M),000000,0,0,10|tWith%20inlining(1.648M),000000,0,1,10&chbh=15,0,5&chs=250x110 "Benchmark's result")

![Benchmark](http://chart.apis.google.com/chart?chtt=Operations/second%20on%20node|(v0.4.11%20/%20darwin)&chts=000000,10&cht=bhg&chd=t:875600,1500000&chds=0,1500000&chxt=x&chxl=0:|0|1.5M&chsp=0,1&chm=tWithout%20inlining(875.6k),000000,0,0,10|tWith%20inlining(1.5M),000000,0,1,10&chbh=15,0,5&chs=250x110 "Benchmark's result")

### Tests
    % make test
  Or

    % nodeunit test/ast_inlining.test.js

### TODO
 * `extremeInline` option for native Date, Number and String's prototype method inlining
 * Inline & expand small function < 10 LOC

### Licence

Copyright (c) 2011, Francois-Guillaume Ribreau <node@fgribreau.com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  - Redistributions of source code must retain the above copyright notice,
    this list of conditions and the following disclaimer.

  - Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

  - Neither the name of node-ast-inliner nor the names of its contributors
    may be used to endorse or promote products derived from this software
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.