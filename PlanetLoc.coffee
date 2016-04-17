#monofuel
'use strict';
TileType = require('./tileType.js')

#---------------------------------------------------------------------
#Representation of a point on a planet
#TODO this stuff could be unit tested

class PlanetLoc

  # @param [Map] planet the planet for this location
  # @param [Number] x the x coordinate
  # @param [Number] y the y coordinate
  constructor: (@planet, @x, @y) ->
    if ( !@planet || !@planet.grid)
      console.log(@toString())
      console.log('invalid call to PlanetLoc')
      console.log(new Error().stack)

    @x = Math.round(@x)
    @y = Math.round(@y)
    #console.log("x: " + @x + ", y: " + @y)

    if (@x < 0)
      @x = (@planet.worldSettings.size + @x - 1) % (@planet.worldSettings.size - 1)
    #@TODO something is funny with the size thing unlike on the planet viewer, should investigate
    if (@x >= @planet.worldSettings.size - 1)
      @x = @x % (@planet.worldSettings.size - 2)
    if (@y < 0)
      @y = (@planet.worldSettings.size + @y - 1) % (@planet.worldSettings.size - 1)
    if (@y >= @planet.worldSettings.size - 1)
      @y = @y % (@planet.worldSettings.size - 2)
    if (@x >= @planet.grid[0].length - 1 || @x < 0)
      console.log("invalid tile: ", @x, @y)
      console.log(new Error().stack)
    if (@y >= @planet.grid.length - 1 || @y < 0)
      console.log("invalid tile: ", @x, @y)
      console.log(new Error().stack)

    corners = [
      @planet.grid[@y][@x],
      @planet.grid[@y+1][@x],
      @planet.grid[@y][@x+1],
      @planet.grid[@y+1][@x+1]
    ]

    @avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4
    if (@avg < @planet.worldSettings.waterHeight)
      @avg = @planet.worldSettings.waterHeight

    @type = @planet.navGrid[@x][@y]

    @real_x = @x + 0.5
    @real_y = - (@y + 0.5)

  #@return [String] readable string for this tile
  toString: () ->
    return "x: " + @x +
           ", y: " + @y +
           ", planet: " + @planet.name +
           ", type: " + TileType.getTypeName(@type)

  #@return [PlanetLoc] tile to the west
  W: () ->
    return new PlanetLoc(@planet, @x - 1, @y)
  #@return [PlanetLoc] tile to the east
  E: () ->
    return new PlanetLoc(@planet, @x + 1, @y)
  #@return [PlanetLoc] tile to the south
  S: () ->
    return new PlanetLoc(@planet, @x, @y - 1)
  #@return [PlanetLoc] tile to the north
  N: () ->
    return new PlanetLoc(@planet, @x, @y + 1)

  distance: (tile) ->
    #TODO doesn't consider map loop
    deltaX = Math.abs(@x - tile.x);
    deltaY = Math.abs(@y - tile.y);

    return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY))

  #Used to compare PlanetLoc by value
  #@param [PlanetLoc] tile to compare to
  #@return [Boolean] equality
  equals: (otherLoc) ->
    if (!otherLoc)
      return false;
    return ( otherLoc.x == @x &&
             otherLoc.y == @y &&
             otherLoc.planet == @planet )

module.exports = PlanetLoc
