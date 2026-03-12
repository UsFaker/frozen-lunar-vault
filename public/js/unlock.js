// Theme Management
let currentTheme = localStorage.getItem('theme') || 'cosmic';
const themeCss = document.getElementById('theme-css');

function switchTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    
    document.querySelectorAll('.theme-container').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    
    document.getElementById(`${theme}-container`).classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => {
        document.getElementById(`${theme}-container`).classList.add('active');
    }, 50);

    initTheme();
}

// Unlock Logic
const CORRECT_SEQUENCE = [0, 1, 2, 3, 4]; // The secret pattern
let inputSequence = [];

function handleTargetClick(id, element) {
    element.classList.add('clicked-correct');
    inputSequence.push(id);

    // Provide haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(50);

    if (inputSequence.length === CORRECT_SEQUENCE.length) {
        verifySequence();
    }
}

function verifySequence() {
    const isCorrect = inputSequence.every((val, index) => val === CORRECT_SEQUENCE[index]);
    
    if (isCorrect) {
        // Correct pattern!
        const patternString = inputSequence.join(',');
        const hash = CryptoJS.SHA256(patternString).toString();
        
        // Trigger success animation
        document.getElementById('transition-overlay').classList.add('active');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        // Send to backend
        fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unlockHash: hash })
        })
        .then(res => res.json())
        .then(data => {
            if (data.token) {
                sessionStorage.setItem('vault_token', data.token);
                // We'll also store the key derived from pattern for encryption later
                sessionStorage.setItem('vault_key', hash); // Using hash as a simple key for demo
                setTimeout(() => {
                    window.location.href = '/app.html';
                }, 1500);
            } else {
                resetSequence(true);
            }
        })
        .catch(() => resetSequence(true));

    } else {
        // Wrong pattern
        resetSequence(false);
    }
}

function resetSequence(isError) {
    if (navigator.vibrate) navigator.vibrate(200);
    const targets = document.querySelectorAll('.cosmic-target, .cyber-target');
    targets.forEach(t => {
        if (inputSequence.includes(parseInt(t.dataset.id))) {
            t.classList.remove('clicked-correct');
            if (isError) t.classList.add('clicked-wrong');
        }
    });
    setTimeout(() => {
        targets.forEach(t => t.classList.remove('clicked-wrong'));
    }, 500);
    inputSequence = [];
}


// Cosmic Theme Setup
function initCosmic() {
    const layer = document.getElementById('cosmic-targets-layer');
    layer.innerHTML = '';
    // Add a helper button for the user to see the pattern during testing
    const hintBtn = document.createElement('button');
    hintBtn.innerText = '💡 显示解锁提示';
    hintBtn.style.position = 'absolute';
    hintBtn.style.top = '20px';
    hintBtn.style.right = '20px';
    hintBtn.style.zIndex = '1000';
    hintBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    hintBtn.style.color = 'white';
    hintBtn.style.border = '1px solid rgba(255,255,255,0.3)';
    hintBtn.style.padding = '8px 16px';
    hintBtn.style.borderRadius = '20px';
    hintBtn.style.cursor = 'pointer';
    hintBtn.onclick = () => {
        const targets = document.querySelectorAll('.cosmic-target');
        targets.forEach(t => {
            const id = parseInt(t.dataset.id);
            if(id < 5) {
                // Temporarily show the order number next to the star
                let label = t.querySelector('.hint-label');
                if(!label) {
                    label = document.createElement('div');
                    label.className = 'hint-label';
                    label.style.position = 'absolute';
                    label.style.top = '-20px';
                    label.style.color = '#0f0';
                    label.style.fontWeight = 'bold';
                    label.style.fontSize = '1.2rem';
                    label.innerText = (id + 1).toString(); // 1 to 5 instead of 0 to 4
                    t.appendChild(label);
                    t.classList.add('clicked-correct'); // make it glow
                }
                setTimeout(() => {
                    if (label) label.remove();
                    t.classList.remove('clicked-correct');
                }, 5000);
            }
        });
    };
    layer.appendChild(hintBtn);

    // Generate 15 stars. First 5 are the sequence 0-4, rest are decoys 5-14
    for(let i=0; i<15; i++) {
        const star = document.createElement('div');
        star.className = 'cosmic-target';
        star.dataset.id = i;
        
        // Distribute randomly but keep them within click reach
        const x = 10 + Math.random() * 80;
        const y = 10 + Math.random() * 80;
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        
        // Optional hint: First 5 are slightly larger? No, user wants it unnoticeable.
        // Let's just log the positions of 0-4 for you in console
        if(i < 5) console.log(`Star ${i} is at ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
        
        star.onclick = () => {
            if(!inputSequence.includes(i)) handleTargetClick(i, star);
        };
        layer.appendChild(star);
    }

    // Canvas stars (Enhanced Cosmic Version)
    const canvas = document.getElementById('cosmic-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];
    const colors = ['#ffffff', '#ffe9c4', '#d4fbff', '#a3d8ff']; // white, pale yellow, pale cyan, light blue

    for(let i=0; i<350; i++) {
        // Parallax depth: 0 is distant, 1 is close
        const depth = Math.random(); 
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: (Math.random() * 1.2 + 0.3) * (depth + 0.5), // closer stars are bigger
            speed: (Math.random() * 0.15 + 0.05) * (depth + 0.2), // closer stars move faster
            color: colors[Math.floor(Math.random() * colors.length)],
            twinkleSpeed: Math.random() * 0.02 + 0.005,
            twinklePhase: Math.random() * Math.PI * 2
        });
    }

    // Shooting stars
    const shootingStars = [];
    function spawnShootingStar() {
        if (Math.random() < 0.02 && shootingStars.length < 2) { // 2% chance per frame
            shootingStars.push({
                x: Math.random() * canvas.width * 1.2, 
                y: Math.random() * canvas.height * 0.3 - 100, // Start high
                length: Math.random() * 100 + 40,
                speedX: -(Math.random() * 12 + 8), // Fast diagonal left
                speedY: Math.random() * 6 + 3,
                opacity: 1
            });
        }
    }

    function animateCosmic() {
        if (currentTheme !== 'cosmic') return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const time = Date.now() * 0.001;

        // --- 1. Draw Normal Stars (Background) ---
        stars.forEach(s => {
            s.twinklePhase += s.twinkleSpeed;
            const opacity = 0.2 + Math.abs(Math.sin(s.twinklePhase)) * 0.8; 

            ctx.globalAlpha = opacity;
            ctx.fillStyle = s.color;
            ctx.shadowBlur = s.size * 3;
            ctx.shadowColor = s.color;

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();

            // Disable shadow
            ctx.shadowBlur = 0;

            // Constantly drifting slowly
            s.y -= s.speed;
            s.x -= s.speed * 0.3;
            
            // Interaction with the Black Hole gravity (if close enough)
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = centerX - s.x;
            const dy = centerY - s.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 300) {
                // Gently curve inwards
                s.x += (dx / dist) * s.speed * (300/dist) * 0.5;
                s.y += (dy / dist) * s.speed * (300/dist) * 0.5;
            }

            if(s.y < 0) s.y = canvas.height;
            if(s.x < 0) s.x = canvas.width;
        });

        // --- 2. Draw majestic Black Hole / Nebula in the center ---
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        
        ctx.save();
        ctx.translate(cx, cy);
        
        // Accretion disk (spinning)
        ctx.rotate(time * 0.1); // Slow rotation
        ctx.globalAlpha = 0.8;
        
        // Outer glowing gas ring
        const outerGrad = ctx.createRadialGradient(0, 0, 100, 0, 0, 350);
        outerGrad.addColorStop(0, 'rgba(255, 150, 50, 0.4)');
        outerGrad.addColorStop(0.3, 'rgba(150, 50, 255, 0.2)');
        outerGrad.addColorStop(0.6, 'rgba(50, 100, 255, 0.1)');
        outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        // Squish the circle into an ellipse to look like a disk
        ctx.ellipse(0, 0, 350, 180, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner hot accretion disk
        ctx.rotate(-time * 0.2); // Counter rotation for chaos
        const innerGrad = ctx.createRadialGradient(0, 0, 50, 0, 0, 150);
        innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        innerGrad.addColorStop(0.2, 'rgba(255, 200, 100, 0.8)');
        innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 150, 60, time * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // The Event Horizon (The Black Hole itself)
        ctx.fillStyle = '#000000';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 100, 0, 0.5)'; // Einstein ring glow
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        // --- 3. Draw Shooting Stars ---
        spawnShootingStar();
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const ss = shootingStars[i];
            
            const gradient = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.length * (ss.speedX/Math.abs(ss.speedX)), ss.y - ss.length * (ss.speedY/Math.abs(ss.speedY)));
            gradient.addColorStop(0, `rgba(255, 255, 255, ${ss.opacity})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.globalAlpha = 1;
            ctx.strokeStyle = gradient;
            ctx.lineWidth = Math.max(1, ss.opacity * 2);
            ctx.lineCap = 'round';
            ctx.shadowBlur = 0; // Prevent huge shadow box
            
            ctx.beginPath();
            ctx.moveTo(ss.x, ss.y);
            const tailX = ss.x - ss.speedX * (ss.length / 10);
            const tailY = ss.y - ss.speedY * (ss.length / 10);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            ss.x += ss.speedX;
            ss.y += ss.speedY;
            ss.opacity -= 0.015;

            if (ss.opacity <= 0 || ss.x < -100 || ss.y > canvas.height + 100) {
                shootingStars.splice(i, 1);
            }
        }

        requestAnimationFrame(animateCosmic);
    }
    animateCosmic();
}

// Cyberpunk Theme Setup
function initCyberpunk() {
    const layer = document.getElementById('cyber-targets-layer');
    layer.innerHTML = '';
    
    // 16 grid items
    const chars = ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π'];
    for(let i=0; i<16; i++) {
        const node = document.createElement('div');
        node.className = 'cyber-target';
        node.dataset.id = i;
        node.innerText = chars[i];
        
        node.onclick = () => {
            if(!inputSequence.includes(i)) handleTargetClick(i, node);
        };
        layer.appendChild(node);
    }

    // Matrix Rain
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%""\'#&_(),.;:?!\\|{}<>[]^~';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function drawMatrix() {
        if(currentTheme !== 'cyberpunk') return;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = letters.charAt(Math.floor(Math.random() * letters.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    // Clear previous interval if exists
    if(window.matrixInterval) clearInterval(window.matrixInterval);
    window.matrixInterval = setInterval(drawMatrix, 33);
}

function initTheme() {
    inputSequence = [];
    if (currentTheme === 'cosmic') initCosmic();
    if (currentTheme === 'cyberpunk') initCyberpunk();
}

// Initializations
window.addEventListener('resize', () => {
    initTheme();
});

// Start
switchTheme(currentTheme);
