/**
 * ModelLoader.js
 * Handles loading and caching of 3D models for the Hexaequo game
 */

class ModelLoader {
    /**
     * Create a new model loader
     */
    constructor() {
        // Map to store loaded models
        this.models = new Map();
        
        // Loader for GLTF/GLB models
        this.gltfLoader = new THREE.GLTFLoader();
        
        // Track loading progress
        this.totalModels = 0;
        this.loadedModels = 0;
        this.onProgressCallback = null;
        this.onCompleteCallback = null;
    }

    /**
     * Set callbacks for loading progress and completion
     * @param {Function} onProgress - Callback for progress updates
     * @param {Function} onComplete - Callback for completion
     */
    setCallbacks(onProgress, onComplete) {
        this.onProgressCallback = onProgress;
        this.onCompleteCallback = onComplete;
    }

    /**
     * Load all game models
     */
    loadGameModels() {
        // Define model paths
        const modelPaths = {
            'tile_black': 'assets/models/tile_black.glb',
            'tile_white': 'assets/models/tile_white.glb',
            'disc_black': 'assets/models/disc_black.glb',
            'disc_white': 'assets/models/disc_white.glb',
            'ring_black': 'assets/models/ring_black.glb',
            'ring_white': 'assets/models/ring_white.glb'
        };
        
        this.totalModels = Object.keys(modelPaths).length;
        this.loadedModels = 0;
        
        // Load each model
        for (const [key, path] of Object.entries(modelPaths)) {
            this.loadModel(key, path);
        }
    }

    /**
     * Load a single model
     * @param {string} key - The key to store the model under
     * @param {string} path - The path to the model file
     */
    loadModel(key, path) {
        this.gltfLoader.load(
            path,
            (gltf) => {
                // Process the loaded model
                const model = gltf.scene;
                
                // Apply default transformations
                model.scale.set(1, 1, 1);
                
                // Enable shadows
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                // Store the model
                this.models.set(key, model);
                
                // Update progress
                this.loadedModels++;
                
                // Call progress callback
                if (this.onProgressCallback) {
                    const progress = this.loadedModels / this.totalModels;
                    this.onProgressCallback(progress, key);
                }
                
                // Check if all models are loaded
                if (this.loadedModels === this.totalModels && this.onCompleteCallback) {
                    this.onCompleteCallback();
                }
            },
            (xhr) => {
                // Loading progress for individual model
                const progress = xhr.loaded / xhr.total;
                console.log(`Loading model ${key}: ${Math.round(progress * 100)}%`);
            },
            (error) => {
                console.error(`Error loading model ${key}:`, error);
                
                // Count as loaded to avoid blocking completion
                this.loadedModels++;
                
                // Check if all models are loaded
                if (this.loadedModels === this.totalModels && this.onCompleteCallback) {
                    this.onCompleteCallback();
                }
            }
        );
    }

    /**
     * Check if a model is loaded
     * @param {string} key - The model key
     * @returns {boolean} True if the model is loaded
     */
    isLoaded(key) {
        return this.models.has(key);
    }

    /**
     * Get a loaded model
     * @param {string} key - The model key
     * @returns {THREE.Object3D|null} The model or null if not loaded
     */
    getModel(key) {
        return this.models.get(key) || null;
    }

    /**
     * Load a model from a file provided by the user
     * @param {File} file - The model file
     * @param {string} key - The key to store the model under
     * @returns {Promise} Promise that resolves when the model is loaded
     */
    loadModelFromFile(file, key) {
        return new Promise((resolve, reject) => {
            // Create a URL for the file
            const url = URL.createObjectURL(file);
            
            this.gltfLoader.load(
                url,
                (gltf) => {
                    // Process the loaded model
                    const model = gltf.scene;
                    
                    // Apply default transformations
                    model.scale.set(1, 1, 1);
                    
                    // Enable shadows
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    
                    // Store the model
                    this.models.set(key, model);
                    
                    // Clean up the URL
                    URL.revokeObjectURL(url);
                    
                    resolve(model);
                },
                null,
                (error) => {
                    console.error(`Error loading model from file:`, error);
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            );
        });
    }

    /**
     * Create fallback models for missing models
     */
    createFallbackModels() {
        // Create fallback models for tiles
        if (!this.isLoaded('tile_black')) {
            this.createFallbackTile('black');
        }
        
        if (!this.isLoaded('tile_white')) {
            this.createFallbackTile('white');
        }
        
        // Create fallback models for discs
        if (!this.isLoaded('disc_black')) {
            this.createFallbackDisc('black');
        }
        
        if (!this.isLoaded('disc_white')) {
            this.createFallbackDisc('white');
        }
        
        // Create fallback models for rings
        if (!this.isLoaded('ring_black')) {
            this.createFallbackRing('black');
        }
        
        if (!this.isLoaded('ring_white')) {
            this.createFallbackRing('white');
        }
    }

    /**
     * Create a fallback tile model
     * @param {string} color - The tile color ('black' or 'white')
     */
    createFallbackTile(color) {
        const hexSize = 1.0;
        const hexHeight = 0.2;
        
        // Create geometry and material
        const geometry = new THREE.CylinderGeometry(hexSize, hexSize, hexHeight, 6);
        const material = new THREE.MeshStandardMaterial({
            color: color === 'black' ? 0x222222 : 0xffffff,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI / 6; // Align flat sides with coordinate system
        mesh.position.y = hexHeight / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Create a group to hold the mesh
        const group = new THREE.Group();
        group.add(mesh);
        
        // Store the model
        this.models.set(`tile_${color}`, group);
    }

    /**
     * Create a fallback disc model
     * @param {string} color - The disc color ('black' or 'white')
     */
    createFallbackDisc(color) {
        const discRadius = 0.4;
        const discHeight = 0.1;
        const hexHeight = 0.2;
        
        // Create geometry and material
        const geometry = new THREE.CylinderGeometry(discRadius, discRadius, discHeight, 32);
        const material = new THREE.MeshStandardMaterial({
            color: color === 'black' ? 0x222222 : 0xffffff,
            roughness: 0.5,
            metalness: 0.5
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = hexHeight + discHeight / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Create a group to hold the mesh
        const group = new THREE.Group();
        group.add(mesh);
        
        // Store the model
        this.models.set(`disc_${color}`, group);
    }

    /**
     * Create a fallback ring model
     * @param {string} color - The ring color ('black' or 'white')
     */
    createFallbackRing(color) {
        const outerRadius = 0.4;
        const innerRadius = 0.25;
        const ringHeight = 0.1;
        const hexHeight = 0.2;
        
        // Create a ring shape
        const shape = new THREE.Shape();
        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
        
        const hole = new THREE.Path();
        hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        
        // Extrude the shape to create a 3D ring
        const extrudeSettings = {
            depth: ringHeight,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Rotate to lay flat
        geometry.rotateX(-Math.PI / 2);
        
        const material = new THREE.MeshStandardMaterial({
            color: color === 'black' ? 0x222222 : 0xffffff,
            roughness: 0.5,
            metalness: 0.5
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = hexHeight;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Create a group to hold the mesh
        const group = new THREE.Group();
        group.add(mesh);
        
        // Store the model
        this.models.set(`ring_${color}`, group);
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModelLoader };
} 