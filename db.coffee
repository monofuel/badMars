mongoose = require('mongoose')
Mixed = mongoose.Schema.Types.Mixed
exports.Ready = false

#------------------------------------------------------------

#object definitions
worldSchema = mongoose.Schema({
  name: String
  water: Number
  vertex_grid: Mixed
  movement_grid: Mixed
  settings: Mixed
  seed: Number
})

resourceSchema = mongoose.Schema({
  type: String
  rate: Number
  location: [Number]
})

buildingSchema = mongoose.Schema({
  type: String
  rate: Number
  location: [Number]
  construct_queue: [String]
  Owner: Number
})

unitSchema = mongoose.Schema({
  type: String
  rate: Number
  constructing: String
  location: [Number]
})

World = mongoose.model('World',worldSchema)
Resource = mongoose.model('Resource',resourceSchema)
Building = mongoose.model('Building',buildingSchema)
Unit = mongoose.model('Unit',unitSchema)

factionSchema = mongoose.Schema({
  name: String
  users: Array
})

Faction = mongoose.model('Faction',factionSchema)


#------------------------------------------------------------

exports.init = () ->
  #TODO should retry if connection is lost or fails to connect
  mongoose.connect('mongodb://localhost/badMars')
  db = mongoose.connection
  db.on('error',console.error.bind(console,'mongo connection error: '))

  db.once('open', (callback) ->
    exports.Ready = true
  )

exports.saveWorld = (world) ->
  worldDoc = new World(world)
  worldDoc.save( (err,badMars) ->
    console.error(err) if (err)
  )

exports.removeWorld = (name) ->

  World.remove({ name: name},(err,world) ->
    if (err)
      return console.error(err)
    console.log(name, " deleted")
  )

exports.getWorld = (name) ->

  World.find({ name: name},(err,world) ->
    if (err)
      return console.error(err)
    console.log(world)
  )

exports.listWorlds = (listFunc) ->
  worldNames = new Array()
  World.find((err,worlds) ->
    if (err)
      return console.error(err)
    for world in worlds
      worldNames.push(world.name)
    listFunc(worldNames)
  )
