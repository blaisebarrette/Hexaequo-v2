/**
 * GameRules.js
 * Implements the rules of Hexaequo and provides validation functions
 */

class GameRules {
    /**
     * Check if a tile placement is valid
     * @param {HexGrid} grid - The game grid
     * @param {Hex} hex - The hex to place the tile on
     * @returns {boolean} True if the placement is valid
     */
    static isValidTilePlacement(grid, hex) {
        // Can't place where a tile already exists
        if (grid.hasCell(hex)) {
            return false;
        }
        
        // Must be adjacent to at least two existing tiles
        const neighbors = grid.getNeighborHexes(hex);
        const existingNeighbors = neighbors.filter(n => grid.hasCell(n));
        
        return existingNeighbors.length >= 2;
    }

    /**
     * Check if a piece placement is valid
     * @param {HexGrid} grid - The game grid
     * @param {Hex} hex - The hex to place the piece on
     * @param {string} pieceColor - The color of the piece
     * @param {string} pieceType - The type of piece ('disc' or 'ring')
     * @param {Object} playerState - The player's state
     * @returns {Object} Object with isValid and message properties
     */
    static isValidPiecePlacement(grid, hex, pieceColor, pieceType, playerState) {
        const cell = grid.getCell(hex);
        
        // Must be on an existing tile
        if (!cell) {
            return { isValid: false, message: 'Must place on an existing tile.' };
        }
        
        // Must be on a tile of the same color
        if (cell.color !== pieceColor) {
            return { isValid: false, message: 'Must place on a tile of your color.' };
        }
        
        // Tile must be empty (no piece on it)
        if (cell.piece) {
            return { isValid: false, message: 'Tile already has a piece on it.' };
        }
        
        // Check piece-specific rules
        if (pieceType === 'disc') {
            // Check if player has discs available
            if (playerState.discs.placed >= playerState.discs.total) {
                return { isValid: false, message: 'No more discs available to place.' };
            }
        } else if (pieceType === 'ring') {
            // Check if player has rings available
            if (playerState.rings.placed >= playerState.rings.total) {
                return { isValid: false, message: 'No more rings available to place.' };
            }
            
            // Check if player has captured discs to exchange
            if (playerState.discs.captured <= 0) {
                return { isValid: false, message: 'You need captured discs to place a ring.' };
            }
        }
        
        return { isValid: true, message: 'Valid placement.' };
    }

    /**
     * Check if a piece movement is valid
     * @param {HexGrid} grid - The game grid
     * @param {Hex} fromHex - The starting hex
     * @param {Hex} toHex - The destination hex
     * @returns {Object} Object with isValid and message properties
     */
    static isValidPieceMovement(grid, fromHex, toHex) {
        const fromCell = grid.getCell(fromHex);
        const toCell = grid.getCell(toHex);
        
        // Must move from a cell with a piece
        if (!fromCell || !fromCell.piece) {
            return { isValid: false, message: 'No piece to move.' };
        }
        
        // Must move to an existing tile
        if (!toCell) {
            return { isValid: false, message: 'Must move to an existing tile.' };
        }
        
        const piece = fromCell.piece;
        
        // Check piece-specific movement rules
        if (piece.type === 'disc') {
            // Check if it's a simple move to an adjacent empty tile
            if (fromHex.distance(toHex) === 1 && !toCell.piece) {
                return { isValid: true, message: 'Valid disc move.' };
            }
            
            // Check if it's a jump move
            const validJumpMoves = grid.getValidDiscMoves(fromHex);
            const isValidJump = validJumpMoves.some(validHex => validHex.equals(toHex));
            
            if (isValidJump) {
                return { isValid: true, message: 'Valid disc jump.' };
            }
            
            return { isValid: false, message: 'Invalid disc move.' };
        } else if (piece.type === 'ring') {
            // Rings move exactly two tiles away
            if (fromHex.distance(toHex) !== 2) {
                return { isValid: false, message: 'Rings must move exactly two tiles away.' };
            }
            
            // Check if it's a valid ring move
            const validRingMoves = grid.getValidRingMoves(fromHex);
            const isValidRingMove = validRingMoves.some(validHex => validHex.equals(toHex));
            
            if (isValidRingMove) {
                // Can land on empty tile or capture opponent's piece
                if (!toCell.piece || toCell.piece.color !== piece.color) {
                    return { isValid: true, message: 'Valid ring move.' };
                }
            }
            
            return { isValid: false, message: 'Invalid ring move.' };
        }
        
        return { isValid: false, message: 'Unknown piece type.' };
    }

    /**
     * Check if a player has won the game
     * @param {Object} gameState - The current game state
     * @returns {Object} Object with hasWon, winner, and message properties
     */
    static checkWinCondition(gameState) {
        const blackPlayer = gameState.players.black;
        const whitePlayer = gameState.players.white;
        
        // Check if all opponent discs are captured
        if (blackPlayer.discs.total <= 0) {
            return {
                hasWon: true,
                winner: 'white',
                message: 'White wins by capturing all black discs!'
            };
        }
        
        if (whitePlayer.discs.total <= 0) {
            return {
                hasWon: true,
                winner: 'black',
                message: 'Black wins by capturing all white discs!'
            };
        }
        
        // Check if all opponent rings are captured
        if (blackPlayer.rings.total <= 0) {
            return {
                hasWon: true,
                winner: 'white',
                message: 'White wins by capturing all black rings!'
            };
        }
        
        if (whitePlayer.rings.total <= 0) {
            return {
                hasWon: true,
                winner: 'black',
                message: 'Black wins by capturing all white rings!'
            };
        }
        
        // Check if opponent has no pieces on the board
        let blackHasPieces = false;
        let whiteHasPieces = false;
        
        const allCells = gameState.grid.getAllCells();
        for (const [_, data] of allCells) {
            if (data.piece) {
                if (data.piece.color === 'black') {
                    blackHasPieces = true;
                } else if (data.piece.color === 'white') {
                    whiteHasPieces = true;
                }
            }
        }
        
        if (!blackHasPieces) {
            return {
                hasWon: true,
                winner: 'white',
                message: 'White wins by removing all black pieces from the board!'
            };
        }
        
        if (!whiteHasPieces) {
            return {
                hasWon: true,
                winner: 'black',
                message: 'Black wins by removing all white pieces from the board!'
            };
        }
        
        return {
            hasWon: false,
            winner: null,
            message: 'Game in progress.'
        };
    }

    /**
     * Check if the game is a draw
     * @param {Object} gameState - The current game state
     * @returns {Object} Object with isDraw and message properties
     */
    static checkDrawCondition(gameState) {
        // Check for threefold repetition
        const positionKey = gameState.getPositionKey();
        const repetitionCount = gameState.positionCounts.get(positionKey) || 0;
        
        if (repetitionCount >= 3) {
            return {
                isDraw: true,
                message: 'Game ended in a draw due to threefold repetition (Ex Aequo).'
            };
        }
        
        // Check if current player has no valid moves
        if (!gameState.hasValidMoves()) {
            return {
                isDraw: true,
                message: `Game ended in a draw because ${gameState.currentPlayer} has no valid moves (Ex Aequo).`
            };
        }
        
        return {
            isDraw: false,
            message: 'Game in progress.'
        };
    }

    /**
     * Get the rules of Hexaequo as HTML
     * @returns {string} HTML string with game rules
     */
    static getRulesHTML() {
        return `
            <h3>Objective</h3>
            <p>To win the game, a player must accomplish one of the following:</p>
            <ol>
                <li>Capture all of the opponent's discs.</li>
                <li>Capture all of the opponent's rings.</li>
                <li>Remove all of the opponent's pieces from the board.</li>
            </ol>
            <p>If a player cannot make a move on their turn, or if a position is repeated three times, the game ends in a draw ("Ex Aequo").</p>
            
            <h3>Game Materials</h3>
            <ul>
                <li><strong>Tiles:</strong> 9 black and 9 white hexagonal tiles.</li>
                <li><strong>Discs:</strong> 6 black and 6 white discs.</li>
                <li><strong>Rings:</strong> 3 black and 3 white rings.</li>
            </ul>
            
            <h3>Setup</h3>
            <ol>
                <li>Place two black and two white tiles in the initial configuration.</li>
                <li>Place one black disc on a black tile and one white disc on a white tile.</li>
                <li>The player with black pieces goes first.</li>
            </ol>
            
            <h3>Gameplay</h3>
            <p>On your turn, you must perform one of these actions:</p>
            
            <h4>1. Place a Tile</h4>
            <ul>
                <li>The tile must be placed adjacent to at least two existing tiles.</li>
            </ul>
            
            <h4>2. Place a Piece</h4>
            <ul>
                <li>A piece (disc or ring) must be placed on an empty tile of your color.</li>
                <li>To place a ring, you must return one captured disc to your opponent.</li>
            </ul>
            
            <h4>3. Move a Piece</h4>
            <ul>
                <li><strong>Disc Movement:</strong>
                    <ul>
                        <li>A disc can move to an adjacent empty tile.</li>
                        <li>Or it can make one or more consecutive jumps over any piece (friendly or opponent's).</li>
                        <li>When jumping over an opponent's piece, the piece is captured.</li>
                    </ul>
                </li>
                <li><strong>Ring Movement:</strong>
                    <ul>
                        <li>A ring moves exactly two tiles away in any direction.</li>
                        <li>It can capture an opponent's piece by landing on it.</li>
                        <li>It cannot land on a friendly piece.</li>
                    </ul>
                </li>
            </ul>
        `;
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameRules };
} 