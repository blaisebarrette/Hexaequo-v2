/**
 * GameState.js
 * Manages the state of the Hexaequo game, including player turns, piece counts, and game actions
 */

class GameState {
    /**
     * Create a new game state
     */
    constructor() {
        // Initialize the hex grid
        this.grid = new HexGrid();
        
        // Initialize player data
        this.players = {
            black: {
                tiles: { total: 9, placed: 0 },
                discs: { total: 6, placed: 0, captured: 0 },
                rings: { total: 3, placed: 0, captured: 0 }
            },
            white: {
                tiles: { total: 9, placed: 0 },
                discs: { total: 6, placed: 0, captured: 0 },
                rings: { total: 3, placed: 0, captured: 0 }
            }
        };
        
        // Game state
        this.currentPlayer = 'black'; // Black starts
        this.selectedAction = null;
        this.selectedHex = null;
        this.validMoves = [];
        this.gameOver = false;
        this.winner = null;
        this.message = 'Game started. Black player\'s turn.';
        this.canContinueJumping = false; // New flag for multi-jump handling
        this.lastJumpedPiece = null; // Track the piece that just jumped
        
        // History for undo/redo and detecting repeated positions
        this.history = [];
        this.positionCounts = new Map();
        
        // Initialize the game
        this.initializeGame();
    }

    /**
     * Initialize a new game
     */
    initializeGame() {
        // Reset the grid
        this.grid.initializeGame();
        
        // Reset player data
        this.players = {
            black: {
                tiles: { total: 9, placed: 2 }, // 2 tiles are placed at start
                discs: { total: 6, placed: 1, captured: 0 }, // 1 disc is placed at start
                rings: { total: 3, placed: 0, captured: 0 }
            },
            white: {
                tiles: { total: 9, placed: 2 }, // 2 tiles are placed at start
                discs: { total: 6, placed: 1, captured: 0 }, // 1 disc is placed at start
                rings: { total: 3, placed: 0, captured: 0 }
            }
        };
        
        // Reset game state
        this.currentPlayer = 'black';
        this.selectedAction = null;
        this.selectedHex = null;
        this.validMoves = [];
        this.gameOver = false;
        this.winner = null;
        this.message = 'Game started. Black player\'s turn.';
        
        // Reset history
        this.history = [];
        this.positionCounts = new Map();
        
        // Save initial state to history
        this.saveToHistory();
    }

    /**
     * Save the current state to history
     */
    saveToHistory() {
        // Create a serializable representation of the current state
        const state = {
            grid: Array.from(this.grid.cells.entries()),
            currentPlayer: this.currentPlayer,
            players: JSON.parse(JSON.stringify(this.players))
        };
        
        // Add to history
        this.history.push(state);
        
        // Update position counts for detecting repetition
        const positionKey = this.getPositionKey();
        const count = this.positionCounts.get(positionKey) || 0;
        this.positionCounts.set(positionKey, count + 1);
        
        // Check for threefold repetition
        if (count + 1 >= 3) {
            this.endGame(null, 'Game ended in a draw due to threefold repetition.');
        }
    }

    /**
     * Get a unique key representing the current board position
     * @returns {string} Position key
     */
    getPositionKey() {
        // Sort cells by coordinates for consistent ordering
        const sortedCells = Array.from(this.grid.cells.entries())
            .sort(([a], [b]) => a.localeCompare(b));
        
        // Create a string representation
        return JSON.stringify({
            cells: sortedCells,
            currentPlayer: this.currentPlayer
        });
    }

    /**
     * Switch to the next player's turn
     */
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        this.message = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} player's turn.`;
        
        // Clear selections
        this.selectedAction = null;
        this.selectedHex = null;
        this.validMoves = [];
        
        // Check if the current player has any valid moves
        if (!this.hasValidMoves()) {
            this.endGame(
                this.getOpponent(), 
                `Game over! ${this.getOpponent().charAt(0).toUpperCase() + this.getOpponent().slice(1)} wins because ${this.currentPlayer} has no valid moves.`
            );
        }
    }

    /**
     * Get the opponent of the current player
     * @returns {string} Opponent color
     */
    getOpponent() {
        return this.currentPlayer === 'black' ? 'white' : 'black';
    }

    /**
     * Check if the current player has any valid moves
     * @returns {boolean} True if the player has valid moves
     */
    hasValidMoves() {
        // Check if player can place a tile
        if (this.players[this.currentPlayer].tiles.placed < this.players[this.currentPlayer].tiles.total) {
            const validTilePlacements = this.grid.getValidTilePlacements(this.currentPlayer);
            if (validTilePlacements.length > 0) {
                return true;
            }
        }
        
        // Check if player can place a disc
        if (this.players[this.currentPlayer].discs.placed < this.players[this.currentPlayer].discs.total) {
            const validDiscPlacements = this.grid.getValidPiecePlacements(this.currentPlayer);
            if (validDiscPlacements.length > 0) {
                return true;
            }
        }
        
        // Check if player can place a ring
        if (this.players[this.currentPlayer].rings.placed < this.players[this.currentPlayer].rings.total &&
            this.players[this.currentPlayer].discs.captured > 0) {
            const validRingPlacements = this.grid.getValidPiecePlacements(this.currentPlayer);
            if (validRingPlacements.length > 0) {
                return true;
            }
        }
        
        // Check if player can move any pieces
        const allCells = this.grid.getAllCells();
        for (const [hex, data] of allCells) {
            if (data.piece && data.piece.color === this.currentPlayer) {
                let validMoves = [];
                if (data.piece.type === 'disc') {
                    validMoves = this.grid.getValidDiscMoves(hex);
                } else if (data.piece.type === 'ring') {
                    validMoves = this.grid.getValidRingMoves(hex);
                }
                
                if (validMoves.length > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * End the game with a winner or draw
     * @param {string|null} winner - Winner color or null for draw
     * @param {string} message - End game message
     */
    endGame(winner, message) {
        this.gameOver = true;
        this.winner = winner;
        this.message = message;
    }

    /**
     * Select an action to perform
     * @param {string} action - Action type ('placeTile', 'placeDisc', 'placeRing', 'movePiece')
     */
    selectAction(action) {
        if (this.gameOver) {
            return;
        }
        
        this.selectedAction = action;
        this.selectedHex = null;
        this.validMoves = [];
        
        // Show valid moves for the selected action
        switch (action) {
            case 'placeTile':
                if (this.players[this.currentPlayer].tiles.placed >= this.players[this.currentPlayer].tiles.total) {
                    this.message = 'No more tiles available to place.';
                    this.selectedAction = null;
                    return;
                }
                this.validMoves = this.grid.getValidTilePlacements(this.currentPlayer);
                this.message = 'Select a position to place a tile.';
                break;
                
            case 'placeDisc':
                if (this.players[this.currentPlayer].discs.placed >= this.players[this.currentPlayer].discs.total) {
                    this.message = 'No more discs available to place.';
                    this.selectedAction = null;
                    return;
                }
                this.validMoves = this.grid.getValidPiecePlacements(this.currentPlayer);
                this.message = 'Select a tile to place a disc.';
                break;
                
            case 'placeRing':
                if (this.players[this.currentPlayer].rings.placed >= this.players[this.currentPlayer].rings.total) {
                    this.message = 'No more rings available to place.';
                    this.selectedAction = null;
                    return;
                }
                if (this.players[this.currentPlayer].discs.captured <= 0) {
                    this.message = 'You need captured discs to place a ring.';
                    this.selectedAction = null;
                    return;
                }
                this.validMoves = this.grid.getValidPiecePlacements(this.currentPlayer);
                this.message = 'Select a tile to place a ring.';
                break;
                
            case 'movePiece':
                this.message = 'Select a piece to move.';
                // Valid moves will be shown after selecting a piece
                break;
        }
        
        if (this.validMoves.length === 0 && this.selectedAction !== 'movePiece') {
            this.message = `No valid positions for ${this.selectedAction}.`;
            this.selectedAction = null;
        }
    }

    /**
     * Select a hex on the grid
     * @param {Hex} hex - Selected hex
     */
    selectHex(hex) {
        if (this.gameOver) {
            return;
        }
        
        if (!this.selectedAction) {
            this.message = 'Select an action first.';
            return;
        }
        
        // If we're moving a piece and haven't selected a piece yet
        if (this.selectedAction === 'movePiece' && !this.selectedHex) {
            const cell = this.grid.getCell(hex);
            if (!cell || !cell.piece || cell.piece.color !== this.currentPlayer) {
                this.message = 'Select one of your pieces to move.';
                return;
            }
            
            // If we can continue jumping, only allow selecting the same piece
            if (this.canContinueJumping && !hex.equals(this.lastJumpedPiece)) {
                // If they select a different piece, end their turn
                this.canContinueJumping = false;
                this.lastJumpedPiece = null;
                this.saveToHistory();
                this.checkWinConditions();
                if (!this.gameOver) {
                    this.switchPlayer();
                }
                return;
            }
            
            this.selectedHex = hex;
            
            // Show valid moves for the selected piece
            if (cell.piece.type === 'disc') {
                this.validMoves = this.grid.getValidDiscMoves(hex);
                // If we can continue jumping, only show jump moves
                if (this.canContinueJumping) {
                    this.validMoves = this.validMoves.filter(move => hex.distance(move) > 1);
                }
            } else if (cell.piece.type === 'ring') {
                this.validMoves = this.grid.getValidRingMoves(hex);
            }
            
            if (this.validMoves.length === 0) {
                this.message = 'This piece has no valid moves.';
                this.selectedHex = null;
                return;
            }
            
            this.message = 'Select a destination for the piece.';
            return;
        }
        
        // Check if the selected hex is a valid move
        const isValidMove = this.validMoves.some(validHex => validHex.equals(hex));
        if (!isValidMove) {
            this.message = 'Invalid move. Try again.';
            return;
        }
        
        // Perform the selected action
        switch (this.selectedAction) {
            case 'placeTile':
                this.placeTile(hex);
                this.saveToHistory();
                this.checkWinConditions();
                if (!this.gameOver) {
                    this.switchPlayer();
                }
                break;
                
            case 'placeDisc':
                this.placeDisc(hex);
                this.saveToHistory();
                this.checkWinConditions();
                if (!this.gameOver) {
                    this.switchPlayer();
                }
                break;
                
            case 'placeRing':
                this.placeRing(hex);
                this.saveToHistory();
                this.checkWinConditions();
                if (!this.gameOver) {
                    this.switchPlayer();
                }
                break;
                
            case 'movePiece':
                this.movePiece(this.selectedHex, hex);
                break;
        }
        
        // Reset selection unless we can continue jumping
        if (!this.canContinueJumping) {
            this.selectedHex = null;
            this.selectedAction = null;
            this.validMoves = [];
        } else {
            // Keep the piece selected for additional jumps
            this.selectedHex = hex;
            this.validMoves = this.grid.getValidDiscMoves(hex)
                .filter(move => hex.distance(move) > 1);
        }
    }

    /**
     * Place a tile at the specified position
     * @param {Hex} hex - Position to place the tile
     */
    placeTile(hex) {
        this.grid.setCell(hex, { type: 'tile', color: this.currentPlayer });
        this.players[this.currentPlayer].tiles.placed++;
        this.message = `${this.currentPlayer} placed a tile.`;
    }

    /**
     * Place a disc at the specified position
     * @param {Hex} hex - Position to place the disc
     */
    placeDisc(hex) {
        const cell = this.grid.getCell(hex);
        cell.piece = { type: 'disc', color: this.currentPlayer };
        this.grid.setCell(hex, cell);
        this.players[this.currentPlayer].discs.placed++;
        this.message = `${this.currentPlayer} placed a disc.`;
    }

    /**
     * Place a ring at the specified position
     * @param {Hex} hex - Position to place the ring
     */
    placeRing(hex) {
        const cell = this.grid.getCell(hex);
        cell.piece = { type: 'ring', color: this.currentPlayer };
        this.grid.setCell(hex, cell);
        this.players[this.currentPlayer].rings.placed++;
        this.players[this.currentPlayer].discs.captured--;
        this.players[this.getOpponent()].discs.total++;
        this.message = `${this.currentPlayer} placed a ring and returned a captured disc.`;
    }

    /**
     * Move a piece from one position to another
     * @param {Hex} fromHex - Starting position
     * @param {Hex} toHex - Destination position
     */
    movePiece(fromHex, toHex) {
        const fromCell = this.grid.getCell(fromHex);
        const toCell = this.grid.getCell(toHex);
        const piece = fromCell.piece;
        let capturedPieces = false;
        
        // Handle disc jumps and captures
        if (piece.type === 'disc' && fromHex.distance(toHex) > 1) {
            // Get the path of hexes jumped over
            const jumpedHexes = this.grid.getJumpedHexes(fromHex, toHex);
            
            // Capture any enemy pieces that were jumped over
            jumpedHexes.forEach(jumpedHex => {
                const jumpedCell = this.grid.getCell(jumpedHex);
                if (jumpedCell && jumpedCell.piece && jumpedCell.piece.color !== piece.color) {
                    // Capture the piece
                    if (jumpedCell.piece.type === 'disc') {
                        this.players[this.currentPlayer].discs.captured++;
                        this.players[this.getOpponent()].discs.total--;
                        capturedPieces = true;
                    } else if (jumpedCell.piece.type === 'ring') {
                        this.players[this.currentPlayer].rings.captured++;
                        this.players[this.getOpponent()].rings.total--;
                        capturedPieces = true;
                    }
                    // Remove the captured piece
                    jumpedCell.piece = null;
                    this.grid.setCell(jumpedHex, jumpedCell);
                }
            });
            
            // Update message to reflect captures
            this.message = capturedPieces ? 
                `${this.currentPlayer} captured pieces by jumping.` : 
                `${this.currentPlayer} jumped over pieces.`;
        }
        // Handle ring captures (landing on a piece)
        else if (piece.type === 'ring' && toCell.piece) {
            const capturedPiece = toCell.piece;
            if (capturedPiece.type === 'disc') {
                this.players[this.currentPlayer].discs.captured++;
                this.players[this.getOpponent()].discs.total--;
                this.message = `${this.currentPlayer} captured a disc with a ring.`;
            } else if (capturedPiece.type === 'ring') {
                this.players[this.currentPlayer].rings.captured++;
                this.players[this.getOpponent()].rings.total--;
                this.message = `${this.currentPlayer} captured a ring with a ring.`;
            }
        }
        else {
            this.message = `${this.currentPlayer} moved a ${piece.type}.`;
        }
        
        // Move the piece
        fromCell.piece = null;
        toCell.piece = piece;
        
        // Update the grid
        this.grid.setCell(fromHex, fromCell);
        this.grid.setCell(toHex, toCell);

        // Check for additional jumps if this was a disc move with captures
        if (piece.type === 'disc' && capturedPieces) {
            const additionalJumps = this.grid.getValidDiscMoves(toHex)
                .filter(move => toHex.distance(move) > 1); // Only consider jumps, not simple moves
            
            if (additionalJumps.length > 0) {
                this.canContinueJumping = true;
                this.lastJumpedPiece = toHex;
                this.message += ' Additional jumps available. Select the same piece to jump again, or any other piece/action to end your turn.';
                return; // Don't switch turns yet
            }
        }

        // If we get here, either there are no more jumps or it wasn't a capturing move
        this.canContinueJumping = false;
        this.lastJumpedPiece = null;
        
        // Save state and check win conditions only when the turn is actually ending
        this.saveToHistory();
        this.checkWinConditions();
        
        // Switch to the next player if the game isn't over
        if (!this.gameOver) {
            this.switchPlayer();
        }
    }

    /**
     * Check for win conditions
     */
    checkWinConditions() {
        const opponent = this.getOpponent();
        
        // Check if all opponent discs are captured
        if (this.players[opponent].discs.total <= 0) {
            this.endGame(
                this.currentPlayer, 
                `Game over! ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} wins by capturing all ${opponent} discs.`
            );
            return;
        }
        
        // Check if all opponent rings are captured
        if (this.players[opponent].rings.total <= 0) {
            this.endGame(
                this.currentPlayer, 
                `Game over! ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} wins by capturing all ${opponent} rings.`
            );
            return;
        }
        
        // Check if opponent has no pieces on the board
        let opponentHasPieces = false;
        const allCells = this.grid.getAllCells();
        for (const [_, data] of allCells) {
            if (data.piece && data.piece.color === opponent) {
                opponentHasPieces = true;
                break;
            }
        }
        
        if (!opponentHasPieces) {
            this.endGame(
                this.currentPlayer, 
                `Game over! ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} wins by removing all ${opponent} pieces from the board.`
            );
        }
    }

    /**
     * Save the game state to local storage
     * @param {string} slotName - Name of the save slot
     */
    saveGame(slotName = 'default') {
        const saveData = {
            grid: Array.from(this.grid.cells.entries()),
            players: this.players,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            winner: this.winner,
            message: this.message,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(`hexaequo_save_${slotName}`, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    /**
     * Load a game state from local storage
     * @param {string} slotName - Name of the save slot
     * @returns {boolean} True if the game was loaded successfully
     */
    loadGame(slotName = 'default') {
        try {
            const saveData = localStorage.getItem(`hexaequo_save_${slotName}`);
            if (!saveData) {
                return false;
            }
            
            const data = JSON.parse(saveData);
            
            // Restore grid
            this.grid = new HexGrid();
            data.grid.forEach(([hash, cellData]) => {
                this.grid.cells.set(hash, cellData);
            });
            
            // Recalculate grid bounds
            this.grid.minQ = Infinity;
            this.grid.maxQ = -Infinity;
            this.grid.minR = Infinity;
            this.grid.maxR = -Infinity;
            
            for (const [hash, _] of data.grid) {
                const hex = Hex.fromHash(hash);
                this.grid.minQ = Math.min(this.grid.minQ, hex.q);
                this.grid.maxQ = Math.max(this.grid.maxQ, hex.q);
                this.grid.minR = Math.min(this.grid.minR, hex.r);
                this.grid.maxR = Math.max(this.grid.maxR, hex.r);
            }
            
            // Restore player data
            this.players = data.players;
            
            // Restore game state
            this.currentPlayer = data.currentPlayer;
            this.gameOver = data.gameOver;
            this.winner = data.winner;
            this.message = data.message;
            
            // Reset selections
            this.selectedAction = null;
            this.selectedHex = null;
            this.validMoves = [];
            
            // Reset history
            this.history = [];
            this.positionCounts = new Map();
            this.saveToHistory();
            
            return true;
        } catch (e) {
            console.error('Failed to load game:', e);
            return false;
        }
    }

    /**
     * Get a list of available save slots
     * @returns {Array} Array of save slot objects with name and timestamp
     */
    getSaveSlots() {
        const slots = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('hexaequo_save_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    slots.push({
                        name: key.replace('hexaequo_save_', ''),
                        timestamp: data.timestamp,
                        date: new Date(data.timestamp).toLocaleString()
                    });
                } catch (e) {
                    console.error('Error parsing save slot:', e);
                }
            }
        }
        return slots.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Delete a save slot
     * @param {string} slotName - Name of the save slot
     * @returns {boolean} True if the slot was deleted
     */
    deleteSaveSlot(slotName) {
        try {
            localStorage.removeItem(`hexaequo_save_${slotName}`);
            return true;
        } catch (e) {
            console.error('Failed to delete save slot:', e);
            return false;
        }
    }

    /**
     * Export the current game state as a JSON string
     * @returns {string} JSON string of the game state
     */
    exportGame() {
        const exportData = {
            grid: Array.from(this.grid.cells.entries()),
            players: this.players,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            winner: this.winner,
            message: this.message,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        return JSON.stringify(exportData);
    }

    /**
     * Import a game state from a JSON string
     * @param {string} jsonString - JSON string of the game state
     * @returns {boolean} True if the game was imported successfully
     */
    importGame(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Validate the data
            if (!data.grid || !data.players || !data.currentPlayer) {
                return false;
            }
            
            // Restore grid
            this.grid = new HexGrid();
            data.grid.forEach(([hash, cellData]) => {
                this.grid.cells.set(hash, cellData);
            });
            
            // Recalculate grid bounds
            this.grid.minQ = Infinity;
            this.grid.maxQ = -Infinity;
            this.grid.minR = Infinity;
            this.grid.maxR = -Infinity;
            
            for (const [hash, _] of data.grid) {
                const hex = Hex.fromHash(hash);
                this.grid.minQ = Math.min(this.grid.minQ, hex.q);
                this.grid.maxQ = Math.max(this.grid.maxQ, hex.q);
                this.grid.minR = Math.min(this.grid.minR, hex.r);
                this.grid.maxR = Math.max(this.grid.maxR, hex.r);
            }
            
            // Restore player data
            this.players = data.players;
            
            // Restore game state
            this.currentPlayer = data.currentPlayer;
            this.gameOver = data.gameOver || false;
            this.winner = data.winner || null;
            this.message = data.message || 'Game imported.';
            
            // Reset selections
            this.selectedAction = null;
            this.selectedHex = null;
            this.validMoves = [];
            
            // Reset history
            this.history = [];
            this.positionCounts = new Map();
            this.saveToHistory();
            
            return true;
        } catch (e) {
            console.error('Failed to import game:', e);
            return false;
        }
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState };
} 