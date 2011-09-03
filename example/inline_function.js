(function() {
  var a, f, inliner;
  inliner = require('../index');
  f = {
    testInput: function(data) {
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
  };
  a = {
    _startWith: function(where, what) {
      return f._csstartWith(where.toLowerCase(), what.toLowerCase());
    }
  };
  f.testInputInlined = inliner.inline_function(f.testInput, {
    f: f,
    a: a
  });
  console.log(f.testInputInlined.toString());
  /*
  # function anon_0(data) {
  #   return data.content.toLowerCase().indexOf("ipsum".toLowerCase()) === 0 
  #     || data.name.indexOf(" reau ") !== -1 
  #     || data.content.toLowerCase().indexOf("Lorem".toLowerCase()) === 0;
  # }
  */
}).call(this);
