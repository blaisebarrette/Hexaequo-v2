/**
 * InputHandler.js
 * Handles user input for the Hexaequo game
 */

class InputHandler {
    /**
     * Create a new input handler
     * @param {GameState} gameState - The game state
     * @param {Renderer} renderer - The renderer
     * @param {UserInterface} ui - The user interface
     */
    constructor(gameState, renderer, ui) {
        this.gameState = gameState;
        this.renderer = renderer;
        this.ui = ui;
        
        // Track touch input
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        
        // Track keyboard input
        this.keyState = {};
        
        // Initialize input handlers
        this.init();
    }

    /**
     * Initialize input handlers
     */
    init() {
        // Get the canvas element
        const canvas = document.getElementById('game-canvas');
        
        // Add touch event listeners
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Add keyboard event listeners
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Add mouse wheel event listener for zoom
        canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Add window resize event listener
        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * Handle touch start event
     * @param {TouchEvent} event - The touch event
     */
    onTouchStart(event) {
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Single touch - track for potential tap
            const touch = event.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
        } else if (event.touches.length === 2) {
            // Two touches - track for pinch zoom
            this.handlePinchStart(event);
        }
    }

    /**
     * Handle touch move event
     * @param {TouchEvent} event - The touch event
     */
    onTouchMove(event) {
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        if (event.touches.length === 2) {
            // Two touches - handle pinch zoom
            this.handlePinchMove(event);
        }
    }

    /**
     * Handle touch end event
     * @param {TouchEvent} event - The touch event
     */
    onTouchEnd(event) {
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        // Check if it was a tap
        if (event.touches.length === 0 && Date.now() - this.touchStartTime < 300) {
            const dx = Math.abs(event.changedTouches[0].clientX - this.touchStartX);
            const dy = Math.abs(event.changedTouches[0].clientY - this.touchStartY);
            
            // If the touch didn't move much, consider it a tap
            if (dx < 10 && dy < 10) {
                // Create a synthetic mouse event
                const mouseEvent = new MouseEvent('click', {
                    clientX: event.changedTouches[0].clientX,
                    clientY: event.changedTouches[0].clientY,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                
                // Dispatch the event on the canvas
                document.getElementById('game-canvas').dispatchEvent(mouseEvent);
            }
        }
    }

    /**
     * Handle pinch start for touch zoom
     * @param {TouchEvent} event - The touch event
     */
    handlePinchStart(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Calculate the initial distance between touches
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        this.pinchDistance = Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Handle pinch move for touch zoom
     * @param {TouchEvent} event - The touch event
     */
    handlePinchMove(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Calculate the new distance between touches
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate the zoom factor
        const zoomFactor = newDistance / this.pinchDistance;
        
        // Update the pinch distance
        this.pinchDistance = newDistance;
        
        // Apply zoom
        if (zoomFactor > 1.05) {
            // Zoom in
            this.renderer.zoomIn();
        } else if (zoomFactor < 0.95) {
            // Zoom out
            this.renderer.zoomOut();
        }
    }

    /**
     * Handle key down event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyDown(event) {
        // Update key state
        this.keyState[event.key] = true;
        
        // Handle specific key presses
        switch (event.key) {
            case 'ArrowLeft':
                // Rotate camera left
                this.renderer.rotateLeft();
                break;
                
            case 'ArrowRight':
                // Rotate camera right
                this.renderer.rotateRight();
                break;
                
            case '+':
            case '=':
                // Zoom in
                this.renderer.zoomIn();
                break;
                
            case '-':
            case '_':
                // Zoom out
                this.renderer.zoomOut();
                break;
                
            case 'r':
            case 'R':
                // Reset view
                this.renderer.resetView();
                break;
                
            case 'Escape':
                // Cancel current action
                if (this.gameState.selectedAction) {
                    this.gameState.selectedAction = null;
                    this.gameState.selectedHex = null;
                    this.gameState.validMoves = [];
                    this.renderer.clearSelectedHexIndicator();
                    this.ui.update();
                } else {
                    // Close any open modals
                    this.ui.closeModals();
                }
                break;
        }
    }

    /**
     * Handle key up event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyUp(event) {
        // Update key state
        this.keyState[event.key] = false;
    }

    /**
     * Handle mouse wheel event for zoom
     * @param {WheelEvent} event - The wheel event
     */
    onWheel(event) {
        // Prevent default to avoid page scrolling
        event.preventDefault();
        
        // Determine zoom direction
        if (event.deltaY < 0) {
            // Zoom in
            this.renderer.zoomIn();
        } else {
            // Zoom out
            this.renderer.zoomOut();
        }
    }

    /**
     * Handle window resize event
     */
    onResize() {
        // Update the renderer
        this.renderer.onWindowResize();
    }

    /**
     * Handle keyboard shortcuts for game actions
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleGameShortcuts(event) {
        // Only handle shortcuts if the game is not over
        if (this.gameState.gameOver) {
            return;
        }
        
        switch (event.key) {
            case '1':
                // Place tile
                this.ui.onActionButtonClick('placeTile');
                break;
                
            case '2':
                // Place disc
                this.ui.onActionButtonClick('placeDisc');
                break;
                
            case '3':
                // Place ring
                this.ui.onActionButtonClick('placeRing');
                break;
                
            case '4':
                // Move piece
                this.ui.onActionButtonClick('movePiece');
                break;
                
            case 'n':
            case 'N':
                // New game
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.ui.onNewGameClick();
                }
                break;
                
            case 's':
            case 'S':
                // Save game
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.ui.onSaveGameClick();
                }
                break;
                
            case 'o':
            case 'O':
                // Load game
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.ui.onLoadGameClick();
                }
                break;
        }
    }

    /**
     * Enable input handling
     */
    enable() {
        // Add keyboard shortcut handler
        window.addEventListener('keydown', (e) => this.handleGameShortcuts(e));
    }

    /**
     * Disable input handling
     */
    disable() {
        // Remove keyboard shortcut handler
        window.removeEventListener('keydown', this.handleGameShortcuts);
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputHandler };
} 