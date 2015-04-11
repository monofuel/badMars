// Generated by CoffeeScript 1.4.0
(function() {
  var Mixed, World, mongoose, worldSchema;

  mongoose = require('mongoose');

  Mixed = mongoose.Schema.Types.Mixed;

  exports.Ready = false;

  worldSchema = mongoose.Schema({
    name: String,
    water: Number,
    vertex_grid: Mixed
  });

  World = mongoose.model('World', worldSchema);

  exports.init = function() {
    var db, func;
    mongoose.connect('mongodb://localhost/badMars');
    db = mongoose.connection;
    db.on('error', console.error.bind(console, 'mongo connection error: '));
    return db.once('open', func = function(callback) {
      return exports.Ready = true;
    });
  };

  exports.addWorld = function(world) {
    var func, worldDoc;
    worldDoc = new World(world);
    return worldDoc.save(func = function(err, badMars) {
      if (err) {
        console.error(err);
      }
      return console.log(badMars);
    });
  };

}).call(this);
