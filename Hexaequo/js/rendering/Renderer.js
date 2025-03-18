/**
 * Renderer.js
 * Handles 3D rendering of the Hexaequo game using Three.js
 */

/**
 * ObjectPool class to manage reusable 3D objects.
 * This reduces garbage collection and improves performance.
 */
class ObjectPool {
    /**
     * Create a new object pool
     * @param {Function} createFunc - Function to create a new object
     * @param {Function} resetFunc - Function to reset an object for reuse
     * @param {number} initialSize - Initial pool size (default: 20)
     */
    constructor(createFunc, resetFunc, initialSize = 20) {
        this.createFunc = createFunc;
        this.resetFunc = resetFunc;
        this.objects = [];
        this.activeObjects = new Set();
        
        // Pre-populate the pool
        for (let i = 0; i < initialSize; i++) {
            this.objects.push(this.createFunc());
        }
    }
    
    /**
     * Get an object from the pool
     * @returns {Object} An object from the pool
     */
    get() {
        let object;
        
        if (this.objects.length > 0) {
            // Use an existing object
            object = this.objects.pop();
        } else {
            // Create a new object if the pool is empty
            object = this.createFunc();
        }
        
        this.activeObjects.add(object);
        return object;
    }
    
    /**
     * Return an object to the pool
     * @param {Object} object - The object to return
     */
    release(object) {
        if (this.activeObjects.has(object)) {
            this.activeObjects.delete(object);
            this.resetFunc(object);
            this.objects.push(object);
        }
    }
    
    /**
     * Release all active objects
     */
    releaseAll() {
        this.activeObjects.forEach(object => {
            this.resetFunc(object);
            this.objects.push(object);
        });
        this.activeObjects.clear();
    }
    
    /**
     * Get all active objects
     * @returns {Array} Array of active objects
     */
    getActiveObjects() {
        return Array.from(this.activeObjects);
    }
}

/**
 * MaterialCache class to manage and reuse materials and textures.
 * This reduces memory usage and GPU load.
 */
class MaterialCache {
    constructor() {
        // Cache for materials
        this.materials = new Map();
        
        // Cache for textures
        this.textures = new Map();
        
        // Cache for geometries
        this.geometries = new Map();
        
        // Common material parameters
        this.defaults = {
            standard: {
                roughness: 0.5,
                metalness: 0.3
            },
            basic: {
                transparent: true
            }
        };
    }
    
    /**
     * Get or create a MeshStandardMaterial
     * @param {Object} params - Material parameters
     * @returns {THREE.MeshStandardMaterial} The cached or new material
     */
    getStandardMaterial(params) {
        // Create a unique key based on the parameters
        const key = this._createKey('standard', params);
        
        if (this.materials.has(key)) {
            return this.materials.get(key);
        }
        
        // Create a new material with default and custom parameters
        const material = new THREE.MeshStandardMaterial({
            ...this.defaults.standard,
            ...params
        });
        
        // Store in cache
        this.materials.set(key, material);
        return material;
    }
    
    /**
     * Get or create a MeshBasicMaterial
     * @param {Object} params - Material parameters
     * @returns {THREE.MeshBasicMaterial} The cached or new material
     */
    getBasicMaterial(params) {
        // Create a unique key based on the parameters
        const key = this._createKey('basic', params);
        
        if (this.materials.has(key)) {
            return this.materials.get(key);
        }
        
        // Create a new material with default and custom parameters
        const material = new THREE.MeshBasicMaterial({
            ...this.defaults.basic,
            ...params
        });
        
        // Store in cache
        this.materials.set(key, material);
        return material;
    }
    
    /**
     * Get or create a texture from a URL
     * @param {string} url - The texture URL
     * @returns {THREE.Texture} The cached or new texture
     */
    getTexture(url) {
        if (this.textures.has(url)) {
            return this.textures.get(url);
        }
        
        // Create a new texture
        const texture = new THREE.TextureLoader().load(url);
        
        // Apply common settings
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Store in cache
        this.textures.set(url, texture);
        return texture;
    }
    
    /**
     * Get or create a cylinder geometry
     * @param {number} radius - Cylinder radius
     * @param {number} height - Cylinder height
     * @param {number} segments - Number of segments (default: 32)
     * @returns {THREE.CylinderGeometry} The cached or new geometry
     */
    getCylinderGeometry(radius, height, segments = 32) {
        const key = `cylinder_${radius}_${height}_${segments}`;
        
        if (this.geometries.has(key)) {
            return this.geometries.get(key);
        }
        
        const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
        this.geometries.set(key, geometry);
        return geometry;
    }
    
    /**
     * Get or create a hexagonal cylinder geometry
     * @param {number} radius - Cylinder radius
     * @param {number} height - Cylinder height
     * @returns {THREE.CylinderGeometry} The cached or new geometry
     */
    getHexagonGeometry(radius, height) {
        const key = `hexagon_${radius}_${height}`;
        
        if (this.geometries.has(key)) {
            return this.geometries.get(key);
        }
        
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 6);
        this.geometries.set(key, geometry);
        return geometry;
    }
    
    /**
     * Create a unique key for material caching
     * @param {string} type - Material type
     * @param {Object} params - Material parameters
     * @returns {string} A unique key for the material
     * @private
     */
    _createKey(type, params) {
        // Sort parameters by key to ensure consistent key generation
        const sortedParams = Object.fromEntries(
            Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
        );
        
        return `${type}_${JSON.stringify(sortedParams)}`;
    }
    
    /**
     * Clear unused resources from the cache
     */
    cleanup() {
        // In a more complex implementation, we could track usage
        // and remove rarely used resources
    }
}

/**
 * SpatialIndex class to optimize raycast operations through spatial partitioning.
 * This improves performance by reducing the number of objects tested for intersection.
 */
class SpatialIndex {
    /**
     * Create a new spatial index
     * @param {number} cellSize - Size of each cell in the spatial grid (default: 2.0)
     */
    constructor(cellSize = 2.0) {
        this.cellSize = cellSize;
        this.cells = new Map(); // Maps cell coordinates to arrays of objects
        this.objectCells = new Map(); // Maps objects to the cells they occupy
    }
    
    /**
     * Get the cell key for a position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {string} Cell key in the format "x,z"
     * @private
     */
    _getCellKey(x, z) {
        const cellX = Math.floor(x / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        return `${cellX},${cellZ}`;
    }
    
    /**
     * Add an object to the spatial index
     * @param {THREE.Object3D} object - The object to add
     * @param {THREE.Vector3} position - The object's position
     * @param {number} radius - The object's bounding radius
     */
    addObject(object, position, radius = 1.0) {
        // Calculate the cells this object occupies based on its position and radius
        const minCellX = Math.floor((position.x - radius) / this.cellSize);
        const maxCellX = Math.floor((position.x + radius) / this.cellSize);
        const minCellZ = Math.floor((position.z - radius) / this.cellSize);
        const maxCellZ = Math.floor((position.z + radius) / this.cellSize);
        
        const occupiedCells = [];
        
        // Add the object to each cell it occupies
        for (let x = minCellX; x <= maxCellX; x++) {
            for (let z = minCellZ; z <= maxCellZ; z++) {
                const cellKey = `${x},${z}`;
                occupiedCells.push(cellKey);
                
                if (!this.cells.has(cellKey)) {
                    this.cells.set(cellKey, []);
                }
                
                this.cells.get(cellKey).push(object);
            }
        }
        
        // Remember which cells this object occupies
        this.objectCells.set(object.uuid, occupiedCells);
    }
    
    /**
     * Remove an object from the spatial index
     * @param {THREE.Object3D} object - The object to remove
     */
    removeObject(object) {
        const cellKeys = this.objectCells.get(object.uuid);
        
        if (!cellKeys) return;
        
        // Remove the object from each cell it occupies
        cellKeys.forEach(cellKey => {
            const cell = this.cells.get(cellKey);
            
            if (cell) {
                const index = cell.indexOf(object);
                
                if (index !== -1) {
                    cell.splice(index, 1);
                }
                
                // Clean up empty cells
                if (cell.length === 0) {
                    this.cells.delete(cellKey);
                }
            }
        });
        
        // Remove the object's record
        this.objectCells.delete(object.uuid);
    }
    
    /**
     * Update an object's position in the spatial index
     * @param {THREE.Object3D} object - The object to update
     * @param {THREE.Vector3} position - The object's new position
     * @param {number} radius - The object's bounding radius
     */
    updateObject(object, position, radius = 1.0) {
        this.removeObject(object);
        this.addObject(object, position, radius);
    }
    
    /**
     * Get all objects near a position that might intersect with a ray
     * @param {THREE.Vector3} position - The position to check
     * @param {number} radius - The radius to check around the position
     * @returns {Array} Array of objects near the position
     */
    getObjectsNear(position, radius = 1.0) {
        const minCellX = Math.floor((position.x - radius) / this.cellSize);
        const maxCellX = Math.floor((position.x + radius) / this.cellSize);
        const minCellZ = Math.floor((position.z - radius) / this.cellSize);
        const maxCellZ = Math.floor((position.z + radius) / this.cellSize);
        
        const objects = new Set();
        
        // Gather objects from all cells in range
        for (let x = minCellX; x <= maxCellX; x++) {
            for (let z = minCellZ; z <= maxCellZ; z++) {
                const cellKey = `${x},${z}`;
                const cell = this.cells.get(cellKey);
                
                if (cell) {
                    cell.forEach(object => objects.add(object));
                }
            }
        }
        
        return Array.from(objects);
    }
    
    /**
     * Get all objects that a ray might intersect based on its origin and direction
     * @param {THREE.Ray} ray - The ray to check
     * @param {number} maxDistance - Maximum distance along the ray to check
     * @returns {Array} Array of objects that might intersect with the ray
     */
    getObjectsAlongRay(ray, maxDistance = 100) {
        const origin = ray.origin;
        const direction = ray.direction;
        
        // Start with objects near the ray origin
        const objects = new Set(this.getObjectsNear(origin, this.cellSize));
        
        // Sample points along the ray to gather objects
        const steps = Math.ceil(maxDistance / this.cellSize);
        const stepSize = maxDistance / steps;
        
        for (let i = 1; i <= steps; i++) {
            const distance = i * stepSize;
            const pointOnRay = new THREE.Vector3(
                origin.x + direction.x * distance,
                origin.y + direction.y * distance,
                origin.z + direction.z * distance
            );
            
            // Add objects from this cell
            this.getObjectsNear(pointOnRay, this.cellSize).forEach(object => objects.add(object));
        }
        
        return Array.from(objects);
    }
}

class Renderer {
    // Constantes de hauteur pour les éléments du jeu
    static HEIGHTS = {
        // Hauteurs des tuiles
        TILE_BASE: 0,          // Hauteur de base des tuiles
        TILE_PREVIEW: 0.5,       // Hauteur des tuiles en preview

        // Hauteurs des disques
        DISC_BASE: 0,       // Hauteur de base des disques
        DISC_ELEVATED: 0.5,   // Hauteur des disques soulevés

        // Hauteurs des anneaux
        RING_BASE: 0,       // Hauteur de base des anneaux
        RING_ELEVATED: 0.5,   // Hauteur des anneaux soulevés

        // Hauteur des icônes UI
        UI_ICONS: 1.5            // Hauteur des icônes au-dessus des pièces
    };

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
        
        // Resource caching
        this.materialCache = new MaterialCache();
        
        // Spatial partitioning for raycasting optimization
        this.spatialIndex = new SpatialIndex(2.0); // Cell size of 2.0 units
        
        // Game objects
        this.hexSize = 1.0; // Size of hexagons
        this.hexHeight = 0.2; // Height of hex tiles
        this.gridSpacing = 0.9; // Spacing factor between hexagons (< 1 for overlap, 1 for touching, > 1 for gaps)
        this.hexObjects = new Map(); // Map of hex hash to 3D object
        
        // Track active objects
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
        // Create scene first
        this.scene = new THREE.Scene();
        this.updateSceneTheme();
        
        // Initialize object pools now that scene exists
        this.initObjectPools();
        
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
        
        // Initialize spatial index
        this.spatialIndex = new SpatialIndex(2.0);
        
        // Start animation loop
        this.animate();
    }

    /**
     * Initialize object pools (called after scene creation)
     */
    initObjectPools() {
        // Create or reset the object pools
        
        // Hex move indicators
        this.validMoveIndicatorPool = new ObjectPool(
            // Create function
            () => {
                const geometry = this.materialCache.getHexagonGeometry(this.hexSize * 0.95, 0.25);
                const material = this.materialCache.getStandardMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.2
                });
                const indicator = new THREE.Mesh(geometry, material);
                indicator.rotation.y = Math.PI / 3;
                indicator.visible = false; // Start hidden
                this.scene.add(indicator); // Now safe to add to scene
                return indicator;
            },
            // Reset function
            (indicator) => {
                indicator.visible = false;
                indicator.scale.set(1, 1, 1);
                indicator.position.set(0, 0, 0);
            },
            20 // Initial pool size
        );
        
        // Disc indicators
        this.discIndicatorPool = new ObjectPool(
            // Create function for disc-shaped indicators
            () => {
                const geometry = this.materialCache.getCylinderGeometry(this.hexSize * 0.4, 0.25, 32);
                const material = this.materialCache.getStandardMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.2
                });
                const indicator = new THREE.Mesh(geometry, material);
                indicator.visible = false; // Start hidden
                this.scene.add(indicator); // Now safe to add to scene
                return indicator;
            },
            // Reset function
            (indicator) => {
                indicator.visible = false;
                indicator.scale.set(1, 1, 1);
                indicator.position.set(0, 0, 0);
            },
            10 // Initial pool size
        );
        
        // Ring indicators
        this.ringIndicatorPool = new ObjectPool(
            // Create function for ring-shaped indicators
            () => {
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
                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const material = this.materialCache.getStandardMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.2
                });
                const indicator = new THREE.Mesh(geometry, material);
                indicator.rotation.x = Math.PI / 2; // Lay the ring flat
                indicator.visible = false; // Start hidden
                this.scene.add(indicator); // Now safe to add to scene
                return indicator;
            },
            // Reset function
            (indicator) => {
                indicator.visible = false;
                indicator.scale.set(1, 1, 1);
                indicator.position.set(0, 0, 0);
            },
            10 // Initial pool size
        );
        
        // Selected hex indicator
        this.selectedHexIndicatorPool = new ObjectPool(
            // Create function
            () => {
                const geometry = this.materialCache.getHexagonGeometry(this.hexSize * 1.1, 0.05);
                const material = this.materialCache.getBasicMaterial({
                    color: 0x0088ff,
                    opacity: 0.7,
                    wireframe: true
                });
                const indicator = new THREE.Mesh(geometry, material);
                indicator.rotation.y = Math.PI / 6;
                indicator.visible = false; // Start hidden
                this.scene.add(indicator); // Now safe to add to scene
                return indicator;
            },
            // Reset function
            (indicator) => {
                indicator.visible = false;
                indicator.position.set(0, 0, 0);
            },
            1 // Initial pool size (only need one)
        );
        
        // Placement hitboxes
        this.placementHitboxPool = new ObjectPool(
            // Create function
            () => {
                const geometry = this.materialCache.getHexagonGeometry(this.hexSize * 0.8, 0.25);
                const material = this.materialCache.getBasicMaterial({
                    color: 0x0000ff,
                    opacity: 0,
                    side: THREE.DoubleSide
                });
                const hitbox = new THREE.Mesh(geometry, material);
                hitbox.visible = false; // Start hidden
                this.scene.add(hitbox); // Now safe to add to scene
                return hitbox;
            },
            // Reset function
            (hitbox) => {
                hitbox.visible = false;
                hitbox.position.set(0, 0, 0);
                hitbox.userData = {};
            },
            20 // Initial pool size
        );
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
            isDarkTheme ? 0.4 : 0.5
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
        
        // If the game state is not empty, update the board and rebuild the spatial index
        if (gameState && gameState.grid) {
            this.updateBoard();
            this.rebuildSpatialIndex();
        }
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
        
        // Update selected piece elevation
        this.updateSelectedPieceElevation();
    }

    /**
     * Rebuild the spatial index from the current hex objects
     */
    rebuildSpatialIndex() {
        // Clear the spatial index
        this.spatialIndex = new SpatialIndex(2.0);
        
        // Add all hex objects to the spatial index
        for (const [hexHash, hexGroup] of this.hexObjects) {
            // Compute the position from the hex coordinates
            const hex = hexGroup.userData.hex;
            const position = this.hexToPosition(hex);
            
            // Add to spatial index
            this.spatialIndex.addObject(hexGroup, position, this.hexSize);
        }
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
        
        // Rebuild the spatial index if significant changes were made
        if (existingHexes.size > 0 || cells.length !== this.hexObjects.size) {
            this.rebuildSpatialIndex();
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
        
        // Add to spatial index for raycasting optimization
        this.spatialIndex.addObject(hexGroup, position, this.hexSize);
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
        
        // No need to update spatial index since position hasn't changed
    }

    /**
     * Remove a hex object from the scene
     * @param {string} hexHash - The hex hash
     */
    removeHexObject(hexHash) {
        const hexGroup = this.hexObjects.get(hexHash);
        
        if (hexGroup) {
            // Remove from spatial index
            this.spatialIndex.removeObject(hexGroup);
            
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
        if (this.modelLoader.isLoaded(`tile_${color}`)) {
            const model = this.modelLoader.getModel(`tile_${color}`).clone();
            model.userData = { isTile: true, color };
            this.applyTextureScaling(model, 0.1);
            return model;
        }
        
        // Use cached geometry and material
        const geometry = this.materialCache.getHexagonGeometry(this.hexSize, Renderer.HEIGHTS.TILE_BASE);
        const material = this.materialCache.getStandardMaterial({
            color: color === 'black' ? 0x222222 : 0xffffff,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI / 6;
        mesh.position.y = Renderer.HEIGHTS.TILE_BASE / 2;
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
        
        if (this.modelLoader.isLoaded(modelKey)) {
            const model = this.modelLoader.getModel(modelKey).clone();
            model.userData = { isPiece: true, type, color };
            this.applyTextureScaling(model, 0.1);
            return model;
        }
        
        let geometry;
        const baseHeight = type === 'disc' ? 
            Renderer.HEIGHTS.DISC_BASE : 
            Renderer.HEIGHTS.RING_BASE;
        
        if (type === 'disc') {
            geometry = this.materialCache.getCylinderGeometry(0.4, 0.1, 32);
        } else if (type === 'ring') {
            const outerRadius = 0.4;
            const innerRadius = 0.25;
            const shape = new THREE.Shape()
                .absarc(0, 0, outerRadius, 0, Math.PI * 2);
            shape.holes.push(
                new THREE.Path().absarc(0, 0, innerRadius, 0, Math.PI * 2, true)
            );
            const extrudeSettings = {
                depth: 0.1,
                bevelEnabled: false
            };
            geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        }
        
        const material = this.materialCache.getStandardMaterial({
            color: color === 'black' ? 0x222222 : 0xffffff,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = baseHeight;
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
            let indicator;
            let isDiscAction = false;
            let isRingAction = false;
            
            // Check if the action is related to discs or rings
            if (this.gameState.selectedAction === 'placeDisc' || 
                (this.gameState.selectedAction === 'movePiece' && 
                 this.gameState.selectedHex && 
                 this.gameState.grid.getCell(this.gameState.selectedHex)?.piece?.type === 'disc')) {
                // Use a disc-shaped indicator
                indicator = this.discIndicatorPool.get();
                isDiscAction = true;
            } else if (this.gameState.selectedAction === 'placeRing' ||
                     (this.gameState.selectedAction === 'movePiece' && 
                      this.gameState.selectedHex && 
                      this.gameState.grid.getCell(this.gameState.selectedHex)?.piece?.type === 'ring')) {
                // Use a ring-shaped indicator
                indicator = this.ringIndicatorPool.get();
                isRingAction = true;
            } else {
                // Use a regular hexagonal indicator
                indicator = this.validMoveIndicatorPool.get();
            }
            
            // Set opacity based on checkbox state
            if (indicator.material) {
                if (Array.isArray(indicator.material)) {
                    indicator.material.forEach(mat => {
                        mat.opacity = opacity;
                    });
                } else {
                    indicator.material.opacity = opacity;
                }
            }
            
            // Position the indicator based on the type
            if (isDiscAction || isRingAction) {
                indicator.position.set(position.x, this.hexHeight + (isRingAction ? 0.175 : 0.05), position.z);
            } else {
                indicator.position.set(position.x, this.hexHeight - 0.075, position.z);
            }
            
            // Store the hex reference in userData
            indicator.userData = { isValidMoveIndicator: true, hex };
            
            // Make the indicator visible
            indicator.visible = true;
            
            // Track the active indicator
            this.validMoveIndicators.push(indicator);
        }
    }

    /**
     * Clear all valid move indicators
     */
    clearValidMoveIndicators() {
        // Return all active indicators to their respective pools
        for (const indicator of this.validMoveIndicators) {
            // Determine which pool this indicator belongs to
            if (indicator.geometry && indicator.geometry.type === 'CylinderGeometry') {
                // If it's a cylinder with radius about 0.4, it's a disc
                if (indicator.geometry.parameters.radiusTop === this.hexSize * 0.4) {
                    this.discIndicatorPool.release(indicator);
                } else {
                    // Otherwise it's a regular hex indicator
                    this.validMoveIndicatorPool.release(indicator);
                }
            } else if (indicator.geometry && indicator.geometry.type === 'ExtrudeGeometry') {
                // If it's an extruded shape, it's a ring
                this.ringIndicatorPool.release(indicator);
            }
        }
        
        // Clear the tracking array
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
        
        // Get an indicator from the pool
        const indicator = this.selectedHexIndicatorPool.get();
        indicator.position.set(position.x, this.hexHeight + 0.1, position.z);
        indicator.visible = true;
        
        // Store the indicator for later reference
        this.selectedHexIndicator = indicator;
    }

    /**
     * Clear the selected hex indicator
     */
    clearSelectedHexIndicator() {
        if (this.selectedHexIndicator) {
            // Return the indicator to the pool
            this.selectedHexIndicatorPool.release(this.selectedHexIndicator);
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
        
        // Use spatial partitioning to get potential objects along the ray
        const potentialObjects = this.spatialIndex.getObjectsAlongRay(this.raycaster.ray, 100);
        
        // Calculate intersections with the potential objects
        const intersects = this.raycaster.intersectObjects(potentialObjects, true);
        
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
        
        // Update the raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // First check for UI interactions (UI is not in spatial index, so test directly)
        if (this.confirmationUI) {
            const uiAction = this.checkConfirmationUIIntersection(this.mouse);
            
            if (uiAction) {
                return uiAction;
            }
        }
        
        // Get potential objects using spatial index
        const potentialObjects = this.spatialIndex.getObjectsAlongRay(this.raycaster.ray, 100);
        
        // First check for hitbox intersections in our potential objects
        const placementHitboxes = Array.from(this.placementHitboxes.values());
        const potentialHitboxes = potentialObjects.filter(obj => placementHitboxes.includes(obj));
        let hitboxIntersects = this.raycaster.intersectObjects(potentialHitboxes);
        
        // Fallback: if no hitbox intersections were found through spatial index,
        // check all placement hitboxes directly (in case they were missed)
        if (hitboxIntersects.length === 0 && placementHitboxes.length > 0) {
            hitboxIntersects = this.raycaster.intersectObjects(placementHitboxes);
        }
        
        if (hitboxIntersects.length > 0) {
            const hitbox = hitboxIntersects[0].object;
            return hitbox.userData.hex;
        }
        
        // Then check for hex intersections in the potential objects
        const hexIntersects = this.raycaster.intersectObjects(potentialObjects, true);
        
        if (hexIntersects.length > 0) {
            let object = hexIntersects[0].object;
            while (object.parent && !object.userData.hex) {
                object = object.parent;
            }
            if (object.userData.hex) {
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
        this.clearPreviewTile();
        
        const tileObject = this.createTileObject(color);
        const position = this.hexToPosition(hex);
        
        tileObject.position.set(
            position.x, 
            Renderer.HEIGHTS.TILE_PREVIEW, 
            position.z
        );
        
        tileObject.traverse((child) => {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(mat => {
                        const newMat = mat.clone();
                        newMat.transparent = true;
                        newMat.opacity = 0.5;
                        return newMat;
                    });
                } else {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            }
        });
        
        this.previewTile = tileObject;
        this.previewHex = hex;
        this.scene.add(tileObject);
        
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
     * Create and cache UI textures
     */
    createUITextures() {
        if (!this._uiTextures) {
            this._uiTextures = {};
            
            // Create checkmark sprite using data URL
            const checkmarkDataURL = 'data:image/svg+xml;base64,' + btoa(`<?xml version="1.0" encoding="UTF-8"?>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#4CAF50"/>
                </svg>`);
            
            // Create cancel sprite using data URL
            const cancelDataURL = 'data:image/svg+xml;base64,' + btoa(`<?xml version="1.0" encoding="UTF-8"?>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="#F44336"/>
                </svg>`);
            
            // Cache textures
            this._uiTextures.checkmark = this.materialCache.getTexture(checkmarkDataURL);
            this._uiTextures.cancel = this.materialCache.getTexture(cancelDataURL);
        }
        
        return this._uiTextures;
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
        
        // Get or create UI textures
        const uiTextures = this.createUITextures();
        
        // Create checkmark sprite
        const checkmarkMaterial = new THREE.SpriteMaterial({ 
            map: uiTextures.checkmark,
            transparent: true,
            opacity: 0.9,
            depthTest: false // Ensure UI is always visible
        });
        const checkmark = new THREE.Sprite(checkmarkMaterial);
        checkmark.scale.set(0.7, 0.7, 1);
        checkmark.position.set(position.x + 1.0, this.hexHeight + Renderer.HEIGHTS.UI_ICONS, position.z);
        checkmark.userData = { type: 'confirm' };
        
        // Create cancel sprite
        const cancelMaterial = new THREE.SpriteMaterial({ 
            map: uiTextures.cancel,
            transparent: true,
            opacity: 0.9,
            depthTest: false // Ensure UI is always visible
        });
        const cancel = new THREE.Sprite(cancelMaterial);
        cancel.scale.set(0.7, 0.7, 1);
        cancel.position.set(position.x - 1.0, this.hexHeight + Renderer.HEIGHTS.UI_ICONS, position.z);
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
        if (!this.confirmationUI || !this.confirmationUI.children.length) {
            return null;
        }
        
        this.raycaster.setFromCamera(point, this.camera);
        const intersects = this.raycaster.intersectObjects(this.confirmationUI.children, true);
        
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            
            // Find the parent object with a type defined in userData
            let parent = hitObject;
            while (parent && !parent.userData.type) {
                parent = parent.parent;
            }
            
            return parent ? parent.userData.type : null;
        }
        
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
            
            // Get a hitbox from the pool
            const hitbox = this.placementHitboxPool.get();
            hitbox.position.set(position.x, 0.125, position.z); // Slightly above the ground
            hitbox.userData = { type: 'placementHitbox', hex };
            hitbox.visible = true;
            
            // Add hitbox to spatial index for raycasting
            this.spatialIndex.addObject(hitbox, position, this.hexSize * 0.8);
            
            // Store the reference
            this.placementHitboxes.set(hex.hash(), hitbox);
        });
    }

    /**
     * Clear all placement hitboxes
     */
    clearPlacementHitboxes() {
        // Remove hitboxes from spatial index and return them to the pool
        this.placementHitboxes.forEach(hitbox => {
            this.spatialIndex.removeObject(hitbox);
            this.placementHitboxPool.release(hitbox);
        });
        this.placementHitboxes.clear();
    }

    /**
     * Animate a piece's elevation
     * @param {THREE.Object3D} piece - The piece to animate
     * @param {number} startY - Starting Y position
     * @param {number} endY - Ending Y position
     */
    animatePieceElevation(piece, startY, endY) {
        const duration = 500; // Animation duration in milliseconds
        const startTime = Date.now();
        
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easeOutQuad for a smooth elevation
            const easeOutQuad = (x) => 1 - (1 - x) * (1 - x);
            
            // Update piece position
            piece.position.y = startY + (endY - startY) * easeOutQuad(progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        // Start the animation
        animate();
    }

    /**
     * Show cancel button above a selected piece
     * @param {THREE.Vector3} position - The position to show the button at
     */
    showCancelButton(position) {
        // Remove existing UI if any
        this.clearConfirmationUI();
        
        // Create a group for the UI elements
        const uiGroup = new THREE.Group();
        
        // Get or create UI textures
        const uiTextures = this.createUITextures();
        
        // Create cancel sprite
        const cancelMaterial = new THREE.SpriteMaterial({ 
            map: uiTextures.cancel,
            transparent: true,
            opacity: 0.9,
            depthTest: false // Ensure UI is always visible
        });
        const cancel = new THREE.Sprite(cancelMaterial);
        cancel.scale.set(0.7, 0.7, 1);
        cancel.position.set(position.x, position.y, position.z);
        cancel.userData = { type: 'cancel' };
        
        // Add hover effect
        const onMouseMove = (event) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / this.canvas.clientWidth) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / this.canvas.clientHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects([cancel]);
            
            // Reset scale
            cancel.scale.set(0.7, 0.7, 1);
            
            if (intersects.length > 0) {
                // Enlarge hovered sprite
                cancel.scale.set(0.8, 0.8, 1);
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
        };
        
        this.canvas.addEventListener('mousemove', onMouseMove);
        
        // Add sprite to group
        uiGroup.add(cancel);
        
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
     * Update the elevation of the selected piece
     */
    updateSelectedPieceElevation() {
        if (!this.gameState) return;

        // Reset all pieces to ground level first
        for (const [_, hexObject] of this.hexObjects) {
            if (hexObject.children) {
                hexObject.children.forEach(child => {
                    if (child.userData && child.userData.isPiece) {
                        const baseHeight = child.userData.type === 'disc' ? 
                            Renderer.HEIGHTS.DISC_BASE : 
                            Renderer.HEIGHTS.RING_BASE;
                        if (child.position.y !== baseHeight) {
                            this.animatePieceElevation(child, child.position.y, baseHeight);
                        }
                    }
                });
            }
        }

        // If a piece is selected for movement, elevate it and show cancel button
        if (this.gameState.selectedAction === 'movePiece' && this.gameState.selectedHex) {
            const selectedHexObject = this.hexObjects.get(this.gameState.selectedHex.hash());
            if (selectedHexObject && selectedHexObject.children) {
                selectedHexObject.children.forEach(child => {
                    if (child.userData && child.userData.isPiece) {
                        const elevatedHeight = child.userData.type === 'disc' ? 
                            Renderer.HEIGHTS.DISC_ELEVATED : 
                            Renderer.HEIGHTS.RING_ELEVATED;
                        if (child.position.y !== elevatedHeight) {
                            this.animatePieceElevation(child, child.position.y, elevatedHeight);
                            // Show cancel button above the piece
                            const position = new THREE.Vector3(
                                selectedHexObject.position.x,
                                this.hexHeight + Renderer.HEIGHTS.UI_ICONS,
                                selectedHexObject.position.z
                            );
                            this.showCancelButton(position);
                        }
                    }
                });
            }
        } else {
            this.clearConfirmationUI();
        }
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
} 