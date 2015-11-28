#monofuel
#11-2015

#Goals:
#modular system of generators that can be tweaked, mixed and scaled
#ability to see updates on the fly
#use datgui for watching changes
#heightmap import/export

#---------------------------------------------------------------------
#globals
display = null
map = null
datgui = null
delta = 0
clock = null

keysDown = []


cameraSpeed = 10
#---------------------------------------------------------------------
#html5
window.onresize = () ->
  if (display)
    display.resize()

window.onload = () ->
  display = new Display()
  map = new Map()
  map.addToRender()
  datgui = new Datgui()

  clock = new THREE.Clock()

  requestAnimationFrame(logicLoop)

  getWorldList()

  document.body.onkeydown = (key) ->
    if (keysDown.indexOf(key.keyCode) == -1 && key.keyCode != 18) #ignore alt, because alt-tab is buggy
      keysDown.push(key.keyCode)
      console.log('key pressed: ' + key.keyCode)

  document.body.onkeyup = (key) ->
    index = keysDown.indexOf(key.keyCode)
    if (index != -1)
      keysDown.splice(index,1)
      #console.log('key released: ' + key.keyCode)

selectWorld = (world) ->
  console.log('selecting world ' + world)

  xhttp = new XMLHttpRequest()
  xhttp.open("GET", "/worlds?name=" + world, true)

  xhttp.onreadystatechange = () ->
    if (xhttp.readyState == 4 && xhttp.status == 200)
      console.log('recieved world: ' + world )
      response = JSON.parse(xhttp.responseText)
      settings = {
        name: response.name
        size: response.vertex_grid.length,
        water: true,
        waterHeight: response.water,
      }
      map.removeFromRender()
      map = new Map(response.vertex_grid,settings)
      map.addToRender()


  xhttp.send()

getWorldList = () ->
  #https://japura.net/badmars/worlds
  xhttp = new XMLHttpRequest()
  xhttp.open("GET", "/worlds", true)

  xhttp.onreadystatechange = () ->
    if (xhttp.readyState == 4 && xhttp.status == 200)
      response = JSON.parse(xhttp.responseText)
      menu = document.getElementById("worldMenu")
      menu.innerHTML = ""
      for world in response.worlds
        menu.innerHTML += '<li><a onclick="selectWorld(\'' + world + '\')" >' + world + '</a></li>'

  xhttp.send()


logicLoop = () ->
  requestAnimationFrame(logicLoop)

  delta = clock.getDelta()
  if (keysDown.length > 0)
    handleInput()
  #map.rotate(Math.PI * delta / 15)

  display.render()

handleInput = () ->
  for key in keysDown
    switch (key)
      when 87 #w
        display.camera.translateZ(Math.cos(display.camera.rotation.x + Math.PI) * cameraSpeed * delta)
        display.camera.translateY(Math.sin(display.camera.rotation.x + Math.PI) * cameraSpeed * delta)
      when 65 #a
        display.camera.translateX(Math.cos(display.camera.rotation.x + Math.PI) * cameraSpeed * delta)
      when 83 #s
        display.camera.translateZ(Math.cos(display.camera.rotation.x) * cameraSpeed * delta)
        display.camera.translateY(Math.sin(display.camera.rotation.x) * cameraSpeed * delta)
      when 68 #d
        display.camera.translateX(Math.cos(display.camera.rotation.x) * cameraSpeed * delta)
      when 82 #r
        display.camera.position.y += cameraSpeed * delta
      when 70 #f
        display.camera.position.y -= cameraSpeed * delta
      when 81 #q
        display.camera.rotation.y += cameraSpeed * delta / 10
      when 69 #e
        display.camera.rotation.y -= cameraSpeed * delta / 10

#---------------------------------------------------------------------
#datgui
class Datgui
  constructor: () ->
    @gui = new dat.GUI({
      height: 5 * 32 - 1
    })

    @gui.add(map.settings, 'waterHeight')
    .min(0)
    .max(10)
    .onFinishChange( () ->
      console.log('water is now at ' + map.settings.waterHeight)
      updateMap()
      )

    @gui.add(map.settings, 'water')
    .onFinishChange( () ->
      if (map.settings.water)
        console.log('water is now on')
      else
        console.log('water is now off')
      updateMap()
      )


    @gui.add(map.settings, 'size')
    .min(32)
    .max(1024)
    .step(16)
    .onFinishChange( () ->
      console.log('map resized to ' + map.settings.size)
      updateMap()
      )

    @gui.add(map.settings, 'cliffDelta')
    .min(0)
    .max(5)
    .onFinishChange(updateMap)

    @gui.add(map.settings, 'bigNoise')
    .min(0)
    .max(1)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'bigNoiseScale')
    .min(0)
    .max(2)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'medNoise')
    .min(0)
    .max(1)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'medNoiseScale')
    .min(0)
    .max(.75)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'smallNoise')
    .min(0)
    .max(1)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'smallNoiseScale')
    .min(0)
    .max(.5)
    .onFinishChange(updateMap)

updateMap = () ->
  map.removeFromRender()
  map.generate()
  map.addToRender()
#---------------------------------------------------------------------
#Noise
#spherical perlin noise from http://ronvalstar.nl/creating-tileable-noise-maps/
class Noise
  constructor: (@iSize,@fNoiseScale) ->
    if (!@iSize || @iSize < 1)
      @iSize = 31
    @fRds = @iSize
    @fRdsSin = .5*@iSize/(2*Math.PI)
    if (!@fNoiseScale || @fNoiseScale < 0)
      @fNoiseScale = .3;
  get: (x,y) ->
    fNX = (x+.5)/@iSize
    fNY = (y+.5)/@iSize
    fRdx = fNX*2*Math.PI
    fRdy = fNY*Math.PI
    fYSin = Math.sin(fRdy+Math.PI)
    a = @fRdsSin*Math.sin(fRdx)*fYSin
    b = @fRdsSin*Math.cos(fRdx)*fYSin
    c = @fRdsSin*Math.cos(fRdy)
    v = Simplex.noise(
       123+a*@fNoiseScale
      ,132+b*@fNoiseScale
      ,312+c*@fNoiseScale
    )
    return v * 5

#---------------------------------------------------------------------
#Map

class Map
  constructor: (@grid,@settings) ->
    #TODO should check for missing settings individually
    if (!@settings)
      @settings = @defaultSettings
    if (!@grid)
      @generateWorld()
    @generateMesh()

  generate: () ->
    @generateWorld()
    @generateMesh()

  generateWorld: () ->
    @bigNoiseGenerator = new Noise(@settings.size - 1,@settings.bigNoise)
    @medNoiseGenerator = new Noise(@settings.size - 1,@settings.medNoise)
    @smallNoiseGenerator = new Noise(@settings.size - 1,@settings.smallNoise)

    @grid = []
    for x in [0..@settings.size-1]
      @grid[x] = []
      for y in [0..@settings.size-1]
        point = @bigNoiseGenerator.get(x,y) * @settings.bigNoiseScale
        point += @medNoiseGenerator.get(x,y) * @settings.medNoiseScale
        point += @smallNoiseGenerator.get(x,y) * @settings.smallNoiseScale
        @grid[x][y] = point


    console.log("Generated World Heightmap")

  generateMesh: () ->

    @gridGeom = new THREE.Geometry()
    @waterGeom = new THREE.Geometry()

    @landMaterial = new THREE.MeshLambertMaterial( { wireframe: false, color: 0x00FF00})
    @cliffMaterial = new THREE.MeshLambertMaterial( { wireframe: false, color: 0xA52A2A})
    @waterMaterial = new THREE.MeshLambertMaterial( { wireframe: false, color: 0x0000FF})

    for y in [0..@settings.size-1]
      for x in [0..@settings.size-1]
        @gridGeom.vertices.push(new THREE.Vector3(x,y,@grid[y][x]))
        @waterGeom.vertices.push(new THREE.Vector3(x,y,@settings.waterHeight))

    for y in [0..@settings.size-2]
      for x in [0..@settings.size-2]
        landFace1 = new THREE.Face3(
            y*@settings.size + x,
            y*@settings.size + x + 1,
            (y+1)*@settings.size + x)
        landFace1.materialIndex = 0;
        landFace2 = new THREE.Face3(
            y*@settings.size + x + 1,
            (y+1)*@settings.size + x + 1,
            (y+1)*@settings.size + x)

        if (@isTilePassable(@grid[y][x],@grid[y+1][x],@grid[y][x+1],@grid[y+1][x+1]))
          landFace1.materialIndex = 0;
          landFace2.materialIndex = 0;
        else
          landFace1.materialIndex = 1;
          landFace2.materialIndex = 1;

        @gridGeom.faces.push(landFace1)
        @gridGeom.faces.push(landFace2)

        @waterGeom.faces.push(new THREE.Face3(
            y*@settings.size + x,
            y*@settings.size + x + 1,
            (y+1)*@settings.size + x))
        @waterGeom.faces.push(new THREE.Face3(
            y*@settings.size + x + 1,
            (y+1)*@settings.size + x + 1,
            (y+1)*@settings.size + x))

    @gridGeom.computeBoundingSphere()
    @gridGeom.computeFaceNormals()
    @gridGeom.computeVertexNormals()
    @waterGeom.computeBoundingSphere()
    @waterGeom.computeFaceNormals()
    @waterGeom.computeVertexNormals()

    planetMaterials = new THREE.MeshFaceMaterial([@landMaterial,@cliffMaterial])

    @gridMesh = new THREE.Mesh(@gridGeom,planetMaterials)
    @waterMesh = new THREE.Mesh(@waterGeom,@waterMaterial)

    @gridMesh.rotation.x = - Math.PI / 2
    @waterMesh.rotation.x = - Math.PI / 2

    centerMatrix =new THREE.Matrix4().makeTranslation( -@settings.size/2, -@settings.size/2, 0 )
    @gridMesh.geometry.applyMatrix(centerMatrix)
    @waterMesh.geometry.applyMatrix(centerMatrix)

    console.log("Generated Geometry")

  defaultSettings: {
    size: 64,
    water: true,
    waterHeight: 3.3,
    bigNoise: .11,
    medNoise: .24,
    smallNoise: .53,
    bigNoiseScale: 1.0,
    medNoiseScale: 0.25,
    smallNoiseScale: 0.25,
    cliffDelta: 0.3
  }

  #3D stuff

  rotate: (angle) ->
    axis = new THREE.Vector3(0,0,1)
    @gridMesh.rotateOnAxis(axis, angle)
    @waterMesh.rotateOnAxis(axis, angle)

  removeFromRender: () ->
    display.removeMesh(@gridMesh)
    if (@waterMesh)
      display.removeMesh(@waterMesh)

  addToRender: () ->
    display.addMesh(@gridMesh)
    if (@settings.water)
      display.addMesh(@waterMesh)
    #display.lookAt(@gridMesh)
    console.log('added map to scene')

  isTilePassable: (corner1,corner2,corner3,corner4) ->

    avg = (corner1 + corner2 + corner3 + corner4) / 4

    #i'm sure this could be replaced by a much more clever one-liner
    #but this is reasonably readable.
    if (Math.abs(corner1 - avg) > @settings.cliffDelta)
      return false;
    if (Math.abs(corner2 - avg) > @settings.cliffDelta)
      return false;
    if (Math.abs(corner3 - avg) > @settings.cliffDelta)
      return false;
    if (Math.abs(corner4 - avg) > @settings.cliffDelta)
      return false;

    return true;


#---------------------------------------------------------------------
#Display
class Display
  constructor: () ->
    @scene = new THREE.Scene()
    @camera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000)
    #@camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, - 500, 1000 );
    panel = document.getElementById('threePanel')
    @renderer = new THREE.WebGLRenderer({antialias: true, canvas: panel})
    @renderer.setSize(window.innerWidth, window.innerHeight)
    #document.body.appendChild(@renderer.domElement)

    light = new THREE.AmbientLight(0x101010)
    @scene.add(light)

    directionalLight = new THREE.DirectionalLight(0xffffff,0.5)
    directionalLight.position.set(0,.5,0)
    @scene.add(directionalLight)

    @camera.position.set(0,20,30)
    @camera.up = new THREE.Vector3(0,0,1)
    @camera.rotation.set(-0.6,0,0)
    @camera.rotation.order = 'YXZ';

    @camera.updateProjectionMatrix()
    console.log('threejs ready')


  resize: () ->
    @renderer.setSize(window.innerWidth, window.innerHeight)

  render: () ->
    @renderer.render(@scene,@camera)

  lookAt: (mesh) ->
    @camera.up = new THREE.Vector3(0,0,-1)
    @camera.lookAt(mesh.position)
    @camera.updateProjectionMatrix()

  addMesh: (mesh) ->
    @scene.add(mesh)
  removeMesh: (mesh) ->
    @scene.remove(mesh)
