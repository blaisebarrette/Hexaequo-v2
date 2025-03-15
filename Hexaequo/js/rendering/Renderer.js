/**
 * Renderer.js
 * Handles 3D rendering of the Hexaequo game using Three.js
 */

class Renderer {
    /**
     * Create a new renderer
     * @param {HTMLCanvasElement} canvas - The canvas element to render to
     * @param {ModelLoader} modelLoader - The model loader for 3D assets
     */
    constructor(canvas, modelLoader) {
        this.canvas = canvas;
        this.modelLoader = modelLoader;
        
        // Game state reference (will be set later)
        this.gameState = null;
        
        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        
        // Game objects
        this.hexSize = 1.0; // Size of hexagons
        this.hexHeight = 0.2; // Height of hex tiles
        this.gridSpacing = 0.9; // Spacing factor between hexagons (< 1 for overlap, 1 for touching, > 1 for gaps)
        this.hexObjects = new Map(); // Map of hex hash to 3D object
        this.validMoveIndicators = []; // Array of valid move indicator objects
        this.selectedHexIndicator = null; // Indicator for selected hex
        
        // Lighting
        this.lights = [];
        
        // Animation
        this.animationMixers = [];
        this.clock = new THREE.Clock();
        
        // Initialize the renderer
        this.init();
    }

    /**
     * Initialize the renderer
     */
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Create camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0, 15, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Create orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2; // Limit to horizontal rotation only
        this.controls.minDistance = 5;
        this.controls.maxDistance = 30;
        this.controls.target.set(0, 0, 0);
        
        // Create raycaster for mouse picking
        this.raycaster = new THREE.Raycaster();
        
        // Add lights
        this.setupLights();
        
        // Add grid helper for development
        // const gridHelper = new THREE.GridHelper(20, 20);
        // this.scene.add(gridHelper);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation loop
        this.animate();
    }

    /**
     * Set up scene lighting
     */
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        
        // Add a soft fill light from the opposite direction
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
        this.lights.push(fillLight);
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(width, height, false);
        
        // Force a re-render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Update animations
        const delta = this.clock.getDelta();
        for (const mixer of this.animationMixers) {
            mixer.update(delta);
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Set the game state reference
     * @param {GameState} gameState - The game state
     */
    setGameState(gameState) {
        this.gameState = gameState;
    }

    /**
     * Update the renderer with the current game state
     */
    update() {
        if (!this.gameState) {
            return;
        }
        
        // Clear existing valid move indicators
        this.clearValidMoveIndicators();
        
        // Update the board
        this.updateBoard();
        
        // Show valid move indicators
        this.showValidMoveIndicators();
        
        // Update camera target to center of board
        this.updateCameraTarget();
    }

    /**
     * Update the 3D board based on the game state
     */
    updateBoard() {
        if (!this.gameState) {
            return;
        }
        
        const grid = this.gameState.grid;
        const cells = grid.getAllCells();
        
        // Track existing hexes to detect removed ones
        const existingHexes = new Set(this.hexObjects.keys());
        
        // Update or create objects for each cell
        for (const [hex, data] of cells) {
            const hexHash = hex.hash();
            existingHexes.delete(hexHash);
            
            // Check if this hex already exists in the scene
            if (this.hexObjects.has(hexHash)) {
                // Update existing hex
                this.updateHexObject(hex, data);
            } else {
                // Create new hex
                this.createHexObject(hex, data);
            }
        }
        
        // Remove any hexes that no longer exist
        for (const hexHash of existingHexes) {
            this.removeHexObject(hexHash);
        }
    }

    /**
     * Create a new hex object in the scene
     * @param {Hex} hex - The hex coordinates
     * @param {Object} data - The cell data
     */
    createHexObject(hex, data) {
        const hexHash = hex.hash();
        const position = this.hexToPosition(hex);
        
        // Create a group for this hex
        const hexGroup = new THREE.Group();
        hexGroup.position.set(position.x, 0, position.z);
        hexGroup.userData = { hex, data };
        
        // Create the tile
        const tileObject = this.createTileObject(data.color);
        hexGroup.add(tileObject);
        
        // Add piece if present
        if (data.piece) {
            const pieceObject = this.createPieceObject(data.piece);
            hexGroup.add(pieceObject);
        }
        
        // Add to scene and track
        this.scene.add(hexGroup);
        this.hexObjects.set(hexHash, hexGroup);
    }

    /**
     * Update an existing hex object
     * @param {Hex} hex - The hex coordinates
     * @param {Object} data - The updated cell data
     */
    updateHexObject(hex, data) {
        const hexHash = hex.hash();
        const hexGroup = this.hexObjects.get(hexHash);
        
        if (!hexGroup) {
            return;
        }
        
        // Update the userData
        hexGroup.userData.data = data;
        
        // Check if we need to update the piece
        const existingPiece = hexGroup.children.find(child => child.userData && child.userData.isPiece);
        
        if (data.piece) {
            // Should have a piece
            if (existingPiece) {
                // Check if the piece type or color changed
                if (existingPiece.userData.type !== data.piece.type || 
                    existingPiece.userData.color !== data.piece.color) {
                    // Remove old piece and add new one
                    hexGroup.remove(existingPiece);
                    const pieceObject = this.createPieceObject(data.piece);
                    hexGroup.add(pieceObject);
                }
            } else {
                // Add new piece
                const pieceObject = this.createPieceObject(data.piece);
                hexGroup.add(pieceObject);
            }
        } else if (existingPiece) {
            // Remove piece if it shouldn't be there
            hexGroup.remove(existingPiece);
        }
    }

    /**
     * Remove a hex object from the scene
     * @param {string} hexHash - The hex hash
     */
    removeHexObject(hexHash) {
        const hexGroup = this.hexObjects.get(hexHash);
        
        if (hexGroup) {
            // Remove from scene
            this.scene.remove(hexGroup);
            
            // Dispose of geometries and materials
            hexGroup.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            
            // Remove from tracking
            this.hexObjects.delete(hexHash);
        }
    }

    /**
     * Create a tile 3D object
     * @param {string} color - The tile color ('black' or 'white')
     * @returns {THREE.Mesh} The tile mesh
     */
    createTileObject(color) {
        // Check if we have a model for the tile
        if (this.modelLoader.isLoaded(`tile_${color}`)) {
            const model = this.modelLoader.getModel(`tile_${color}`).clone();
            model.userData = { isTile: true, color };
            return model;
        }
        
        // Fallback to geometry if model not available
        const geometry = new THREE.CylinderGeometry(this.hexSize, this.hexSize, this.hexHeight, 6);
        const material = new THREE.MeshStandardMaterial({
            color: color === 'black' ? 0x222222 : 0xffffff,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI / 6; // Align flat sides with coordinate system
        mesh.position.y = this.hexHeight / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { isTile: true, color };
        
        return mesh;
    }

    /**
     * Create a piece 3D object
     * @param {Object} piece - The piece data
     * @returns {THREE.Object3D} The piece object
     */
    createPieceObject(piece) {
        const { type, color } = piece;
        const modelKey = `${type}_${color}`;
        
        // Check if we have a model for this piece
        if (this.modelLoader.isLoaded(modelKey)) {
            const model = this.modelLoader.getModel(modelKey).clone();
            model.userData = { isPiece: true, type, color };
            return model;
        }
        
        // Fallback to geometry if model not available
        let geometry;
        if (type === 'disc') {
            geometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 32);
        } else if (type === 'ring') {
            const outerRadius = 0.4;
            const innerRadius = 0.25;
            geometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
            // Convert flat ring to 3D ring
            const extrudeSettings = {
                depth: 0.1,
                bevelEnabled: false
            };
            geometry = new THREE.ExtrudeGeometry(
                new THREE.Shape()
                    .absarc(0, 0, outerRadius, 0, Math.PI * 2)
                    .holes.push(
                        new THREE.Path().absarc(0, 0, innerRadius, 0, Math.PI * 2, true)
                    ),
                extrudeSettings
            );
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: color === 'black' ? 0x222222 : 0xffffff,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = this.hexHeight + 0.1; // Position above tile
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { isPiece: true, type, color };
        
        return mesh;
    }

    /**
     * Show indicators for valid moves
     */
    showValidMoveIndicators() {
        if (!this.gameState) {
            return;
        }
        
        // Clear existing indicators
        this.clearValidMoveIndicators();
        
        // Create indicators for each valid move
        for (const hex of this.gameState.validMoves) {
            const position = this.hexToPosition(hex);
            let geometry;
            let isDiscAction = false;
            
            // Check if the action is related to discs
            if (this.gameState.selectedAction === 'placeDisc' || 
                (this.gameState.selectedAction === 'movePiece' && 
                 this.gameState.selectedHex && 
                 this.gameState.grid.getCell(this.gameState.selectedHex)?.piece?.type === 'disc')) {
                // Create a disc-shaped indicator
                geometry = new THREE.CylinderGeometry(this.hexSize * 0.4, this.hexSize * 0.4, 0.25, 32);
                isDiscAction = true;
            } else {
                // Use the original hexagonal indicator for other actions
                geometry = new THREE.CylinderGeometry(this.hexSize * 0.95, this.hexSize * 0.95, 0.25, 6);
            }
            
            const material = new THREE.MeshBasicMaterial({
                color: 0x00cc66,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            
            const indicator = new THREE.Mesh(geometry, material);
            
            // Position the indicator higher for disc actions
            if (isDiscAction) {
                indicator.position.set(position.x, this.hexHeight + 0.05, position.z); // 0.125 higher than before
            } else {
                indicator.position.set(position.x, this.hexHeight - 0.075, position.z);
            }
            
            indicator.rotation.y = Math.PI / 3; // Align with tiles
            indicator.userData = { isValidMoveIndicator: true, hex };
            
            // Add to scene and track
            this.scene.add(indicator);
            this.validMoveIndicators.push(indicator);
        }
    }

    /**
     * Clear all valid move indicators
     */
    clearValidMoveIndicators() {
        for (const indicator of this.validMoveIndicators) {
            this.scene.remove(indicator);
            
            if (indicator.geometry) {
                indicator.geometry.dispose();
            }
            
            if (indicator.material) {
                indicator.material.dispose();
            }
        }
        
        this.validMoveIndicators = [];
    }

    /**
     * Show indicator for selected hex
     * @param {Hex} hex - The selected hex
     */
    showSelectedHexIndicator(hex) {
        // Clear existing indicator
        this.clearSelectedHexIndicator();
        
        if (!hex) {
            return;
        }
        
        const position = this.hexToPosition(hex);
        
        // Create indicator geometry
        const geometry = new THREE.CylinderGeometry(this.hexSize * 1.1, this.hexSize * 1.1, 0.05, 6);
        const material = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.7,
            wireframe: true
        });
        
        const indicator = new THREE.Mesh(geometry, material);
        indicator.position.set(position.x, this.hexHeight + 0.1, position.z);
        indicator.rotation.y = Math.PI / 6;
        
        // Add to scene and track
        this.scene.add(indicator);
        this.selectedHexIndicator = indicator;
    }

    /**
     * Clear the selected hex indicator
     */
    clearSelectedHexIndicator() {
        if (this.selectedHexIndicator) {
            this.scene.remove(this.selectedHexIndicator);
            
            if (this.selectedHexIndicator.geometry) {
                this.selectedHexIndicator.geometry.dispose();
            }
            
            if (this.selectedHexIndicator.material) {
                this.selectedHexIndicator.material.dispose();
            }
            
            this.selectedHexIndicator = null;
        }
    }

    /**
     * Update the camera target to the center of the board
     */
    updateCameraTarget() {
        if (!this.gameState || !this.gameState.grid) {
            return;
        }
        
        const center = this.gameState.grid.getCenter();
        const position = this.hexToPosition({ q: center.q, r: center.r });
        
        // Smoothly transition the camera target
        const targetPosition = new THREE.Vector3(position.x, 0, position.z);
        this.controls.target.lerp(targetPosition, 0.1);
    }

    /**
     * Convert hex coordinates to 3D position
     * @param {Hex} hex - The hex coordinates
     * @returns {THREE.Vector3} - The 3D position
     */
    hexToPosition(hex) {
        // Using axial coordinates for pointy-top hexagons
        // Multiply by gridSpacing to control the gap between hexagons (< 1 for overlap, 1 for touching, > 1 for gaps)
        const x = this.hexSize * this.gridSpacing * (Math.sqrt(3) * hex.q + Math.sqrt(3)/2 * hex.r);
        const z = this.hexSize * this.gridSpacing * (3/2 * hex.r);
        return new THREE.Vector3(x, 0, z);
    }

    /**
     * Convert 3D position to hex coordinates
     * @param {THREE.Vector3} position - The 3D position
     * @returns {Hex} - The hex coordinates
     */
    positionToHex(position) {
        // Inverse of hexToPosition, accounting for gridSpacing
        const q = (Math.sqrt(3)/3 * position.x - 1/3 * position.z) / (this.hexSize * this.gridSpacing);
        const r = (2/3 * position.z) / (this.hexSize * this.gridSpacing);
        
        // Round to the nearest hex coordinates
        const roundedQ = Math.round(q);
        const roundedR = Math.round(r);
        
        return new Hex(roundedQ, roundedR);
    }

    /**
     * Handle mouse move event for hover effects
     * @param {MouseEvent} event - The mouse event
     */
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.canvas.clientHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // Reset cursor
        this.canvas.style.cursor = 'default';
        
        // Find the first hex object that was intersected
        for (const intersect of intersects) {
            let object = intersect.object;
            
            // Traverse up to find the hex group
            while (object && object.parent !== this.scene) {
                object = object.parent;
            }
            
            if (object && object.userData && object.userData.hex) {
                // Set cursor to pointer for interactive hexes
                this.canvas.style.cursor = 'pointer';
                break;
            }
        }
    }

    /**
     * Handle mouse click event for hex selection
     * @param {MouseEvent} event - The mouse event
     * @returns {Hex|null} The selected hex or null if none was selected
     */
    onMouseClick(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.canvas.clientHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // Find the first hex object that was intersected
        for (const intersect of intersects) {
            let object = intersect.object;
            
            // Check if it's a valid move indicator
            if (object.userData && object.userData.isValidMoveIndicator) {
                return object.userData.hex;
            }
            
            // Traverse up to find the hex group
            while (object && object.parent !== this.scene) {
                object = object.parent;
            }
            
            if (object && object.userData && object.userData.hex) {
                return object.userData.hex;
            }
        }
        
        return null;
    }

    /**
     * Rotate the camera left by a fixed amount
     */
    rotateLeft() {
        const currentPosition = new THREE.Vector3().copy(this.camera.position);
        const target = new THREE.Vector3().copy(this.controls.target);
        
        // Calculate the angle to rotate (45 degrees)
        const angle = Math.PI / 4;
        
        // Rotate the position around the target
        const relativePosition = new THREE.Vector3().subVectors(currentPosition, target);
        const distance = relativePosition.length();
        
        // Calculate new position
        const theta = Math.atan2(relativePosition.x, relativePosition.z) + angle;
        const newX = target.x + distance * Math.sin(theta);
        const newZ = target.z + distance * Math.cos(theta);
        
        // Animate the camera movement
        this.animateCamera(newX, currentPosition.y, newZ);
    }

    /**
     * Rotate the camera right by a fixed amount
     */
    rotateRight() {
        const currentPosition = new THREE.Vector3().copy(this.camera.position);
        const target = new THREE.Vector3().copy(this.controls.target);
        
        // Calculate the angle to rotate (45 degrees)
        const angle = -Math.PI / 4;
        
        // Rotate the position around the target
        const relativePosition = new THREE.Vector3().subVectors(currentPosition, target);
        const distance = relativePosition.length();
        
        // Calculate new position
        const theta = Math.atan2(relativePosition.x, relativePosition.z) + angle;
        const newX = target.x + distance * Math.sin(theta);
        const newZ = target.z + distance * Math.cos(theta);
        
        // Animate the camera movement
        this.animateCamera(newX, currentPosition.y, newZ);
    }

    /**
     * Zoom the camera in
     */
    zoomIn() {
        const currentPosition = new THREE.Vector3().copy(this.camera.position);
        const target = new THREE.Vector3().copy(this.controls.target);
        
        // Calculate direction vector from target to camera
        const direction = new THREE.Vector3().subVectors(currentPosition, target).normalize();
        
        // Calculate new position (75% of current distance)
        const currentDistance = currentPosition.distanceTo(target);
        const newDistance = Math.max(this.controls.minDistance, currentDistance * 0.75);
        
        const newPosition = new THREE.Vector3().copy(target).add(direction.multiplyScalar(newDistance));
        
        // Animate the camera movement
        this.animateCamera(newPosition.x, newPosition.y, newPosition.z);
    }

    /**
     * Zoom the camera out
     */
    zoomOut() {
        const currentPosition = new THREE.Vector3().copy(this.camera.position);
        const target = new THREE.Vector3().copy(this.controls.target);
        
        // Calculate direction vector from target to camera
        const direction = new THREE.Vector3().subVectors(currentPosition, target).normalize();
        
        // Calculate new position (133% of current distance)
        const currentDistance = currentPosition.distanceTo(target);
        const newDistance = Math.min(this.controls.maxDistance, currentDistance * 1.33);
        
        const newPosition = new THREE.Vector3().copy(target).add(direction.multiplyScalar(newDistance));
        
        // Animate the camera movement
        this.animateCamera(newPosition.x, newPosition.y, newPosition.z);
    }

    /**
     * Reset the camera to the default view
     */
    resetView() {
        // Animate to default position
        this.animateCamera(0, 15, 15);
        
        // Reset target to center
        if (this.gameState && this.gameState.grid) {
            const center = this.gameState.grid.getCenter();
            const position = this.hexToPosition({ q: center.q, r: center.r });
            this.controls.target.set(position.x, 0, position.z);
        } else {
            this.controls.target.set(0, 0, 0);
        }
    }

    /**
     * Animate the camera to a new position
     * @param {number} x - The target x position
     * @param {number} y - The target y position
     * @param {number} z - The target z position
     */
    animateCamera(x, y, z) {
        const startPosition = new THREE.Vector3().copy(this.camera.position);
        const endPosition = new THREE.Vector3(x, y, z);
        
        const duration = 500; // milliseconds
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smoother animation
            const easeProgress = this.easeInOutQuad(progress);
            
            // Interpolate position
            const newPosition = new THREE.Vector3().lerpVectors(startPosition, endPosition, easeProgress);
            this.camera.position.copy(newPosition);
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    /**
     * Easing function for smooth animations
     * @param {number} t - Progress from 0 to 1
     * @returns {number} Eased value
     */
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
} 