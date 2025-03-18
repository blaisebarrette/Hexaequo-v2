/**
 * app.js
 * Main application file for the Hexaequo game
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get the canvas element
    const canvas = document.getElementById('game-canvas');
    
    // Get the loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Create the model loader
    const modelLoader = new ModelLoader();
    
    // Set up loading callbacks
    modelLoader.setCallbacks(
        // Progress callback
        (progress, modelKey) => {
            const percent = Math.round(progress * 100);
            loadingIndicator.textContent = `Loading models... ${percent}%`;
        },
        // Complete callback
        () => {
            // Hide the loading indicator
            loadingIndicator.style.display = 'none';
            
            // Initialize the game
            initGame(modelLoader);
        }
    );
    
    // Try to load models, but create fallbacks if they don't exist
    try {
        // Show loading indicator
        loadingIndicator.textContent = 'Loading models...';
        loadingIndicator.style.display = 'block';
        
        // Load game models
        modelLoader.loadGameModels();
    } catch (error) {
        console.error('Error loading models:', error);
        
        // Create fallback models
        modelLoader.createFallbackModels();
        
        // Hide the loading indicator
        loadingIndicator.style.display = 'none';
        
        // Initialize the game
        initGame(modelLoader);
    }
});

/**
 * Initialize the game
 * @param {ModelLoader} modelLoader - The model loader
 */
function initGame(modelLoader) {
    // Get the canvas element
    const canvas = document.getElementById('game-canvas');
    
    // Create the game state
    const gameState = new GameState();
    
    // Create the renderer
    const renderer = new Renderer(canvas, modelLoader);
    renderer.setGameState(gameState);
    
    // Create the user interface
    const ui = new UserInterface(gameState, renderer);
    
    // Create the input handler
    const inputHandler = new InputHandler(gameState, renderer, ui);
    inputHandler.enable();
    
    // Update the UI
    ui.update();
    
    // Add the game to the window for use with browser dev tools
    window.hexaequoGame = {
        gameState,
        renderer,
        ui,
        inputHandler
    };
}

/**
 * Handle errors
 * @param {Error} error - The error
 */
function handleError(error) {
    console.error('Hexaequo Error:', error);
    
    // Show error message to user
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = 'An error occurred. Please refresh the page and try again.';
    
    // Add error details
    const errorDetails = document.createElement('details');
    const errorSummary = document.createElement('summary');
    errorSummary.textContent = 'Error Details';
    const errorPre = document.createElement('pre');
    errorPre.textContent = error.stack || error.message || String(error);
    
    errorDetails.appendChild(errorSummary);
    errorDetails.appendChild(errorPre);
    errorMessage.appendChild(errorDetails);
    
    // Add to body
    document.body.appendChild(errorMessage);
}

// Global error handling
window.addEventListener('error', (event) => {
    handleError(event.error || new Error('Unknown error'));
});

window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason || new Error('Unhandled promise rejection'));
}); 