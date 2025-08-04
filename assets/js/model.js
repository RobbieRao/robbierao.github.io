// Load 3D head model and render as rotating particle system

function initHeadModel() {
  const container = document.getElementById('model-container');
  if (!container || !window.THREE) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(2, 2, 2);
  scene.add(light);

  const loader = new THREE.OBJLoader();
  loader.load('https://robbierao.com/model2.obj', function (obj) {
    obj.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        const geo = child.geometry;
        const material = new THREE.PointsMaterial({
          color: 0x00fffc,
          size: 0.02
        });
        const points = new THREE.Points(geo, material);
        scene.add(points);
      }
    });
    animate();
  });

  function animate() {
    requestAnimationFrame(animate);
    scene.rotation.y += 0.005;
    renderer.render(scene, camera);
  }
}

document.addEventListener('DOMContentLoaded', initHeadModel);
