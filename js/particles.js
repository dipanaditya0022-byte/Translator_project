/* ============================================
   PARTICLES.JS - Neural Network Background
   ============================================ */

class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 120 };
    this.animationId = null;

    // Config
    this.config = {
      count: 80,
      color: "0, 245, 255",
      secondaryColor: "0, 128, 255",
      maxDistance: 130,
      speed: 0.35,
      size: { min: 1, max: 2.5 },
    };

    this.init();
    this.bindEvents();
  }

  init() {
    this.resize();
    this.createParticles();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.config.speed * 2,
        vy: (Math.random() - 0.5) * this.config.speed * 2,
        size: Math.random() * (this.config.size.max - this.config.size.min) + this.config.size.min,
        opacity: Math.random() * 0.5 + 0.15,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        color: Math.random() > 0.7 ? this.config.secondaryColor : this.config.color,
      });
    }
  }

  drawParticle(p) {
    p.pulse += p.pulseSpeed;
    const pulseFactor = 0.7 + 0.3 * Math.sin(p.pulse);
    const currentOpacity = p.opacity * pulseFactor;
    const currentSize = p.size * pulseFactor;

    // Glow effect
    const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 3);
    gradient.addColorStop(0, `rgba(${p.color}, ${currentOpacity})`);
    gradient.addColorStop(0.5, `rgba(${p.color}, ${currentOpacity * 0.3})`);
    gradient.addColorStop(1, `rgba(${p.color}, 0)`);

    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, currentSize * 3, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Core dot
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(${p.color}, ${Math.min(1, currentOpacity * 1.5)})`;
    this.ctx.fill();
  }

  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.config.maxDistance) {
          const opacity = (1 - dist / this.config.maxDistance) * 0.15;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(0, 245, 255, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }

      // Mouse connections
      if (this.mouse.x !== null) {
        const dx = this.particles[i].x - this.mouse.x;
        const dy = this.particles[i].y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.mouse.radius) {
          const opacity = (1 - dist / this.mouse.radius) * 0.4;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.strokeStyle = `rgba(0, 245, 255, ${opacity})`;
          this.ctx.lineWidth = 0.8;
          this.ctx.stroke();
        }
      }
    }
  }

  updateParticles() {
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      // Boundary bounce
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      // Mouse repulsion
      if (this.mouse.x !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          const force = (80 - dist) / 80;
          p.vx += (dx / dist) * force * 0.04;
          p.vy += (dy / dist) * force * 0.04;
        }
      }

      // Speed cap
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > this.config.speed * 3) {
        p.vx = (p.vx / speed) * this.config.speed * 3;
        p.vy = (p.vy / speed) * this.config.speed * 3;
      }
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawConnections();
    this.particles.forEach((p) => this.drawParticle(p));
    this.updateParticles();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.resize();
      this.createParticles();
    });

    document.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    document.addEventListener("mouseleave", () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (typeof AZURE_CONFIG !== "undefined" && AZURE_CONFIG.dashboard.particlesEnabled) {
    window.particleSystem = new ParticleSystem("particleCanvas");
  }
});
