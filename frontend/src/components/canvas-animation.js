/**
 * FULL-SCREEN SCROLL CANVAS ANIMATION
 * Fixed: Properly calculates scroll relative to full section height
 * Maps scroll progress (0-1) to frames (1-300)
 */

class FullScreenScrollCanvas {
    constructor() {
        this.canvas = document.getElementById('frameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // Frame configuration - ALL 300 frames
        this.frameCount = 300;
        this.frames = [];
        this.currentFrame = 0;
        this.imagesLoaded = 0;
        
        // Path to optimized frames (absolute path from root)
        this.framePath = '/Assets/logo-frames-gold-optimized/';
        
        this.isReady = false;
        this.rafId = null;
        
        this.init();
    }
    
    async init() {
        this.setupCanvas();
        await this.preloadInitialFrames();
        this.onLoadComplete();
        this.loadRemainingFrames();
        this.setupScrollListener();
        this.handleResize();
        
        window.addEventListener('resize', () => this.handleResize());
    }
    
    /**
     * Setup canvas to fill viewport with proper pixel density
     */
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas to full viewport size
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        
        // Scale context for retina displays
        this.ctx.scale(dpr, dpr);
        
        // CSS size matches viewport
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
    }
    
    /**
     * Get padded frame filename (001-300)
     */
    getFrameFilename(frameNumber) {
        return `ezgif-frame-${String(frameNumber).padStart(3, '0')}.jpg`;
    }
    
    preloadInitialFrames() {
        const initialFrameCount = 30;
        return Promise.all(Array.from({ length: initialFrameCount }, (_, index) => this.loadFrame(index)));
    }

    loadFrame(index) {
        return new Promise((resolve) => {
            const img = new Image();
            const filename = this.getFrameFilename(index + 1);
            img.onload = () => {
                this.imagesLoaded++;
                this.updateProgress();
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load: ${filename}`);
                this.imagesLoaded++;
                this.updateProgress();
                resolve(null);
            };
            img.src = this.framePath + filename;
            this.frames[index] = img;
        });
    }

    loadRemainingFrames() {
        const loadRest = () => {
            const remaining = Array.from({ length: this.frameCount - 30 }, (_, index) => index + 30);
            Promise.all(remaining.map((index) => this.loadFrame(index)));
        };
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(loadRest, { timeout: 2000 });
        } else {
            setTimeout(loadRest, 100);
        }
    }
    
    /**
     * Update loading progress
     */
    updateProgress() {
        const progress = (this.imagesLoaded / this.frameCount) * 100;
        this.progressFill.style.width = progress + '%';
        this.progressText.textContent = Math.round(progress) + '%';
    }
    
    /**
     * All frames loaded - hide loading screen
     */
    onLoadComplete() {
        this.isReady = true;
        
        setTimeout(() => {
            this.loadingScreen.classList.add('hidden');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }, 300);
        
        // Draw first frame
        this.updateFrame(0);
    }
    
    /**
     * Setup scroll listener with requestAnimationFrame
     */
    setupScrollListener() {
        const updateFrameOnScroll = () => {
            if (!this.isReady) return;
            
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? scrollTop / docHeight : 0;
            const clamped = Math.min(Math.max(progress, 0), 1);
            
            // scrub through frames across the ENTIRE site scroll, not just one section
            const frameIndex = Math.min(this.frameCount - 1, Math.floor(clamped * (this.frameCount - 1)));
            
            // Update only if frame changed
            if (frameIndex !== this.currentFrame) {
                this.currentFrame = frameIndex;
                this.updateFrame(frameIndex);
            }
        };
        
        window.addEventListener('scroll', () => {
            requestAnimationFrame(updateFrameOnScroll);
        });
        
        // Initial render
        updateFrameOnScroll();
    }
    
    /**
     * Handle scroll and update frame - REPLACED WITH NEW LOGIC ABOVE
     */
    handleScroll() {
        // This method is no longer used - kept for compatibility
    }
    
    /**
     * Draw specific frame to canvas with cover-fit
     */
    updateFrame(index) {
        if (!this.frames[index] || !this.frames[index].complete) return;
        
        const img = this.frames[index];
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Calculate cover-fit dimensions
        const canvasRatio = canvasWidth / canvasHeight;
        const imgRatio = img.width / img.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (canvasRatio > imgRatio) {
            // Canvas wider than image - fit to width
            drawWidth = canvasWidth;
            drawHeight = drawWidth / imgRatio;
            offsetX = 0;
            offsetY = (canvasHeight - drawHeight) / 2;
        } else {
            // Canvas taller than image - fit to height
            drawHeight = canvasHeight;
            drawWidth = drawHeight * imgRatio;
            offsetX = (canvasWidth - drawWidth) / 2;
            offsetY = 0;
        }
        
        // Draw image centered and covering canvas
        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        this.setupCanvas();
        
        if (this.isReady) {
            this.updateFrame(this.currentFrame);
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FullScreenScrollCanvas();
    });
} else {
    new FullScreenScrollCanvas();
}
