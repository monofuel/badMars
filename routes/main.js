// Generated by CoffeeScript 1.9.3
var World, express, mongoose, router;

express = require('express');

router = express.Router();

mongoose = require('mongoose');

World = mongoose.model('World');

module.exports = function(app) {
  app.get('/', function(req, res) {
    return World.find(function(err, worlds) {
      var i, len, world, worldNames;
      worldNames = new Array();
      for (i = 0, len = worlds.length; i < len; i++) {
        world = worlds[i];
        worldNames.push(world.name);
      }
      return res.render('pages/index', {
        worlds: worldNames
      });
    });
  });
  return app.get('/planet_viewer', function(req, res) {
    return res.render('pages/planet_viewer');
  });
};
