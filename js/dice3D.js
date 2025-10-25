// Dice3D - نمایش تاس سه‌بعدی بدون فیزیک با استفاده از Three.js
// نویسنده: GapGPT (بازسازی شده برای پروژه تخته‌نرد)
class Dice3D {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas ${canvasId} not found`);

    // ایجاد Scene، Camera و Renderer
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.resize();
    this.camera.position.z = 4;

    // نور نرم طبیعی
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const directional = new THREE.DirectionalLight(0xffffff, 0.7);
    directional.position.set(5, 5, 5);
    this.scene.add(ambient);
    this.scene.add(directional);

    // ایجاد مکعب تاس با ۶ صورت از CanvasTexture
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const materials = [];
    for (let i = 1; i <= 6; i++) {
      const tex = this.createFaceTexture(i);
      materials.push(new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.4,
        metalness: 0.2
      }));
    }

    this.dice = new THREE.Mesh(geometry, materials);
    this.scene.add(this.dice);

    // متغیرهای حالت انیمیشن
    this.isRolling = false;
    this.targetRotation = new THREE.Euler(0, 0, 0);
    this.lastTime = 0;

    // اتصال متدها و شروع حلقه رندر
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);
    requestAnimationFrame(this.animate);
  }

  createFaceTexture(num) {
    // ایجاد texture با Canvas داخلی برای عدد هر وجه
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // پس‌زمینه سفید با نقطه تیره وسطی
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#dddddd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // عدد تاس
    ctx.fillStyle = '#222';
    ctx.font = 'bold 180px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), size / 2, size / 2);

    return new THREE.CanvasTexture(canvas);
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onWindowResize() {
    this.resize();
  }

  rollTo(value) {
    // مقدار هدف بر اساس عدد خاص با کمی تصادفی
    const faces = {
      1: [0, 0, 0],
      2: [Math.PI / 2, 0, 0],
      3: [0, Math.PI / 2, 0],
      4: [0, -Math.PI / 2, 0],
      5: [-Math.PI / 2, 0, 0],
      6: [Math.PI, 0, Math.PI]
    };
    const [x, y, z] = faces[value] || [0, 0, 0];
    this.targetRotation = new THREE.Euler(
      x + Math.random() * 0.5 - 0.25,
      y + Math.random() * 0.5 - 0.25,
      z + Math.random() * 0.5 - 0.25
    );
    this.startTime = performance.now();
    this.isRolling = true;
  }

  animate(time) {
    const delta = time - this.lastTime;
    this.lastTime = time;

    if (this.isRolling) {
      const elapsed = time - this.startTime;
      const duration = 1200; // مدت زمان انیمیشن (ms)
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic

      // چرخش تصادفی در طول انیمیشن
      this.dice.rotation.x += 0.2 * (1 - ease);
      this.dice.rotation.y += 0.3 * (1 - ease);
      this.dice.rotation.z += 0.15 * (1 - ease);

      // نزدیک شدن تدریجی به هدف
      if (t >= 1) {
        this.dice.rotation.copy(this.targetRotation);
        this.isRolling = false;
      }
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}

window.Dice3D = Dice3D;
