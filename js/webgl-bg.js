// webgl-bg.js - neon lines background
(function initTechBackground() {
    const canvas = document.createElement('canvas');
    canvas.id = 'webgl-bg-canvas';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });

    const particles = [];
    // Adjust density based on screen size so it's not too crowded or empty
    const particleCount = Math.floor((width * height) / 12000); 
    const connectionDistance = 140;
    const mouse = { x: -1000, y: -1000, radius: 180 };

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8
        });
    }

    document.body.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    document.body.addEventListener('mouseleave', () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    function draw() {
        // Dark background base layer
        ctx.fillStyle = '#0a0c10';
        ctx.fillRect(0, 0, width, height);

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];

            p.x += p.vx;
            p.y += p.vy;

            // Soft bounce off edges
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            // Connect particles to each other
            for (let j = i + 1; j < particles.length; j++) {
                let p2 = particles[j];
                let dx = p.x - p2.x;
                let dy = p.y - p2.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < connectionDistance) {
                    let opacity = 1 - (distance / connectionDistance);
                    
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    
                    // Neon cyan lines
                    ctx.strokeStyle = `rgba(0, 229, 192, ${opacity * 0.4})`;
                    ctx.lineWidth = 1.2;
                    
                    ctx.stroke();
                }
            }
            
            // Connect particles to mouse with intense neon glow
            let mdx = p.x - mouse.x;
            let mdy = p.y - mouse.y;
            let mDistance = Math.sqrt(mdx * mdx + mdy * mdy);
            
            if (mDistance < mouse.radius) {
                let mOpacity = 1 - (mDistance / mouse.radius);
                
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                
                ctx.strokeStyle = `rgba(0, 229, 192, ${mOpacity * 0.8})`;
                ctx.lineWidth = 1.5;
                
                // Add glow specifically around the mouse interactions for that techy feel
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#00e5c0';
                
                ctx.stroke();
                
                // Reset shadow blur
                ctx.shadowBlur = 0;
            }
        }

        requestAnimationFrame(draw);
    }

    draw();
})();
