/**
 * UserInterface.js
 * Handles UI interactions for the Hexaequo game
 */

class UserInterface {
    /**
     * Create a new user interface
     * @param {GameState} gameState - The game state
     * @param {Renderer} renderer - The renderer
     */
    constructor(gameState, renderer) {
        this.gameState = gameState;
        this.renderer = renderer;
        
        // UI elements
        this.elements = {
            // Game info
            currentPlayer: document.getElementById('current-player'),
            gameMessage: document.getElementById('game-message'),
            
            // Piece counts
            blackTilesCount: document.getElementById('black-tiles-count'),
            blackDiscsCount: document.getElementById('black-discs-count'),
            blackDiscsCaptured: document.getElementById('black-discs-captured'),
            blackRingsCount: document.getElementById('black-rings-count'),
            blackRingsCaptured: document.getElementById('black-rings-captured'),
            
            whiteTilesCount: document.getElementById('white-tiles-count'),
            whiteDiscsCount: document.getElementById('white-discs-count'),
            whiteDiscsCaptured: document.getElementById('white-discs-captured'),
            whiteRingsCount: document.getElementById('white-rings-count'),
            whiteRingsCaptured: document.getElementById('white-rings-captured'),
            
            // Action buttons
            placeTileBtn: document.getElementById('place-tile-btn'),
            placeDiscBtn: document.getElementById('place-disc-btn'),
            placeRingBtn: document.getElementById('place-ring-btn'),
            movePieceBtn: document.getElementById('move-piece-btn'),
            
            // Game controls
            newGameBtn: document.getElementById('new-game-btn'),
            saveGameBtn: document.getElementById('save-game-btn'),
            loadGameBtn: document.getElementById('load-game-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            
            // Camera controls
            rotateLeftBtn: document.getElementById('rotate-left-btn'),
            rotateRightBtn: document.getElementById('rotate-right-btn'),
            zoomInBtn: document.getElementById('zoom-in-btn'),
            zoomOutBtn: document.getElementById('zoom-out-btn'),
            resetViewBtn: document.getElementById('reset-view-btn'),
            
            // Modals
            rulesBtn: document.getElementById('rules-btn'),
            rulesModal: document.getElementById('rules-modal'),
            settingsModal: document.getElementById('settings-modal'),
            
            // Loading indicator
            loadingIndicator: document.getElementById('loading-indicator'),
            
            // Game canvas
            gameCanvas: document.getElementById('game-canvas'),

            // Game options
            showValidMovesCheckbox: document.getElementById('show-valid-moves')
        };
        
        // Initialize the UI
        this.init();
    }

    /**
     * Initialize the UI
     */
    init() {
        // Set up action button event listeners
        this.elements.placeTileBtn.addEventListener('click', () => this.onActionButtonClick('placeTile'));
        this.elements.placeDiscBtn.addEventListener('click', () => this.onActionButtonClick('placeDisc'));
        this.elements.placeRingBtn.addEventListener('click', () => this.onActionButtonClick('placeRing'));
        this.elements.movePieceBtn.addEventListener('click', () => this.onActionButtonClick('movePiece'));
        
        // Set up game control event listeners
        this.elements.newGameBtn.addEventListener('click', () => this.onNewGameClick());
        this.elements.saveGameBtn.addEventListener('click', () => this.onSaveGameClick());
        this.elements.loadGameBtn.addEventListener('click', () => this.onLoadGameClick());
        this.elements.settingsBtn.addEventListener('click', () => this.onSettingsClick());
        
        // Set up camera control event listeners
        this.elements.rotateLeftBtn.addEventListener('click', () => this.renderer.rotateLeft());
        this.elements.rotateRightBtn.addEventListener('click', () => this.renderer.rotateRight());
        this.elements.zoomInBtn.addEventListener('click', () => this.renderer.zoomIn());
        this.elements.zoomOutBtn.addEventListener('click', () => this.renderer.zoomOut());
        this.elements.resetViewBtn.addEventListener('click', () => this.renderer.resetView());
        
        // Set up modal event listeners
        this.elements.rulesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRulesModal();
        });
        
        // Set up close modal buttons
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.closeModals());
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
        
        // Set up canvas event listeners
        this.elements.gameCanvas.addEventListener('mousemove', (e) => this.renderer.onMouseMove(e));
        this.elements.gameCanvas.addEventListener('click', (e) => this.onCanvasClick(e));
        
        // Set up show valid moves checkbox
        this.elements.showValidMovesCheckbox?.addEventListener('change', () => {
            if (this.gameState.selectedAction) {
                this.renderer.showValidMoveIndicators();
            }
        });
        
        // Load game rules into the modal
        this.loadRules();
        
        // Update the UI with the initial game state
        this.update();
    }

    /**
     * Update the UI with the current game state
     */
    update() {
        // Update current player
        this.elements.currentPlayer.textContent = this.gameState.currentPlayer.charAt(0).toUpperCase() + this.gameState.currentPlayer.slice(1);
        this.elements.currentPlayer.className = this.gameState.currentPlayer;
        
        // Update game message
        this.elements.gameMessage.textContent = this.gameState.message;
        
        // Update piece counts
        this.updatePieceCounts();
        
        // Update action button states
        this.updateActionButtons();
        
        // Update the renderer
        this.renderer.update();
    }

    /**
     * Update the piece counts in the UI
     */
    updatePieceCounts() {
        const { black, white } = this.gameState.players;
        
        // Black pieces
        this.elements.blackTilesCount.textContent = black.tiles.total - black.tiles.placed;
        this.elements.blackDiscsCount.textContent = black.discs.total - black.discs.placed;
        this.elements.blackDiscsCaptured.textContent = black.discs.captured;
        this.elements.blackRingsCount.textContent = black.rings.total - black.rings.placed;
        this.elements.blackRingsCaptured.textContent = black.rings.captured;
        
        // White pieces
        this.elements.whiteTilesCount.textContent = white.tiles.total - white.tiles.placed;
        this.elements.whiteDiscsCount.textContent = white.discs.total - white.discs.placed;
        this.elements.whiteDiscsCaptured.textContent = white.discs.captured;
        this.elements.whiteRingsCount.textContent = white.rings.total - white.rings.placed;
        this.elements.whiteRingsCaptured.textContent = white.rings.captured;
    }

    /**
     * Update the action button states
     */
    updateActionButtons() {
        // Reset all buttons
        this.elements.placeTileBtn.classList.remove('active');
        this.elements.placeDiscBtn.classList.remove('active');
        this.elements.placeRingBtn.classList.remove('active');
        this.elements.movePieceBtn.classList.remove('active');
        
        // Disable all buttons if game is over
        if (this.gameState.gameOver) {
            this.elements.placeTileBtn.disabled = true;
            this.elements.placeDiscBtn.disabled = true;
            this.elements.placeRingBtn.disabled = true;
            this.elements.movePieceBtn.disabled = true;
            return;
        }
        
        // Enable/disable buttons based on available actions
        const player = this.gameState.players[this.gameState.currentPlayer];
        
        // Place tile button
        this.elements.placeTileBtn.disabled = player.tiles.placed >= player.tiles.total;
        
        // Place disc button
        this.elements.placeDiscBtn.disabled = player.discs.placed >= player.discs.total;
        
        // Place ring button
        this.elements.placeRingBtn.disabled = 
            player.rings.placed >= player.rings.total || 
            player.discs.captured <= 0;
        
        // Move piece button
        // Always enabled as long as the player has pieces on the board
        this.elements.movePieceBtn.disabled = false;
        
        // Highlight the selected action
        if (this.gameState.selectedAction) {
            switch (this.gameState.selectedAction) {
                case 'placeTile':
                    this.elements.placeTileBtn.classList.add('active');
                    break;
                case 'placeDisc':
                    this.elements.placeDiscBtn.classList.add('active');
                    break;
                case 'placeRing':
                    this.elements.placeRingBtn.classList.add('active');
                    break;
                case 'movePiece':
                    this.elements.movePieceBtn.classList.add('active');
                    break;
            }
        }
    }

    /**
     * Handle action button clicks
     * @param {string} action - The action to perform
     */
    onActionButtonClick(action) {
        // If the button is already active, deselect it
        if (this.gameState.selectedAction === action) {
            this.gameState.selectedAction = null;
            this.gameState.selectedHex = null;
            this.gameState.validMoves = [];
            this.renderer.clearValidMoveIndicators();
        } else {
            // Otherwise, select the action
            this.gameState.selectAction(action);
            this.renderer.clearSelectedHexIndicator();
            
            // Only show valid move indicators if the checkbox is checked
            if (this.elements.showValidMovesCheckbox?.checked) {
                this.renderer.showValidMoveIndicators();
            }
        }
        
        // Update the UI
        this.update();
    }

    /**
     * Handle canvas click
     * @param {MouseEvent} event - The mouse event
     */
    onCanvasClick(event) {
        // Get the hex that was clicked
        const hex = this.renderer.onMouseClick(event);
        
        if (!hex) return;
        
        // If we have a preview tile showing
        if (this.renderer.previewTile) {
            // Check if we clicked on the confirmation UI
            const uiAction = this.renderer.checkConfirmationUIIntersection(this.renderer.mouse);
            
            if (uiAction === 'confirm') {
                // Confirm the placement
                this.confirmTilePlacement();
            } else if (uiAction === 'cancel' || !hex.equals(this.renderer.previewHex)) {
                // Cancel if we clicked the cancel button or clicked elsewhere
                this.cancelTilePlacement();
            }
            return;
        }
        
        // Check if this is a valid tile placement location
        if (this.canPlaceTileAt(hex)) {
            // Show preview tile
            this.showTilePreview(hex);
            return;
        }
        
        // Handle other game actions
        if (!this.gameState.selectedAction) {
            this.message = 'Select an action first.';
            return;
        }
        
        // If we're moving a piece and haven't selected a piece yet
        if (this.gameState.selectedAction === 'movePiece' && !this.gameState.selectedHex) {
            const cell = this.gameState.grid.getCell(hex);
            if (!cell || !cell.piece || cell.piece.color !== this.gameState.currentPlayer) {
                this.message = 'Select one of your pieces to move.';
                return;
            }
            
            this.gameState.selectHex(hex);
            return;
        }
        
        // Process hex selection in game state
        this.gameState.selectHex(hex);
        this.update();
    }

    /**
     * Check if a tile can be placed at the given hex
     * @param {Hex} hex - The hex to check
     * @returns {boolean} True if tile placement is valid
     */
    canPlaceTileAt(hex) {
        const player = this.gameState.players[this.gameState.currentPlayer];
        
        // Check if player has tiles available
        if (player.tiles.placed >= player.tiles.total) {
            return false;
        }
        
        // Check if the hex is a valid placement location
        return this.gameState.grid.isValidTilePlacement(hex);
    }

    /**
     * Show a preview tile at the specified hex
     * @param {Hex} hex - The hex to show the preview at
     */
    showTilePreview(hex) {
        this.renderer.showPreviewTile(hex, this.gameState.currentPlayer);
    }

    /**
     * Confirm the tile placement
     */
    confirmTilePlacement() {
        const hex = this.renderer.previewHex;
        if (!hex) return;
        
        const previewTile = this.renderer.previewTile;
        const finalY = 0; // Final Y position at ground level
        const duration = 500; // Animation duration in milliseconds
        const startY = previewTile.position.y;
        const startTime = Date.now();
        
        // Animate the tile dropping
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easeOutBounce for a bouncy effect
            const easeOutBounce = (x) => {
                const n1 = 7.5625;
                const d1 = 2.75;
                
                if (x < 1 / d1) {
                    return n1 * x * x;
                } else if (x < 2 / d1) {
                    return n1 * (x -= 1.5 / d1) * x + 0.75;
                } else if (x < 2.5 / d1) {
                    return n1 * (x -= 2.25 / d1) * x + 0.9375;
                } else {
                    return n1 * (x -= 2.625 / d1) * x + 0.984375;
                }
            };
            
            // Update tile position
            previewTile.position.y = startY + (finalY - startY) * easeOutBounce(progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete, update game state
                this.renderer.clearPreviewTile();
                this.gameState.placeTile(hex);
                this.gameState.saveToHistory();
                this.gameState.checkWinConditions();
                
                // Switch player if game isn't over
                if (!this.gameState.gameOver) {
                    this.gameState.switchPlayer();
                }
                
                // Update the UI
                this.update();
            }
        };
        
        // Start the animation
        animate();
    }

    /**
     * Cancel the tile placement
     */
    cancelTilePlacement() {
        this.renderer.clearPreviewTile();
    }

    /**
     * Handle new game button click
     */
    onNewGameClick() {
        if (confirm('Start a new game? Current game progress will be lost.')) {
            this.gameState.initializeGame();
            this.update();
        }
    }

    /**
     * Handle save game button click
     */
    onSaveGameClick() {
        // Create a modal for saving the game
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const closeButton = document.createElement('span');
        closeButton.className = 'close-modal';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        const title = document.createElement('h2');
        title.textContent = 'Save Game';
        
        const form = document.createElement('div');
        form.className = 'settings-form';
        
        // Create input for save name
        const saveNameGroup = document.createElement('div');
        saveNameGroup.className = 'setting-group';
        
        const saveNameLabel = document.createElement('label');
        saveNameLabel.setAttribute('for', 'save-name');
        saveNameLabel.textContent = 'Save Name:';
        
        const saveNameInput = document.createElement('input');
        saveNameInput.setAttribute('type', 'text');
        saveNameInput.setAttribute('id', 'save-name');
        saveNameInput.setAttribute('value', 'Game ' + new Date().toLocaleString());
        
        saveNameGroup.appendChild(saveNameLabel);
        saveNameGroup.appendChild(saveNameInput);
        
        // Create save button
        const saveButton = document.createElement('button');
        saveButton.className = 'action-btn';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => {
            const saveName = saveNameInput.value.trim() || 'default';
            if (this.gameState.saveGame(saveName)) {
                alert('Game saved successfully!');
                document.body.removeChild(modal);
            } else {
                alert('Failed to save game. Please try again.');
            }
        });
        
        // Create export button
        const exportButton = document.createElement('button');
        exportButton.className = 'action-btn';
        exportButton.textContent = 'Export to File';
        exportButton.addEventListener('click', () => {
            const exportData = this.gameState.exportGame();
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'hexaequo_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        // Add elements to form
        form.appendChild(saveNameGroup);
        form.appendChild(saveButton);
        form.appendChild(exportButton);
        
        // Add elements to modal
        modalContent.appendChild(closeButton);
        modalContent.appendChild(title);
        modalContent.appendChild(form);
        modal.appendChild(modalContent);
        
        // Add modal to body
        document.body.appendChild(modal);
    }

    /**
     * Handle load game button click
     */
    onLoadGameClick() {
        // Create a modal for loading the game
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const closeButton = document.createElement('span');
        closeButton.className = 'close-modal';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        const title = document.createElement('h2');
        title.textContent = 'Load Game';
        
        const form = document.createElement('div');
        form.className = 'settings-form';
        
        // Get save slots
        const saveSlots = this.gameState.getSaveSlots();
        
        if (saveSlots.length > 0) {
            // Create list of save slots
            const saveList = document.createElement('div');
            saveList.className = 'save-list';
            
            saveSlots.forEach(slot => {
                const saveItem = document.createElement('div');
                saveItem.className = 'save-item';
                
                const saveName = document.createElement('div');
                saveName.className = 'save-name';
                saveName.textContent = slot.name;
                
                const saveDate = document.createElement('div');
                saveDate.className = 'save-date';
                saveDate.textContent = slot.date;
                
                const loadButton = document.createElement('button');
                loadButton.className = 'action-btn';
                loadButton.textContent = 'Load';
                loadButton.addEventListener('click', () => {
                    if (confirm('Load this game? Current game progress will be lost.')) {
                        if (this.gameState.loadGame(slot.name)) {
                            alert('Game loaded successfully!');
                            document.body.removeChild(modal);
                            this.update();
                        } else {
                            alert('Failed to load game. Please try again.');
                        }
                    }
                });
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'action-btn';
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => {
                    if (confirm('Delete this saved game? This cannot be undone.')) {
                        if (this.gameState.deleteSaveSlot(slot.name)) {
                            saveItem.remove();
                            if (saveList.children.length === 0) {
                                saveList.innerHTML = '<p>No saved games found.</p>';
                            }
                        } else {
                            alert('Failed to delete save. Please try again.');
                        }
                    }
                });
                
                saveItem.appendChild(saveName);
                saveItem.appendChild(saveDate);
                saveItem.appendChild(loadButton);
                saveItem.appendChild(deleteButton);
                
                saveList.appendChild(saveItem);
            });
            
            form.appendChild(saveList);
        } else {
            const noSaves = document.createElement('p');
            noSaves.textContent = 'No saved games found.';
            form.appendChild(noSaves);
        }
        
        // Create import button
        const importContainer = document.createElement('div');
        importContainer.className = 'import-container';
        
        const importLabel = document.createElement('label');
        importLabel.setAttribute('for', 'import-file');
        importLabel.textContent = 'Import from file:';
        
        const importInput = document.createElement('input');
        importInput.setAttribute('type', 'file');
        importInput.setAttribute('id', 'import-file');
        importInput.setAttribute('accept', '.json');
        
        const importButton = document.createElement('button');
        importButton.className = 'action-btn';
        importButton.textContent = 'Import';
        importButton.addEventListener('click', () => {
            const file = importInput.files[0];
            if (!file) {
                alert('Please select a file to import.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonString = e.target.result;
                    if (this.gameState.importGame(jsonString)) {
                        alert('Game imported successfully!');
                        document.body.removeChild(modal);
                        this.update();
                    } else {
                        alert('Failed to import game. Invalid file format.');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Failed to import game. Invalid file format.');
                }
            };
            reader.readAsText(file);
        });
        
        importContainer.appendChild(importLabel);
        importContainer.appendChild(importInput);
        importContainer.appendChild(importButton);
        
        form.appendChild(importContainer);
        
        // Add elements to modal
        modalContent.appendChild(closeButton);
        modalContent.appendChild(title);
        modalContent.appendChild(form);
        modal.appendChild(modalContent);
        
        // Add modal to body
        document.body.appendChild(modal);
    }

    /**
     * Handle settings button click
     */
    onSettingsClick() {
        this.elements.settingsModal.style.display = 'block';
    }

    /**
     * Show the rules modal
     */
    showRulesModal() {
        this.elements.rulesModal.style.display = 'block';
    }

    /**
     * Close all modals
     */
    closeModals() {
        this.elements.rulesModal.style.display = 'none';
        this.elements.settingsModal.style.display = 'none';
    }

    /**
     * Load the game rules into the rules modal
     */
    loadRules() {
        const rulesContent = document.querySelector('.rules-content');
        rulesContent.innerHTML = GameRules.getRulesHTML();
    }

    /**
     * Show the loading indicator
     * @param {string} message - The loading message
     */
    showLoadingIndicator(message) {
        this.elements.loadingIndicator.textContent = message || 'Loading...';
        this.elements.loadingIndicator.style.display = 'block';
    }

    /**
     * Hide the loading indicator
     */
    hideLoadingIndicator() {
        this.elements.loadingIndicator.style.display = 'none';
    }

    /**
     * Update the loading progress
     * @param {number} progress - The loading progress (0-1)
     * @param {string} message - The loading message
     */
    updateLoadingProgress(progress, message) {
        const percent = Math.round(progress * 100);
        this.elements.loadingIndicator.textContent = message ? `${message} (${percent}%)` : `Loading... ${percent}%`;
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserInterface };
} 