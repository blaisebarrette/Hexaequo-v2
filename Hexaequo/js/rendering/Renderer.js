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
        
        // Preview objects
        this.previewTile = null; // Preview tile for placement
        this.previewHex = null; // Current hex where preview is shown
        this.confirmationUI = null; // Group containing confirmation UI elements
        
        // Valid placement hitboxes
        this.placementHitboxes = new Map(); // Map of hex hash to hitbox object
        
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
        this.updateSceneTheme();
        
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
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Listen for theme changes
        this.setupThemeListener();
        
        // Start animation loop
        this.animate();
    }

    /**
     * Set up scene lighting
     */
    setupLights() {
        // Remove existing lights
        this.lights.forEach(light => this.scene.remove(light));
        this.lights = [];
        
        // Get theme
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(
            isDarkTheme ? 0x333333 : 0xffffff,
            isDarkTheme ? 0.3 : 0.5
        );
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(
            isDarkTheme ? 0xcccccc : 0xffffff,
            isDarkTheme ? 0.7 : 0.8
        );
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
        const fillLight = new THREE.DirectionalLight(
            isDarkTheme ? 0x666666 : 0xffffff,
            isDarkTheme ? 0.2 : 0.3
        );
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
        this.lights.push(fillLight);
    }

    /**
     * Update scene theme based on current theme
     */
    updateSceneTheme() {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        this.scene.background = new THREE.Color(isDarkTheme ? 0x121212 : 0xf0f0f0);
        this.setupLights();
    }

    /**
     * Set up theme change listener
     */
    setupThemeListener() {
        // Create an observer to watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    this.updateSceneTheme();
                }
            });
        });

        // Start observing theme changes
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
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
        
        // Clear selected hex indicator
        this.clearSelectedHexIndicator();
        
        // Update the board
        this.updateBoard();
        
        // Show valid move indicators
        this.showValidMoveIndicators();
        
        // Update placement hitboxes
        this.updatePlacementHitboxes();
        
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
            this.applyTextureScaling(model, 0.1); // Scale tile textures by 2x (making them smaller)
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
            this.applyTextureScaling(model, 0.1); // Scale piece textures by 2x (making them smaller)
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
        
        // Get checkbox state for opacity
        const showValidMovesCheckbox = document.getElementById('show-valid-moves');
        const opacity = showValidMovesCheckbox?.checked ? 0.2 : 0;
        
        // Create indicators for each valid move
        for (const hex of this.gameState.validMoves) {
            const position = this.hexToPosition(hex);
            let geometry;
            let isDiscAction = false;
            let isRingAction = false;
            
            // Check if the action is related to discs or rings
            if (this.gameState.selectedAction === 'placeDisc' || 
                (this.gameState.selectedAction === 'movePiece' && 
                 this.gameState.selectedHex && 
                 this.gameState.grid.getCell(this.gameState.selectedHex)?.piece?.type === 'disc')) {
                // Create a disc-shaped indicator
                geometry = new THREE.CylinderGeometry(this.hexSize * 0.4, this.hexSize * 0.4, 0.25, 32);
                isDiscAction = true;
            } else if (this.gameState.selectedAction === 'placeRing' ||
                     (this.gameState.selectedAction === 'movePiece' && 
                      this.gameState.selectedHex && 
                      this.gameState.grid.getCell(this.gameState.selectedHex)?.piece?.type === 'ring')) {
                // Create a ring-shaped indicator
                const outerRadius = this.hexSize * 0.6;
                const innerRadius = this.hexSize * 0.4;
                const shape = new THREE.Shape()
                    .absarc(0, 0, outerRadius, 0, Math.PI * 2);
                shape.holes.push(
                    new THREE.Path().absarc(0, 0, innerRadius, 0, Math.PI * 2, true)
                );
                const extrudeSettings = {
                    depth: 0.25,
                    bevelEnabled: false
                };
                geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                isRingAction = true;
            } else {
                // Use the original hexagonal indicator for other actions
                geometry = new THREE.CylinderGeometry(this.hexSize * 0.95, this.hexSize * 0.95, 0.25, 6);
            }
            
            // Create material with opacity based on checkbox state
            const material = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: opacity,
                roughness: 0.5,
                metalness: 0.5
            });
            
            const indicator = new THREE.Mesh(geometry, material);
            
            // Position the indicator based on the type
            if (isDiscAction || isRingAction) {
                indicator.position.set(position.x, this.hexHeight + (isRingAction ? 0.175 : 0.05), position.z);
                if (isRingAction) {
                    indicator.rotation.x = Math.PI / 2; // Lay the ring flat
                }
            } else {
                indicator.position.set(position.x, this.hexHeight - 0.075, position.z);
            }
            
            if (!isRingAction) {
                indicator.rotation.y = Math.PI / 3; // Align with tiles (except for rings)
            }
            
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
        // Update mouse position
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        console.log('Click detected at:', { x: this.mouse.x, y: this.mouse.y });
        
        // Update the raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // First check for UI interactions
        if (this.confirmationUI) {
            console.log('Checking confirmation UI intersection...');
            const uiAction = this.checkConfirmationUIIntersection(this.mouse);
            console.log('UI Action result:', uiAction);
            
            if (uiAction) {
                console.log('UI interaction detected:', uiAction);
                return uiAction;
            }
        }
        
        // Then check for hitbox intersections
        const hitboxIntersects = this.raycaster.intersectObjects(Array.from(this.placementHitboxes.values()));
        console.log('Hitbox intersections:', hitboxIntersects.length);
        
        if (hitboxIntersects.length > 0) {
            const hitbox = hitboxIntersects[0].object;
            console.log('Hitbox clicked:', hitbox.userData);
            return hitbox.userData.hex;
        }
        
        // Finally check for hex intersections
        const hexIntersects = this.raycaster.intersectObjects(this.scene.children, true);
        console.log('Hex intersections:', hexIntersects.length);
        
        if (hexIntersects.length > 0) {
            let object = hexIntersects[0].object;
            while (object.parent && !object.userData.hex) {
                object = object.parent;
            }
            if (object.userData.hex) {
                console.log('Hex clicked:', object.userData.hex);
                return object.userData.hex;
            }
        }
        
        console.log('No valid intersection found');
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

    /**
     * Apply texture scaling to a 3D model
     * @param {THREE.Object3D} model - The 3D model to scale textures for
     * @param {number} scale - The scale factor for the textures (default: 1.0)
     */
    applyTextureScaling(model, scale = 1.0) {
        model.traverse((node) => {
            if (node.isMesh && node.material) {
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                
                materials.forEach(material => {
                    const applyToTexture = (texture) => {
                        if (texture) {
                            texture.repeat.set(1/scale, 1/scale);
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            texture.offset.set(0, 0);
                            texture.center.set(0.5, 0.5);
                            texture.minFilter = THREE.LinearMipMapLinearFilter;
                            texture.magFilter = THREE.LinearFilter;
                            texture.anisotropy = 16;
                            texture.needsUpdate = true;
                        }
                    };

                    // Apply to all texture types
                    applyToTexture(material.map);
                    applyToTexture(material.normalMap);
                    applyToTexture(material.roughnessMap);
                    applyToTexture(material.metalnessMap);
                    applyToTexture(material.aoMap);
                    applyToTexture(material.emissiveMap);

                    // Ensure material updates
                    material.needsUpdate = true;
                });
            }
        });
    }

    /**
     * Show a preview tile at the specified hex
     * @param {Hex} hex - The hex to show the preview at
     * @param {string} color - Color of the preview tile
     */
    showPreviewTile(hex, color) {
        // Remove existing preview if any
        this.clearPreviewTile();
        
        // Create preview tile
        const tileObject = this.createTileObject(color);
        const position = this.hexToPosition(hex);
        
        // Set position and opacity
        tileObject.position.set(position.x, this.hexHeight + 0.5, position.z); // Position above final placement
        tileObject.traverse((child) => {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    // Handle multiple materials
                    child.material = child.material.map(mat => {
                        const newMat = mat.clone();
                        newMat.transparent = true;
                        newMat.opacity = 0.5;
                        return newMat;
                    });
                } else {
                    // Handle single material
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            }
        });
        
        this.previewTile = tileObject;
        this.previewHex = hex;
        this.scene.add(tileObject);
        
        // Create and show confirmation UI
        this.showConfirmationUI(position);
    }

    /**
     * Clear the preview tile and confirmation UI
     */
    clearPreviewTile() {
        if (this.previewTile) {
            this.scene.remove(this.previewTile);
            this.previewTile = null;
            this.previewHex = null;
        }
        this.clearConfirmationUI();
    }

    /**
     * Show confirmation UI elements
     * @param {Object} position - Position to show the UI at
     */
    showConfirmationUI(position) {
        // Remove existing UI if any
        this.clearConfirmationUI();
        
        // Create a group for the UI elements
        const uiGroup = new THREE.Group();
        
        // Create checkmark sprite using data URL
        const checkmarkDataURL = 'data:image/svg+xml;base64,' + btoa(`<?xml version="1.0" encoding="UTF-8"?>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#4CAF50"/>
            </svg>`);
        
        const checkmarkTexture = new THREE.TextureLoader().load(checkmarkDataURL);
        const checkmarkMaterial = new THREE.SpriteMaterial({ 
            map: checkmarkTexture,
            transparent: true,
            opacity: 0.9,
            depthTest: false // Ensure UI is always visible
        });
        const checkmark = new THREE.Sprite(checkmarkMaterial);
        checkmark.scale.set(0.7, 0.7, 1);
        checkmark.position.set(position.x + 1.0, this.hexHeight + 1.5, position.z);
        checkmark.userData = { type: 'confirm' };
        
        // Create cancel sprite using data URL
        const cancelDataURL = 'data:image/svg+xml;base64,' + btoa(`<?xml version="1.0" encoding="UTF-8"?>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="#F44336"/>
            </svg>`);
        
        const cancelTexture = new THREE.TextureLoader().load(cancelDataURL);
        const cancelMaterial = new THREE.SpriteMaterial({ 
            map: cancelTexture,
            transparent: true,
            opacity: 0.9,
            depthTest: false // Ensure UI is always visible
        });
        const cancel = new THREE.Sprite(cancelMaterial);
        cancel.scale.set(0.7, 0.7, 1);
        cancel.position.set(position.x - 1.0, this.hexHeight + 1.5, position.z);
        cancel.userData = { type: 'cancel' };
        
        // Add sprites to group
        uiGroup.add(checkmark);
        uiGroup.add(cancel);
        
        // Add hover effect
        const onMouseMove = (event) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / this.canvas.clientWidth) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / this.canvas.clientHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects([checkmark, cancel]);
            
            // Reset scales
            checkmark.scale.set(0.7, 0.7, 1);
            cancel.scale.set(0.7, 0.7, 1);
            
            if (intersects.length > 0) {
                // Enlarge hovered sprite
                intersects[0].object.scale.set(0.8, 0.8, 1);
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
        };
        
        this.canvas.addEventListener('mousemove', onMouseMove);
        
        this.confirmationUI = uiGroup;
        this.scene.add(uiGroup);
        
        // Store the event listener for cleanup
        this.confirmationUI.userData = { 
            ...this.confirmationUI.userData,
            cleanup: () => {
                this.canvas.removeEventListener('mousemove', onMouseMove);
            }
        };
    }

    /**
     * Clear the confirmation UI elements
     */
    clearConfirmationUI() {
        if (this.confirmationUI) {
            // Clean up event listeners
            if (this.confirmationUI.userData && this.confirmationUI.userData.cleanup) {
                this.confirmationUI.userData.cleanup();
            }
            this.scene.remove(this.confirmationUI);
            this.confirmationUI = null;
        }
    }

    /**
     * Check if a point intersects with confirmation UI elements
     * @param {THREE.Vector2} point - Screen coordinates
     * @returns {string|null} 'confirm', 'cancel', or null
     */
    checkConfirmationUIIntersection(point) {
        if (!this.confirmationUI) {
            console.log('No confirmation UI present');
            return null;
        }
        
        console.log('Checking UI intersections with point:', point);
        console.log('Available UI elements:', this.confirmationUI.children.map(child => child.userData.type));
        
        this.raycaster.setFromCamera(point, this.camera);
        const intersects = this.raycaster.intersectObjects(this.confirmationUI.children, true);
        
        console.log('Found UI intersections:', intersects.length);
        
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            console.log('Hit UI object:', hitObject);
            console.log('Hit object userData:', hitObject.userData);
            
            let parent = hitObject;
            while (parent && !parent.userData.type) {
                console.log('Traversing up to parent:', parent);
                parent = parent.parent;
            }
            
            const result = parent ? parent.userData.type : null;
            console.log('Final UI interaction result:', result);
            return result;
        }
        
        console.log('No UI intersections found');
        return null;
    }

    /**
     * Update valid placement hitboxes based on game state
     */
    updatePlacementHitboxes() {
        // Clear existing hitboxes
        this.clearPlacementHitboxes();
        
        if (!this.gameState) return;
        
        const player = this.gameState.players[this.gameState.currentPlayer];
        
        // Only show hitboxes if:
        // 1. Player has tiles available
        // 2. No other action is selected
        if (player.tiles.placed >= player.tiles.total || this.gameState.selectedAction) {
            return;
        }
        
        // Get valid placement positions
        const validPlacements = this.gameState.grid.getValidTilePlacements(this.gameState.currentPlayer);
        
        // Create hitbox for each valid position
        validPlacements.forEach(hex => {
            const position = this.hexToPosition(hex);
            
            // Create a transparent cylinder as hitbox
            const geometry = new THREE.CylinderGeometry(this.hexSize * 0.8, this.hexSize * 0.8, 0.25, 6);
            const material = new THREE.MeshBasicMaterial({
                color: 0x0000ff, // Bleu
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide
            });
            
            const hitbox = new THREE.Mesh(geometry, material);
            hitbox.position.set(position.x, 0.125, position.z); // Slightly above the ground
            hitbox.userData = { type: 'placementHitbox', hex };
            
            this.placementHitboxes.set(hex.hash(), hitbox);
            this.scene.add(hitbox);
        });
    }

    /**
     * Clear all placement hitboxes
     */
    clearPlacementHitboxes() {
        this.placementHitboxes.forEach(hitbox => {
            this.scene.remove(hitbox);
        });
        this.placementHitboxes.clear();
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
} 