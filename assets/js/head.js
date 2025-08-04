// Load a point-cloud head model with particle scatter effect
var scene, camera, renderer, points;
var originalPositions = [], velocities = [];

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 120;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  var container = document.getElementById('head-container');
  if (container) {
    container.appendChild(renderer.domElement);
  }

  var loader = new THREE.OBJLoader();
  loader.load('/files/model.obj', function(object) {
    var geometry = new THREE.BufferGeometry();
    var vertices = [];

    object.traverse(function(child) {
      if (child.isMesh) {
        child.geometry = child.geometry.toNonIndexed();
        var position = child.geometry.attributes.position;
        for (var i = 0; i < position.count; i++) {
          vertices.push(position.getX(i), position.getY(i), position.getZ(i));
        }
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    var material = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.5 });
    points = new THREE.Points(geometry, material);
    scene.add(points);

    var positions = geometry.attributes.position.array;
    for (var i = 0; i < positions.length; i += 3) {
      originalPositions.push(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
      velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2));
    }
  });

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  if (points) {
    var positions = points.geometry.attributes.position.array;
    for (var i = 0; i < originalPositions.length; i++) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;

      velocities[i].x += (originalPositions[i].x - positions[i * 3]) * 0.002;
      velocities[i].y += (originalPositions[i].y - positions[i * 3 + 1]) * 0.002;
      velocities[i].z += (originalPositions[i].z - positions[i * 3 + 2]) * 0.002;
    }
    points.geometry.attributes.position.needsUpdate = true;
    points.rotation.y += 0.002;
  }
  renderer.render(scene, camera);
}
