// Generated by CoffeeScript 1.4.0
(function() {
  var SimplexNoise, simplex;

  SimplexNoise = require('simplex-noise');

  simplex = {};

  exports.init = function() {
    return simplex = new SimplexNoise(Math.random);
  };

  exports.generate = function(name) {
    var chunk_size, fNoiseScale, fRds, fRdsSin, generatedWorld, iSize, noise, x, y, _i, _j, _ref, _ref1;
    iSize = 32 - 1;
    fRds = iSize;
    fRdsSin = .5 * iSize / (2 * Math.PI);
    fNoiseScale = .3;
    chunk_size = 32;
    noise = function(x, y) {
      var a, b, c, fNX, fNY, fRdx, fRdy, fYSin, v;
      fNX = (x + .5) / iSize;
      fNY = (y + .5) / iSize;
      fRdx = fNX * 2 * Math.PI;
      fRdy = fNY * Math.PI;
      fYSin = Math.sin(fRdy + Math.PI);
      a = fRdsSin * Math.sin(fRdx) * fYSin;
      b = fRdsSin * Math.cos(fRdx) * fYSin;
      c = fRdsSin * Math.cos(fRdy);
      v = simplex.noise3D(123 + a * fNoiseScale, 132 + b * fNoiseScale, 312 + c * fNoiseScale);
      return v * 5;
    };
    generatedWorld = {};
    generatedWorld.name = name;
    generatedWorld.water = 2;
    generatedWorld.vertex_grid = [];
    for (x = _i = 0, _ref = chunk_size - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
      generatedWorld.vertex_grid[x] = [];
      for (y = _j = 0, _ref1 = chunk_size - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
        generatedWorld.vertex_grid[x][y] = noise(x, y);
      }
    }
    return generatedWorld;
  };

}).call(this);
