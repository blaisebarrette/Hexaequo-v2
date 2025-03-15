/**
 * HexGrid.js
 * Implements a hexagonal grid system using axial coordinates (q,r)
 * Based on the concepts from https://www.redblobgames.com/grids/hexagons/
 */

class Hex {
    /**
     * Create a hex with axial coordinates
     * @param {number} q - q coordinate (horizontal axis)
     * @param {number} r - r coordinate (diagonal axis)
     */
    constructor(q, r) {
        this.q = q;
        this.r = r;
    }

    /**
     * Get the cube coordinate s (derived from q and r)
     * @returns {number} s coordinate
     */
    get s() {
        return -this.q - this.r;
    }

    /**
     * Add two hexes
     * @param {Hex} other - Hex to add
     * @returns {Hex} New hex with coordinates added
     */
    add(other) {
        return new Hex(this.q + other.q, this.r + other.r);
    }

    /**
     * Subtract a hex from this hex
     * @param {Hex} other - Hex to subtract
     * @returns {Hex} New hex with coordinates subtracted
     */
    subtract(other) {
        return new Hex(this.q - other.q, this.r - other.r);
    }

    /**
     * Multiply hex by a scalar
     * @param {number} k - Scalar to multiply by
     * @returns {Hex} New hex with coordinates multiplied
     */
    multiply(k) {
        return new Hex(this.q * k, this.r * k);
    }

    /**
     * Calculate the length of a hex (distance from origin)
     * @returns {number} Length of the hex
     */
    length() {
        return Math.floor((Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2);
    }

    /**
     * Calculate the distance between two hexes
     * @param {Hex} other - Target hex
     * @returns {number} Distance between hexes
     */
    distance(other) {
        return this.subtract(other).length();
    }

    /**
     * Check if two hexes are equal
     * @param {Hex} other - Hex to compare with
     * @returns {boolean} True if hexes are equal
     */
    equals(other) {
        return this.q === other.q && this.r === other.r;
    }

    /**
     * Get a string representation of the hex
     * @returns {string} String representation
     */
    toString() {
        return `Hex(${this.q}, ${this.r})`;
    }

    /**
     * Create a unique hash for this hex for use as an object key
     * @returns {string} Hash string
     */
    hash() {
        return `${this.q},${this.r}`;
    }

    /**
     * Create a hex from a hash string
     * @param {string} hash - Hash string in format "q,r"
     * @returns {Hex} New hex from hash
     */
    static fromHash(hash) {
        const [q, r] = hash.split(',').map(Number);
        return new Hex(q, r);
    }

    /**
     * Round a fractional hex to the nearest integer hex
     * @param {number} q - Fractional q coordinate
     * @param {number} r - Fractional r coordinate
     * @returns {Hex} Rounded hex
     */
    static round(q, r) {
        let s = -q - r;
        
        let qi = Math.round(q);
        let ri = Math.round(r);
        let si = Math.round(s);
        
        const q_diff = Math.abs(qi - q);
        const r_diff = Math.abs(ri - r);
        const s_diff = Math.abs(si - s);
        
        if (q_diff > r_diff && q_diff > s_diff) {
            qi = -ri - si;
        } else if (r_diff > s_diff) {
            ri = -qi - si;
        }
        
        return new Hex(qi, ri);
    }
}

// Direction vectors for neighboring hexes in axial coordinates
const HEX_DIRECTIONS = [
    new Hex(1, 0),   // East
    new Hex(1, -1),  // Northeast
    new Hex(0, -1),  // Northwest
    new Hex(-1, 0),  // West
    new Hex(-1, 1),  // Southwest
    new Hex(0, 1)    // Southeast
];

class HexGrid {
    /**
     * Create a new hex grid
     */
    constructor() {
        // Map to store the grid cells
        this.cells = new Map();
        
        // Track the bounds of the grid for camera centering
        this.minQ = 0;
        this.maxQ = 0;
        this.minR = 0;
        this.maxR = 0;
    }

    /**
     * Get a cell at the specified coordinates
     * @param {Hex} hex - Hex coordinates
     * @returns {Object|null} Cell data or null if not found
     */
    getCell(hex) {
        return this.cells.get(hex.hash()) || null;
    }

    /**
     * Set a cell at the specified coordinates
     * @param {Hex} hex - Hex coordinates
     * @param {Object} data - Cell data
     */
    setCell(hex, data) {
        this.cells.set(hex.hash(), data);
        
        // Update grid bounds
        this.minQ = Math.min(this.minQ, hex.q);
        this.maxQ = Math.max(this.maxQ, hex.q);
        this.minR = Math.min(this.minR, hex.r);
        this.maxR = Math.max(this.maxR, hex.r);
    }

    /**
     * Remove a cell at the specified coordinates
     * @param {Hex} hex - Hex coordinates
     * @returns {boolean} True if cell was removed
     */
    removeCell(hex) {
        return this.cells.delete(hex.hash());
    }

    /**
     * Check if a cell exists at the specified coordinates
     * @param {Hex} hex - Hex coordinates
     * @returns {boolean} True if cell exists
     */
    hasCell(hex) {
        return this.cells.has(hex.hash());
    }

    /**
     * Get all cells in the grid
     * @returns {Array} Array of [hex, data] pairs
     */
    getAllCells() {
        return Array.from(this.cells.entries()).map(([hash, data]) => [Hex.fromHash(hash), data]);
    }

    /**
     * Get all neighboring cells of a hex
     * @param {Hex} hex - Center hex
     * @returns {Array} Array of [neighbor_hex, data] pairs for existing neighbors
     */
    getNeighbors(hex) {
        return HEX_DIRECTIONS.map(dir => {
            const neighbor = hex.add(dir);
            const data = this.getCell(neighbor);
            return data ? [neighbor, data] : null;
        }).filter(Boolean);
    }

    /**
     * Get all neighboring hexes of a hex (whether they exist in the grid or not)
     * @param {Hex} hex - Center hex
     * @returns {Array} Array of neighboring hexes
     */
    getNeighborHexes(hex) {
        return HEX_DIRECTIONS.map(dir => hex.add(dir));
    }

    /**
     * Get the center point of the grid
     * @returns {Object} Center point {q, r}
     */
    getCenter() {
        return {
            q: (this.minQ + this.maxQ) / 2,
            r: (this.minR + this.maxR) / 2
        };
    }

    /**
     * Initialize the grid with the starting configuration for Hexaequo
     */
    initializeGame() {
        // Clear any existing cells
        this.cells.clear();
        
        // Reset bounds
        this.minQ = 0;
        this.maxQ = 0;
        this.minR = 0;
        this.maxR = 0;
        
        // Initial 2x2 grid of tiles
        this.setCell(new Hex(0, 0), { type: 'tile', color: 'black' });
        this.setCell(new Hex(1, 0), { type: 'tile', color: 'white' });
        this.setCell(new Hex(0, 1), { type: 'tile', color: 'white' });
        this.setCell(new Hex(1, -1), { type: 'tile', color: 'black' });
        
        // Initial discs - placing them on the opposite corners
        this.setCell(new Hex(1, -1), { type: 'tile', color: 'black', piece: { type: 'disc', color: 'black' } });
        this.setCell(new Hex(0, 1), { type: 'tile', color: 'white', piece: { type: 'disc', color: 'white' } });
    }

    /**
     * Check if a hex is a valid position to place a new tile
     * @param {Hex} hex - Hex to check
     * @returns {boolean} True if position is valid
     */
    isValidTilePlacement(hex) {
        // Can't place where a tile already exists
        if (this.hasCell(hex)) {
            return false;
        }
        
        // Must be adjacent to at least two existing tiles
        const neighbors = this.getNeighborHexes(hex);
        const existingNeighbors = neighbors.filter(n => this.hasCell(n));
        
        return existingNeighbors.length >= 2;
    }

    /**
     * Get all valid positions for placing a new tile
     * @param {string} color - Color of the tile to place
     * @returns {Array} Array of valid hex positions
     */
    getValidTilePlacements(color) {
        const allCells = this.getAllCells();
        const existingHexes = allCells.map(([hex, _]) => hex);
        
        // Get all neighbors of existing hexes
        const allNeighbors = new Set();
        existingHexes.forEach(hex => {
            this.getNeighborHexes(hex).forEach(n => {
                if (!this.hasCell(n)) {
                    allNeighbors.add(n.hash());
                }
            });
        });
        
        // Filter for valid placements
        return Array.from(allNeighbors).map(Hex.fromHash)
            .filter(hex => this.isValidTilePlacement(hex));
    }

    /**
     * Check if a hex is a valid position to place a piece
     * @param {Hex} hex - Hex to check
     * @param {string} pieceColor - Color of the piece to place
     * @returns {boolean} True if position is valid
     */
    isValidPiecePlacement(hex, pieceColor) {
        const cell = this.getCell(hex);
        
        // Must be on an existing tile of the same color
        if (!cell || cell.color !== pieceColor) {
            return false;
        }
        
        // Tile must be empty (no piece on it)
        return !cell.piece;
    }

    /**
     * Get all valid positions for placing a new piece
     * @param {string} pieceColor - Color of the piece to place
     * @returns {Array} Array of valid hex positions
     */
    getValidPiecePlacements(pieceColor) {
        return this.getAllCells()
            .filter(([_, data]) => data.color === pieceColor && !data.piece)
            .map(([hex, _]) => hex);
    }

    /**
     * Get the hexes that were jumped over during a disc move
     * @param {Hex} fromHex - Starting position
     * @param {Hex} toHex - Destination position
     * @returns {Array} Array of hexes that were jumped over
     */
    getJumpedHexes(fromHex, toHex) {
        const jumpedHexes = [];
        const vector = toHex.subtract(fromHex);
        const distance = fromHex.distance(toHex);
        
        // Calculate the direction vector
        const dirQ = Math.round(vector.q / distance);
        const dirR = Math.round(vector.r / distance);
        const direction = new Hex(dirQ, dirR);
        
        // Get all hexes along the jump path
        let currentHex = fromHex;
        while (!currentHex.equals(toHex)) {
            currentHex = currentHex.add(direction);
            if (!currentHex.equals(toHex)) {
                jumpedHexes.push(currentHex);
            }
        }
        
        return jumpedHexes;
    }

    /**
     * Get valid moves for a disc at the specified position
     * @param {Hex} hex - Position of the disc
     * @returns {Array} Array of valid destination hexes
     */
    getValidDiscMoves(hex) {
        const cell = this.getCell(hex);
        if (!cell || !cell.piece || cell.piece.type !== 'disc') {
            return [];
        }
        
        const pieceColor = cell.piece.color;
        const validMoves = new Set();
        
        // Simple moves to adjacent empty tiles
        this.getNeighborHexes(hex).forEach(neighbor => {
            const neighborCell = this.getCell(neighbor);
            if (neighborCell && !neighborCell.piece) {
                validMoves.add(neighbor.hash());
            }
        });
        
        // Jump moves (can be chained)
        this._findJumpMoves(hex, pieceColor, new Set([hex.hash()]), validMoves);
        
        return Array.from(validMoves).map(Hex.fromHash);
    }

    /**
     * Recursively find all possible jump moves for a disc
     * @param {Hex} hex - Current position
     * @param {string} pieceColor - Color of the jumping piece
     * @param {Set} visited - Set of visited hex hashes
     * @param {Set} validMoves - Set of valid destination hex hashes
     */
    _findJumpMoves(hex, pieceColor, visited, validMoves) {
        // Check each direction for a jump
        HEX_DIRECTIONS.forEach(dir => {
            const jumpedHex = hex.add(dir);
            const jumpedCell = this.getCell(jumpedHex);
            
            // There must be a piece to jump over
            if (jumpedCell && jumpedCell.piece) {
                const landingHex = jumpedHex.add(dir);
                const landingCell = this.getCell(landingHex);
                
                // Landing spot must be an empty tile
                if (landingCell && !landingCell.piece && !visited.has(landingHex.hash())) {
                    validMoves.add(landingHex.hash());
                    visited.add(landingHex.hash());
                    
                    // Recursively find more jumps from this landing spot
                    this._findJumpMoves(landingHex, pieceColor, visited, validMoves);
                }
            }
        });
    }

    /**
     * Get valid moves for a ring at the specified position
     * @param {Hex} hex - Position of the ring
     * @returns {Array} Array of valid destination hexes
     */
    getValidRingMoves(hex) {
        const cell = this.getCell(hex);
        if (!cell || !cell.piece || cell.piece.type !== 'ring') {
            return [];
        }
        
        const pieceColor = cell.piece.color;
        const validMoves = [];
        
        // Rings move exactly two tiles away
        // For each direction, check if there's a valid landing spot
        HEX_DIRECTIONS.forEach(dir => {
            const landingHex = hex.add(dir).add(dir);
            const landingCell = this.getCell(landingHex);
            
            // Landing spot must be a tile
            if (landingCell) {
                // Can land on empty tile or capture opponent's piece
                if (!landingCell.piece || 
                    (landingCell.piece && landingCell.piece.color !== pieceColor)) {
                    validMoves.push(landingHex);
                }
            }
        });
        
        return validMoves;
    }

    /**
     * Convert from axial coordinates to 3D coordinates for rendering
     * @param {Hex} hex - Hex to convert
     * @param {number} size - Size of the hex
     * @returns {Object} 3D coordinates {x, y, z}
     */
    hexToPixel3D(hex, size) {
        const x = size * (Math.sqrt(3) * hex.q + Math.sqrt(3) / 2 * hex.r);
        const z = size * (3/2 * hex.r);
        return { x, y: 0, z };
    }

    /**
     * Convert from 3D coordinates to the nearest hex
     * @param {Object} point - 3D point {x, y, z}
     * @param {number} size - Size of the hex
     * @returns {Hex} Nearest hex
     */
    pixelToHex3D(point, size) {
        const q = (Math.sqrt(3)/3 * point.x - 1/3 * point.z) / size;
        const r = (2/3 * point.z) / size;
        return Hex.round(q, r);
    }
}

// Export the classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Hex, HexGrid, HEX_DIRECTIONS };
} 