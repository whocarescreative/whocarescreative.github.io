import { Detector } from './lib/Detector.js';
import { THREE } from './lib/Three.js';
import {} from './lib/cannon.js';
import { TextureLoader } from './lib/CubeTexture.js';

const loader = new TextureLoader();
loader.setPath( 'assets/articles/city-serendipity/' );

const cubeTextures = [];
for (const texturePath of [
	'cube_face1.png', 'cube_face2.png',
	'cube_face3.png', 'cube_face4.png',
	'cube_face5.png', 'cube_face6.png'
]) {
    cubeTextures.push(
        new THREE.MeshBasicMaterial( { color: 0xffffff, map: loader.load(texturePath) } )
    );
}

var world;
var dt = 1 / 60;

const canvasHeight = 300;
const canvasWidth = window.innerWidth;

var camera, scene, renderer, gplane=false, clickMarker=false;
var geometry, material, mesh, markerMaterial, cubeMesh, constraintDown, pivot;

var jointBody, constrainedBody, mouseConstraint;

var N = 1;

var container, camera, scene, renderer, projector;

// To be synced
var meshes=[], bodies=[];

// Initialize Three.js
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

initCannon();
init();
animate();

function init() {

    projector = new THREE.Projector();

    container = document.getElementById('dice');

    // scene
    scene = new THREE.Scene();

    // camera
    camera = new THREE.PerspectiveCamera( 30, canvasWidth / canvasHeight, 0.5, 10000 );
    camera.position.set(10, 2, 0);
    camera.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2);
    scene.add(camera);

    // lights
    var light, materials;
    scene.add( new THREE.AmbientLight( 0x666666 ) );

    light = new THREE.DirectionalLight( 0xffffff, 1.75 );
    var d = 20;

    light.position.set( d, d, d );

    light.castShadow = true;
    //light.shadowCameraVisible = true;

    light.shadowMapWidth = 2048;
    light.shadowMapHeight = 2048;

    light.shadowCameraLeft = -d;
    light.shadowCameraRight = d;
    light.shadowCameraTop = d;
    light.shadowCameraBottom = -d;

    light.shadowCameraFar = 3*d;
    light.shadowCameraNear = d;
    light.shadowDarkness = 0.5;

    scene.add( light );

    // floor
    geometry = new THREE.PlaneGeometry( 100, 100, 1, 1 );
    material = new THREE.MeshLambertMaterial( { color: 0xffffff } );
    markerMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
    mesh = new THREE.Mesh( geometry, material );
    mesh.castShadow = true;
    mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0), -Math.PI / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // cubes
    var cubeGeo = new THREE.BoxGeometry( 1, 1, 1 );
    //var cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xffffff, envMap: textureCube } );
    for(var i=0; i<N; i++){
        cubeMesh = new THREE.Mesh(cubeGeo, new THREE.MeshFaceMaterial(cubeTextures));
        cubeMesh.castShadow = true;
        meshes.push(cubeMesh);
        scene.add(cubeMesh);
    }

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( canvasWidth, canvasHeight );
    renderer.setClearColor(0xffffff);

    container.appendChild( renderer.domElement );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMapEnabled = true;

    window.addEventListener( 'resize', onWindowResize, false );

    renderer.domElement.addEventListener("mousemove", onMouseMove, false );
    renderer.domElement.addEventListener("mousedown", onMouseDown, false );
    renderer.domElement.addEventListener("mouseup", onMouseUp, false );
}

function setClickMarker(x,y,z) {
    if(!clickMarker){
        var shape = new THREE.SphereGeometry(0.2, 8, 8);
        clickMarker = new THREE.Mesh(shape, markerMaterial);
        clickMarker.visible = false;
        scene.add(clickMarker);
    }
    //clickMarker.visible = true;
    clickMarker.position.set(x,y,z);
}

function removeClickMarker(){
    clickMarker.visible = false;
}

function onMouseMove(e){
    // Move and project on the plane
    if (gplane && mouseConstraint) {
        var pos = projectOntoPlane(e.offsetX,e.offsetY,gplane,camera);
        if(pos){
            setClickMarker(pos.x,pos.y,pos.z,scene);
            moveJointToPoint(pos.x,pos.y,pos.z);
        }
    }
}

function onMouseDown(e){
    console.log(e);
    // Find mesh from a ray
    var entity = findNearestIntersectingObject(e.offsetX,e.offsetY,camera,meshes);
    var pos = entity.point;
    if(pos && entity.object.geometry instanceof THREE.BoxGeometry){
        constraintDown = true;
        // Set marker on contact point
        setClickMarker(pos.x,pos.y,pos.z,scene);

        // Set the movement plane
        setScreenPerpCenter(pos,camera);

        var idx = meshes.indexOf(entity.object);
        if(idx !== -1){
            addMouseConstraint(pos.x,pos.y,pos.z,bodies[idx]);
        }
    }
}

// This function creates a virtual movement plane for the mouseJoint to move in
function setScreenPerpCenter(point, camera) {
    // If it does not exist, create a new one
    if(!gplane) {
        var planeGeo = new THREE.PlaneGeometry(100,100);
        var plane = gplane = new THREE.Mesh(planeGeo,material);
        plane.visible = false; // Hide it..
        scene.add(gplane);
    }

    // Center at mouse position
    gplane.position.copy(point);

    // Make it face toward the camera
    gplane.quaternion.copy(camera.quaternion);
}

function onMouseUp(e) {
    constraintDown = false;
    // remove the marker
    removeClickMarker();

    // Send the remove mouse joint to server
    removeJointConstraint();
}

var lastx,lasty,last;
function projectOntoPlane(screenX,screenY,thePlane,camera) {
    var x = screenX;
    var y = screenY;
    var now = new Date().getTime();
    // project mouse to that plane
    var hit = findNearestIntersectingObject(screenX,screenY,camera,[thePlane]);
    lastx = x;
    lasty = y;
    last = now;
    if(hit)
        return hit.point;
    return false;
}
function findNearestIntersectingObject(clientX,clientY,camera,objects) {
    // Get the picking ray from the point
    var raycaster = getRayCasterFromScreenCoord(clientX, clientY, camera, projector);

    // Find the closest intersecting object
    // Now, cast the ray all render objects in the scene to see if they collide. Take the closest one.
    var hits = raycaster.intersectObjects(objects);
    var closest = false;
    if (hits.length > 0) {
        closest = hits[0];
    }

    return closest;
}

// Function that returns a raycaster to use to find intersecting objects
// in a scene given screen pos and a camera, and a projector
function getRayCasterFromScreenCoord (screenX, screenY, camera, projector) {
    var mouse3D = new THREE.Vector3();
    // Get 3D point form the client x y
    mouse3D.x = (screenX / canvasWidth) * 2 - 1;
    mouse3D.y = -(screenY / canvasHeight) * 2 + 1;
    mouse3D.z = 0.5;
    return projector.pickingRay(mouse3D, camera);
}

function onWindowResize() {
    camera.aspect = canvasWidth / canvasHeight;
    camera.updateProjectionMatrix();
    //controls.handleResize();
    renderer.setSize( canvasWidth, canvasHeight );
}

function animate() {
    requestAnimationFrame( animate );
    //controls.update();
    updatePhysics();
    render();
}

function updatePhysics(){
    world.step(dt);
    for(var i=0; i !== meshes.length; i++){
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }
}

function render() {
    renderer.render(scene, camera);
}

function initCannon(){
    // Setup our world
    world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;

    world.gravity.set(0,-10,0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Create boxes
    var mass = 5, radius = 1.3;
    const boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
    for(var i=0; i<N; i++){
        const boxBody = new CANNON.Body({ mass: mass });
        boxBody.addShape(boxShape);
        boxBody.position.set(0,5,0);
        world.add(boxBody);
        bodies.push(boxBody);
    }

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.add(groundBody);

    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    //groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),-Math.PI/2);
    groundBody.position = new CANNON.Vec3(0,0,-5);
    world.add(groundBody);

    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),Math.PI);
    groundBody.position = new CANNON.Vec3(0,0,5);
    world.add(groundBody);

    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),Math.PI * 3/2);
    groundBody.position = new CANNON.Vec3(6,0,0);
    world.add(groundBody);


    // Joint body
    var shape = new CANNON.Sphere(0.1);
    jointBody = new CANNON.Body({ mass: 0 });
    jointBody.addShape(shape);
    jointBody.collisionFilterGroup = 0;
    jointBody.collisionFilterMask = 0;
    world.add(jointBody)
}

function addMouseConstraint(x,y,z,body) {
    // The cannon body constrained by the mouse joint
    constrainedBody = body;

    // Vector to the clicked point, relative to the body
    var v1 = new CANNON.Vec3(x,y,z).vsub(constrainedBody.position);

    // Apply anti-quaternion to vector to tranform it into the local body coordinate system
    var antiRot = constrainedBody.quaternion.inverse();
    pivot = antiRot.vmult(v1); // pivot is not in local body coordinates

    // Move the cannon click marker particle to the click position
    jointBody.position.set(x,y,z);

    // Create a new constraint
    // The pivot for the jointBody is zero
    mouseConstraint = new CANNON.PointToPointConstraint(constrainedBody, pivot, jointBody, new CANNON.Vec3(0,0,0));

    // Add the constriant to world
    world.addConstraint(mouseConstraint);
}

// This functions moves the transparent joint body to a new postion in space
function moveJointToPoint(x,y,z) {
    // Move the joint body to a new position
    jointBody.position.set(x,y,z);
    mouseConstraint.update();
}

function removeJointConstraint(){
    // Remove constriant from world
    world.removeConstraint(mouseConstraint);
    mouseConstraint = false;
}
