document.addEventListener('DOMContentLoaded', function () {
  particlesJS.load('particles-js', '/assets/js/particles.json');

  const container = document.getElementById('model-container');
  if (container && window.THREE && window.THREE.OBJLoader) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambient);

    const loader = new THREE.OBJLoader();
    loader.load('https://robbierao.com/model2.obj', function (object) {
      object.traverse(function (child) {
        if (child.isMesh) {
          const geometry = child.geometry;
          geometry.center();
          const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.005 });
          const points = new THREE.Points(geometry, material);
          scene.add(points);
        }
      });
      animate();
    });

    camera.position.z = 2.5;

    function animate() {
      requestAnimationFrame(animate);
      scene.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
  }
});
