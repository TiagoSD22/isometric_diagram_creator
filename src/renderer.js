/**
 * Isometric 3D Renderer using Three.js
 * Renders the parsed diagram model as an interactive 3D scene
 */

import * as THREE from 'three';

export class IsometricRenderer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = null;
        
        // Object tracking
        this.meshes = new Map(); // id -> mesh
        this.connections = [];
        this.selectedObject = null;
        this.hoveredObject = null;
        
        // Layout settings
        this.gridSize = 60;
        this.componentHeight = 20;
        this.containerHeight = 40;
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }

    /**
     * Initialize Three.js scene, camera, and renderer
     */
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Camera - Isometric view
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 200;
        this.camera = new THREE.OrthographicCamera(
            (frustumSize * aspect) / -2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            frustumSize / -2,
            1,
            1000
        );
        
        // Set isometric angle (30 degrees)
        this.camera.position.set(100, 100, 100);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            preserveDrawingBuffer: true // For export functionality
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Grid
        this.createGrid();

        // Raycaster for mouse interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    /**
     * Setup scene lighting
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light for shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Hemisphere light for softer illumination
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x98FB98, 0.4);
        this.scene.add(hemisphereLight);
    }

    /**
     * Create grid background
     */
    createGrid() {
        const gridHelper = new THREE.GridHelper(400, 20, 0xcccccc, 0xeeeeee);
        gridHelper.position.y = -1;
        this.scene.add(gridHelper);
    }

    /**
     * Setup event listeners for interaction
     */
    setupEventListeners() {
        // Mouse events
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
        this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this));
        
        // Wheel for zoom
        this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this));
        
        // Resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    /**
     * Handle mouse movement for hover effects
     */
    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        // Clear previous hover
        if (this.hoveredObject) {
            this.setObjectHighlight(this.hoveredObject, false);
            this.hoveredObject = null;
            this.container.style.cursor = 'default';
        }

        // Set new hover
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.id) {
                this.hoveredObject = object;
                this.setObjectHighlight(object, true);
                this.container.style.cursor = 'pointer';
                
                // Show tooltip if available
                this.showTooltip(object, event);
            }
        } else {
            this.hideTooltip();
        }
    }

    /**
     * Handle click events
     */
    onClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        // Clear previous selection
        if (this.selectedObject) {
            this.setObjectSelection(this.selectedObject, false);
        }

        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.id) {
                this.selectedObject = object;
                this.setObjectSelection(object, true);
                
                // Handle annotation links
                const annotation = object.userData.annotation;
                if (annotation && annotation.link) {
                    window.open(annotation.link, '_blank');
                }
            }
        } else {
            this.selectedObject = null;
        }
    }

    /**
     * Handle context menu (right click)
     */
    onContextMenu(event) {
        event.preventDefault();
        // TODO: Implement context menu for editing
    }

    /**
     * Handle mouse wheel for zoom
     */
    onWheel(event) {
        event.preventDefault();
        const scaleFactor = event.deltaY > 0 ? 1.1 : 0.9;
        this.camera.zoom *= scaleFactor;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 200;
        
        this.camera.left = (frustumSize * aspect) / -2;
        this.camera.right = (frustumSize * aspect) / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    /**
     * Set object highlight state
     */
    setObjectHighlight(object, highlighted) {
        if (object.material) {
            if (highlighted) {
                object.material.emissive = new THREE.Color(0x333333);
            } else {
                object.material.emissive = new THREE.Color(0x000000);
            }
        }
    }

    /**
     * Set object selection state
     */
    setObjectSelection(object, selected) {
        if (object.material) {
            if (selected) {
                object.material.emissive = new THREE.Color(0x666666);
            } else {
                object.material.emissive = new THREE.Color(0x000000);
            }
        }
    }

    /**
     * Show tooltip for object
     */
    showTooltip(object, event) {
        const annotation = object.userData.annotation;
        if (annotation && annotation.tooltip) {
            // Create or update tooltip element
            let tooltip = document.getElementById('three-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'three-tooltip';
                tooltip.style.position = 'absolute';
                tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
                tooltip.style.color = 'white';
                tooltip.style.padding = '8px 12px';
                tooltip.style.borderRadius = '4px';
                tooltip.style.fontSize = '12px';
                tooltip.style.pointerEvents = 'none';
                tooltip.style.zIndex = '1000';
                document.body.appendChild(tooltip);
            }
            
            tooltip.textContent = annotation.tooltip;
            tooltip.style.left = event.clientX + 10 + 'px';
            tooltip.style.top = event.clientY - 10 + 'px';
            tooltip.style.display = 'block';
        }
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('three-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Render diagram from parsed model
     */
    render(diagram) {
        // Clear existing objects
        this.clear();

        // Calculate layout positions
        const layout = this.calculateLayout(diagram);

        // Render components
        for (const [id, component] of Object.entries(diagram.components)) {
            const position = layout.components[id];
            if (position) {
                const mesh = this.createComponentMesh(component, diagram.styles, position);
                mesh.userData.id = id;
                mesh.userData.type = 'component';
                mesh.userData.annotation = diagram.annotations[id];
                this.scene.add(mesh);
                this.meshes.set(id, mesh);
            }
        }

        // Render containers
        for (const [id, container] of Object.entries(diagram.containers)) {
            const position = layout.containers[id];
            if (position) {
                const mesh = this.createContainerMesh(container, position);
                mesh.userData.id = id;
                mesh.userData.type = 'container';
                mesh.userData.annotation = diagram.annotations[id];
                this.scene.add(mesh);
                this.meshes.set(id, mesh);
            }
        }

        // Render relations
        for (const relation of diagram.relations) {
            const fromMesh = this.meshes.get(relation.from);
            const toMesh = this.meshes.get(relation.to);
            
            if (fromMesh && toMesh) {
                const connection = this.createConnection(fromMesh, toMesh, relation.label);
                this.scene.add(connection);
                this.connections.push(connection);
            }
        }

        // Center camera on diagram
        this.centerCamera(layout);
    }

    /**
     * Calculate layout positions for all elements
     */
    calculateLayout(diagram) {
        const layout = {
            components: {},
            containers: {}
        };

        // Simple grid layout
        let x = 0, z = 0;
        const spacing = this.gridSize;

        // Position components
        for (const [id, component] of Object.entries(diagram.components)) {
            if (!component.parent) { // Only top-level components
                layout.components[id] = { x, y: 0, z };
                x += spacing;
                if (x > spacing * 4) {
                    x = 0;
                    z += spacing;
                }
            }
        }

        // Position containers
        for (const [id, container] of Object.entries(diagram.containers)) {
            if (!container.parent) { // Only top-level containers
                layout.containers[id] = { x, y: 0, z };
                
                // Position children within container
                let childX = x - spacing;
                let childZ = z - spacing / 2;
                
                for (const childId of container.children) {
                    childX += spacing / 2;
                    if (diagram.components[childId]) {
                        layout.components[childId] = { x: childX, y: 5, z: childZ };
                    } else if (diagram.containers[childId]) {
                        layout.containers[childId] = { x: childX, y: 5, z: childZ };
                    }
                }
                
                x += spacing * 2;
                if (x > spacing * 4) {
                    x = 0;
                    z += spacing * 2;
                }
            }
        }

        return layout;
    }

    /**
     * Create 3D mesh for component
     */
    createComponentMesh(component, styles, position) {
        const style = styles[component.properties.type] || {};
        const shape = style.shape || 'rectangle';
        const color = style.color || '#4CAF50';
        
        let geometry;
        
        switch (shape) {
            case 'pyramid':
                geometry = new THREE.ConeGeometry(15, this.componentHeight, 4);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(12, 12, this.componentHeight);
                break;
            default: // rectangle
                geometry = new THREE.BoxGeometry(30, this.componentHeight, 20);
                break;
        }

        const material = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y + this.componentHeight/2, position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Add label
        if (component.properties.label) {
            const label = this.createTextLabel(component.properties.label);
            label.position.y = this.componentHeight + 5;
            mesh.add(label);
        }

        // Add icon if available
        if (style.icon) {
            const iconSprite = this.createIconSprite(style.icon);
            iconSprite.position.y = this.componentHeight/2 + 2;
            mesh.add(iconSprite);
        }

        return mesh;
    }

    /**
     * Create 3D mesh for container
     */
    createContainerMesh(container, position) {
        const geometry = new THREE.BoxGeometry(
            this.gridSize * 1.8, 
            this.containerHeight, 
            this.gridSize * 1.2
        );
        
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xcccccc,
            transparent: true,
            opacity: 0.3,
            wireframe: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y + this.containerHeight/2, position.z);
        mesh.receiveShadow = true;

        // Add wireframe outline
        const wireframe = new THREE.WireframeGeometry(geometry);
        const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0x888888 }));
        mesh.add(line);

        // Add label
        if (container.properties.label) {
            const label = this.createTextLabel(container.properties.label);
            label.position.y = this.containerHeight + 5;
            mesh.add(label);
        }

        return mesh;
    }

    /**
     * Create connection line between two meshes
     */
    createConnection(fromMesh, toMesh, label) {
        const fromPos = fromMesh.position.clone();
        const toPos = toMesh.position.clone();
        
        // Add some height to avoid ground clipping
        fromPos.y += 5;
        toPos.y += 5;

        const geometry = new THREE.BufferGeometry().setFromPoints([fromPos, toPos]);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x666666,
            linewidth: 2
        });

        const line = new THREE.Line(geometry, material);

        // Add arrow head
        const direction = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
        const arrowHelper = new THREE.ArrowHelper(direction, toPos, 0, 0x666666, 8, 4);
        line.add(arrowHelper);

        // Add label if provided
        if (label) {
            const labelSprite = this.createTextLabel(label, 0.5);
            const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
            labelSprite.position.copy(midPoint);
            labelSprite.position.y += 10;
            line.add(labelSprite);
        }

        return line;
    }

    /**
     * Create text label sprite
     */
    createTextLabel(text, scale = 1) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = 32;
        
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(255, 255, 255, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#333333';
        context.font = `${fontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(20 * scale, 10 * scale, 1);

        return sprite;
    }

    /**
     * Create icon sprite
     */
    createIconSprite(icon) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = 64;
        canvas.height = 64;
        
        context.font = '32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(icon, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(8, 8, 1);

        return sprite;
    }

    /**
     * Center camera on diagram
     */
    centerCamera(layout) {
        const positions = [
            ...Object.values(layout.components),
            ...Object.values(layout.containers)
        ];

        if (positions.length === 0) return;

        const bounds = {
            minX: Math.min(...positions.map(p => p.x)),
            maxX: Math.max(...positions.map(p => p.x)),
            minZ: Math.min(...positions.map(p => p.z)),
            maxZ: Math.max(...positions.map(p => p.z))
        };

        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerZ = (bounds.minZ + bounds.maxZ) / 2;

        // Update camera position to center on diagram
        const offset = 100;
        this.camera.position.set(centerX + offset, offset, centerZ + offset);
        this.camera.lookAt(centerX, 0, centerZ);
    }

    /**
     * Clear all rendered objects
     */
    clear() {
        // Remove meshes
        for (const mesh of this.meshes.values()) {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes.clear();

        // Remove connections
        for (const connection of this.connections) {
            this.scene.remove(connection);
            if (connection.geometry) connection.geometry.dispose();
            if (connection.material) connection.material.dispose();
        }
        this.connections = [];

        this.selectedObject = null;
        this.hoveredObject = null;
    }

    /**
     * Reset camera view
     */
    resetView() {
        this.camera.position.set(100, 100, 100);
        this.camera.lookAt(0, 0, 0);
        this.camera.zoom = 1;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Set zoom level
     */
    setZoom(zoom) {
        this.camera.zoom = zoom;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Rotate camera around center
     */
    setRotation(angle) {
        const radius = 100;
        const radians = (angle * Math.PI) / 180;
        this.camera.position.x = Math.cos(radians) * radius;
        this.camera.position.z = Math.sin(radians) * radius;
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Export scene as PNG
     */
    exportPNG() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = 'isometric-diagram.png';
        link.href = dataURL;
        link.click();
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.clear();
        this.renderer.dispose();
        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

export default IsometricRenderer;
