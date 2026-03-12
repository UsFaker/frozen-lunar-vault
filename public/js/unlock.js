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

    // Canvas stars
    const canvas = document.getElementById('cosmic-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];
    for(let i=0; i<200; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5,
            speed: Math.random() * 0.5
        });
    }

    function animateCosmic() {
        if (currentTheme !== 'cosmic') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        stars.forEach(s => {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.001 * s.speed) * 0.5;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            s.y -= s.speed;
            if(s.y < 0) s.y = canvas.height;
        });
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
