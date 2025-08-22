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
        
        // Drag functionality
        this.isDragging = false;
        this.dragStartMouse = new THREE.Vector2();
        this.dragStartPosition = new THREE.Vector3();
        this.draggedObject = null;
        this.dragPlane = new THREE.Plane();
        this.dragOffset = new THREE.Vector3();
        
        // Camera panning
        this.isPanning = false;
        this.panStartMouse = new THREE.Vector2();
        this.panStartCameraPosition = new THREE.Vector3();
        this.lastMousePosition = new THREE.Vector2();
        
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
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
        this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this));
        
        // Wheel for zoom
        this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Prevent text selection during drag
        this.renderer.domElement.addEventListener('selectstart', (e) => e.preventDefault());
    }

    /**
     * Handle mouse movement for hover effects and dragging
     */
    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Handle camera panning
        if (this.isPanning) {
            this.handleCameraPan(event);
            return;
        }

        // Handle object dragging
        if (this.isDragging && this.draggedObject) {
            this.handleDrag(event);
            return;
        }

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        // Clear previous hover
        if (this.hoveredObject && !this.isDragging && !this.isPanning) {
            this.setObjectHighlight(this.hoveredObject, false);
            this.hoveredObject = null;
            this.container.style.cursor = 'default';
        }

        // Set new hover - prioritize components over containers
        if (intersects.length > 0 && !this.isDragging && !this.isPanning) {
            const targetObject = this.findBestHoverTarget(intersects);
            if (targetObject) {
                this.hoveredObject = targetObject;
                this.setObjectHighlight(targetObject, true);
                this.container.style.cursor = 'grab';
                
                // Show tooltip if available
                this.showTooltip(targetObject, event);
            }
        } else if (!this.isDragging && !this.isPanning) {
            this.hideTooltip();
        }
    }

    /**
     * Handle click events
     */
    onClick(event) {
        // Prevent click if we just finished dragging
        if (this.isDragging) {
            return;
        }

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
     * Handle mouse down for drag start
     */
    onMouseDown(event) {
        if (event.button !== 0) return; // Only left mouse button

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const targetObject = this.findBestHoverTarget(intersects);
            if (targetObject) {
                this.startDrag(targetObject, intersects[0].point);
                return;
            }
        }
        
        // If no object was clicked, start camera panning
        this.startCameraPan(event);
    }

    /**
     * Handle mouse up for drag end
     */
    onMouseUp(event) {
        if (this.isDragging) {
            this.endDrag();
        } else if (this.isPanning) {
            this.endCameraPan();
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
     * Handle keyboard shortcuts
     */
    onKeyDown(event) {
        // Only handle if focus is not on an input element
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.code) {
            case 'KeyR':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.resetCamera();
                }
                break;
            case 'Home':
                event.preventDefault();
                this.resetCamera();
                break;
        }
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
     * Reset camera to default position and center on diagram
     */
    resetCamera() {
        // Reset to default isometric position and orientation
        this.camera.position.set(100, 100, 100);
        this.camera.lookAt(0, 0, 0);
        this.camera.zoom = 1;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Center camera on the current diagram
     */
    centerCamera(layout) {
        if (!layout) return;
        
        // Calculate diagram bounds
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        // Check component positions
        for (const pos of Object.values(layout.components)) {
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
            minZ = Math.min(minZ, pos.z);
            maxZ = Math.max(maxZ, pos.z);
        }
        
        // Check container positions
        for (const pos of Object.values(layout.containers)) {
            const size = pos.containerSize || { width: this.gridSize * 1.8, depth: this.gridSize * 1.2 };
            minX = Math.min(minX, pos.x - size.width / 2);
            maxX = Math.max(maxX, pos.x + size.width / 2);
            minZ = Math.min(minZ, pos.z - size.depth / 2);
            maxZ = Math.max(maxZ, pos.z + size.depth / 2);
        }
        
        // Calculate center point
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        
        // Maintain isometric camera orientation while centering on diagram
        // The camera should maintain its (1,1,1) direction but be positioned to look at the center
        const offset = 100; // Distance from center
        this.camera.position.set(centerX + offset, offset, centerZ + offset);
        this.camera.lookAt(centerX, 0, centerZ);
    }

    /**
     * Start dragging an object
     */
    startDrag(object, intersectionPoint) {
        this.isDragging = true;
        this.draggedObject = object;
        this.container.style.cursor = 'grabbing';
        
        // Clear any existing hover highlight first
        if (this.hoveredObject) {
            this.setObjectHighlight(this.hoveredObject, false);
            this.hoveredObject = null;
        }
        
        // Store the initial position
        this.dragStartPosition.copy(object.position);
        
        // Create a horizontal plane at the object's Y level for dragging
        this.dragPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0), // Normal pointing up
            object.position
        );
        
        // Calculate offset from intersection point to object center
        this.dragOffset.subVectors(object.position, intersectionPoint);
    }

    /**
     * Handle dragging movement
     */
    handleDrag(event) {
        if (!this.isDragging || !this.draggedObject) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Find intersection with the drag plane
        const intersectionPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
            // Apply the offset to maintain the initial grab point
            intersectionPoint.add(this.dragOffset);
            
            // For components, enforce strict container boundaries
            if (this.draggedObject.userData.type === 'component') {
                const componentData = this.getObjectData(this.draggedObject.userData.id);
                
                // If component belongs to a container, enforce strict boundaries
                if (componentData && componentData.parent) {
                    const parentMesh = this.meshes.get(componentData.parent);
                    
                    if (parentMesh) {
                        const containerBounds = this.getContainerBounds(parentMesh);
                        const margin = 15; // Small margin inside container
                        
                        // Check if the proposed position would be outside the container
                        const wouldExitContainer = 
                            intersectionPoint.x < containerBounds.minX + margin ||
                            intersectionPoint.x > containerBounds.maxX - margin ||
                            intersectionPoint.z < containerBounds.minZ + margin ||
                            intersectionPoint.z > containerBounds.maxZ - margin;
                        
                        if (wouldExitContainer) {
                            // Component is trying to leave its container - force drag end and snap back
                            this.forceEndDragAndSnapBack();
                            return; // Exit early, don't process the movement
                        }
                        
                        // Position is valid within container, proceed with movement
                        this.draggedObject.position.copy(intersectionPoint);
                    }
                } else {
                    // Component not in a container, check if it's trying to enter one
                    const newContainer = this.findContainerAtPosition(intersectionPoint);
                    
                    if (newContainer && this.isValidContainerAssignment(this.draggedObject.userData.id, newContainer)) {
                        // Valid container assignment, update parent and move
                        this.updateComponentParentContainer(this.draggedObject.userData.id, newContainer);
                        this.draggedObject.position.copy(intersectionPoint);
                    } else if (newContainer) {
                        // Invalid container - show rejection and don't move
                        this.showContainerRejectionFeedback(this.meshes.get(newContainer));
                        return; // Don't move the component
                    } else {
                        // Free space, allow movement
                        this.draggedObject.position.copy(intersectionPoint);
                    }
                }
            } else {
                // Container dragging - allow free movement
                const delta = new THREE.Vector3().subVectors(intersectionPoint, this.draggedObject.position);
                this.draggedObject.position.copy(intersectionPoint);
                
                // Move all children with the container
                this.moveContainerChildren(this.draggedObject.userData.id, delta);
            }
            
            // Update all connections that involve this object and its children
            this.updateConnectionsForMovedObject(this.draggedObject.userData.id);
        }
    }

    /**
     * Force end drag and snap component back to valid position within its container
     */
    forceEndDragAndSnapBack() {
        if (!this.draggedObject || this.draggedObject.userData.type !== 'component') return;
        
        const componentData = this.getObjectData(this.draggedObject.userData.id);
        
        if (componentData && componentData.parent) {
            const parentMesh = this.meshes.get(componentData.parent);
            
            if (parentMesh) {
                // Calculate valid position within container bounds
                const containerBounds = this.getContainerBounds(parentMesh);
                const margin = 15;
                
                // Constrain the current position to be within bounds
                const constrainedPosition = this.draggedObject.position.clone();
                constrainedPosition.x = Math.max(containerBounds.minX + margin, 
                                               Math.min(containerBounds.maxX - margin, constrainedPosition.x));
                constrainedPosition.z = Math.max(containerBounds.minZ + margin, 
                                               Math.min(containerBounds.maxZ - margin, constrainedPosition.z));
                
                // Snap back to valid position
                this.draggedObject.position.copy(constrainedPosition);
                
                // Show visual feedback
                this.showBoundaryConstraintFeedback(parentMesh);
            }
        }
        
        // Force end the drag operation
        this.endDrag();
    }

    /**
     * End dragging
     */
    endDrag() {
        this.isDragging = false;
        this.draggedObject = null;
        this.container.style.cursor = 'default';
    }

    /**
     * Start camera panning
     */
    startCameraPan(event) {
        this.isPanning = true;
        this.panStartMouse.set(event.clientX, event.clientY);
        this.panStartCameraPosition.copy(this.camera.position);
        this.container.style.cursor = 'move';
        
        // Clear any hover effects
        if (this.hoveredObject) {
            this.setObjectHighlight(this.hoveredObject, false);
            this.hoveredObject = null;
        }
        this.hideTooltip();
    }

    /**
     * Handle camera panning movement
     */
    handleCameraPan(event) {
        if (!this.isPanning) return;

        const currentMouse = new THREE.Vector2(event.clientX, event.clientY);
        const delta = new THREE.Vector2().subVectors(currentMouse, this.panStartMouse);
        
        // Convert screen space movement to world space movement
        // For orthographic camera, we need to account for the zoom and camera orientation
        const panSpeed = 0.5;
        
        // Get the camera's right and up vectors in world space
        const cameraMatrix = this.camera.matrixWorld.clone();
        const right = new THREE.Vector3().setFromMatrixColumn(cameraMatrix, 0); // X axis
        const up = new THREE.Vector3().setFromMatrixColumn(cameraMatrix, 1);    // Y axis
        
        // Normalize the vectors
        right.normalize();
        up.normalize();
        
        // Calculate movement in world space
        const rightMovement = right.multiplyScalar(-delta.x * panSpeed / this.camera.zoom);
        const upMovement = up.multiplyScalar(delta.y * panSpeed / this.camera.zoom);
        
        // Apply the movement to camera position
        const newPosition = this.panStartCameraPosition.clone()
            .add(rightMovement)
            .add(upMovement);
        
        this.camera.position.copy(newPosition);
        
        // DO NOT call lookAt() - this preserves the camera's orientation
    }

    /**
     * End camera panning
     */
    endCameraPan() {
        this.isPanning = false;
        this.container.style.cursor = 'default';
    }

    /**
     * Find the best target for hover/drag from intersections
     * Prioritizes components over containers for better UX
     */
    findBestHoverTarget(intersects) {
        // First, try to find any component in the intersections
        for (const intersect of intersects) {
            const object = intersect.object;
            if (object.userData.id && object.userData.type === 'component') {
                return object;
            }
        }
        
        // If no component found, try to find a container
        for (const intersect of intersects) {
            const object = intersect.object;
            if (object.userData.id && object.userData.type === 'container') {
                return object;
            }
        }
        
        return null;
    }

    /**
     * Find which container (if any) contains the given position
     */
    findContainerAtPosition(position) {
        if (!this.currentDiagram) return null;
        
        // Check all containers to see if the position is within their bounds
        for (const [containerId, containerData] of Object.entries(this.currentDiagram.containers)) {
            const containerMesh = this.meshes.get(containerId);
            if (containerMesh) {
                const bounds = this.getContainerBounds(containerMesh);
                
                if (position.x >= bounds.minX && position.x <= bounds.maxX &&
                    position.z >= bounds.minZ && position.z <= bounds.maxZ) {
                    return containerId;
                }
            }
        }
        
        return null; // Not inside any container
    }

    /**
     * Check if a component can be assigned to a specific container
     * This enforces business rules based on the original DSL structure
     */
    isValidContainerAssignment(componentId, newContainerId) {
        if (!this.currentDiagram || !componentId) return false;
        
        // If no container (moving to top level), always allow
        if (!newContainerId) return true;
        
        const component = this.currentDiagram.components[componentId];
        const newContainer = this.currentDiagram.containers[newContainerId];
        
        if (!component || !newContainer) return false;
        
        // Get original DSL structure to enforce rules
        // For now, we'll implement a simple validation based on component types and container purposes
        // You can extend this with more sophisticated rules based on your DSL requirements
        
        // Example validation rules:
        const componentType = component.properties.type;
        const containerLabel = newContainer.properties.label?.toLowerCase() || '';
        
        // Basic validation: database components should go in data containers
        if (componentType === 'db' && !containerLabel.includes('data')) {
            return false;
        }
        
        // API components should go in backend/service containers
        if (componentType === 'api' && containerLabel.includes('data')) {
            return false;
        }
        
        // Cache components are flexible but prefer data containers
        if (componentType === 'cache' && containerLabel.includes('backend') && containerLabel.includes('microservice')) {
            return false;
        }
        
        // Allow all other combinations for now
        return true;
    }

    /**
     * Show visual feedback when a component assignment is rejected
     */
    showContainerRejectionFeedback(containerMesh) {
        if (containerMesh.material) {
            const originalOpacity = containerMesh.material.opacity;
            containerMesh.material.opacity = 0.3;
            containerMesh.material.color.setHex(0xff4444); // Red tint for rejection
            
            // Reset after short delay
            setTimeout(() => {
                if (containerMesh.material) {
                    containerMesh.material.opacity = originalOpacity;
                    containerMesh.material.color.setHex(0xcccccc); // Back to normal
                }
            }, 500);
        }
    }

    /**
     * Update component's parent container relationship
     */
    updateComponentParentContainer(componentId, newContainerId) {
        if (!this.currentDiagram) return;
        
        const component = this.currentDiagram.components[componentId];
        if (!component) return;
        
        const oldContainerId = component.parent;
        
        // If parent hasn't changed, do nothing
        if (oldContainerId === newContainerId) return;
        
        // Remove from old container's children list
        if (oldContainerId && this.currentDiagram.containers[oldContainerId]) {
            const oldContainer = this.currentDiagram.containers[oldContainerId];
            if (oldContainer.children) {
                oldContainer.children = oldContainer.children.filter(id => id !== componentId);
            }
        }
        
        // Add to new container's children list
        if (newContainerId && this.currentDiagram.containers[newContainerId]) {
            const newContainer = this.currentDiagram.containers[newContainerId];
            if (!newContainer.children) {
                newContainer.children = [];
            }
            if (!newContainer.children.includes(componentId)) {
                newContainer.children.push(componentId);
            }
        }
        
        // Update component's parent reference
        component.parent = newContainerId;
        
        // Provide visual feedback
        if (newContainerId) {
            const containerMesh = this.meshes.get(newContainerId);
            if (containerMesh) {
                this.showContainerAssignmentFeedback(containerMesh);
            }
        }
    }

    /**
     * Show visual feedback when a component is assigned to a container
     */
    showContainerAssignmentFeedback(containerMesh) {
        if (containerMesh.material) {
            const originalOpacity = containerMesh.material.opacity;
            containerMesh.material.opacity = 0.3;
            containerMesh.material.color.setHex(0x66ff66); // Green tint for successful assignment
            
            // Reset after short delay
            setTimeout(() => {
                if (containerMesh.material) {
                    containerMesh.material.opacity = originalOpacity;
                    containerMesh.material.color.setHex(0xcccccc); // Back to normal
                }
            }, 300);
        }
    }

    /**
     * Get container bounds for boundary checking
     */
    getContainerBounds(containerMesh) {
        // Use stored size information if available
        const containerSize = containerMesh.userData.containerSize || {
            width: this.gridSize * 1.8,
            depth: this.gridSize * 1.2
        };
        
        return {
            minX: containerMesh.position.x - containerSize.width / 2,
            maxX: containerMesh.position.x + containerSize.width / 2,
            minZ: containerMesh.position.z - containerSize.depth / 2,
            maxZ: containerMesh.position.z + containerSize.depth / 2
        };
    }

    /**
     * Show visual feedback when boundary constraint is applied
     */
    showBoundaryConstraintFeedback(containerMesh) {
        // Temporarily highlight the container boundary
        if (containerMesh.material) {
            const originalOpacity = containerMesh.material.opacity;
            containerMesh.material.opacity = 0.4;
            containerMesh.material.color.setHex(0xff6666); // Reddish tint
            
            // Reset after short delay
            setTimeout(() => {
                if (containerMesh.material) {
                    containerMesh.material.opacity = originalOpacity;
                    containerMesh.material.color.setHex(0xcccccc); // Back to normal
                }
            }, 200);
        }
    }

    /**
     * Get object data from current diagram
     */
    getObjectData(objectId) {
        if (!this.currentDiagram) return null;
        
        return this.currentDiagram.components[objectId] || this.currentDiagram.containers[objectId];
    }

    /**
     * Move all children of a container when the container is moved
     */
    moveContainerChildren(containerId, delta) {
        if (!this.currentDiagram || !this.currentDiagram.containers[containerId]) return;
        
        const container = this.currentDiagram.containers[containerId];
        
        // Move all direct children
        if (container.children) {
            container.children.forEach(childId => {
                const childMesh = this.meshes.get(childId);
                if (childMesh) {
                    childMesh.position.add(delta);
                    
                    // If the child is also a container, recursively move its children
                    if (childMesh.userData.type === 'container') {
                        this.moveContainerChildren(childId, delta);
                    }
                }
            });
        }
    }

    /**
     * Update connections for a moved object and all its children
     */
    updateConnectionsForMovedObject(objectId) {
        // Update connections for the main object
        this.updateConnections(objectId);
        
        // If it's a container, update connections for all children recursively
        if (this.currentDiagram && this.currentDiagram.containers[objectId]) {
            const container = this.currentDiagram.containers[objectId];
            if (container.children) {
                container.children.forEach(childId => {
                    this.updateConnections(childId);
                    
                    // If child is also a container, recurse
                    if (this.currentDiagram.containers[childId]) {
                        this.updateConnectionsForMovedObject(childId);
                    }
                });
            }
        }
    }

    /**
     * Update connections for a moved object
     */
    updateConnections(objectId) {
        // Remove old connections involving this object
        const connectionsToRemove = this.connections.filter(connection => 
            connection.userData.fromId === objectId || connection.userData.toId === objectId
        );
        
        connectionsToRemove.forEach(connection => {
            this.scene.remove(connection);
            if (connection.geometry) connection.geometry.dispose();
            if (connection.material) connection.material.dispose();
        });
        
        // Remove from connections array
        this.connections = this.connections.filter(connection => 
            connection.userData.fromId !== objectId && connection.userData.toId !== objectId
        );
        
        // Recreate connections involving this object
        if (this.currentDiagram) {
            for (const relation of this.currentDiagram.relations) {
                if (relation.from === objectId || relation.to === objectId) {
                    const fromMesh = this.meshes.get(relation.from);
                    const toMesh = this.meshes.get(relation.to);
                    
                    if (fromMesh && toMesh) {
                        const connection = this.createConnection(fromMesh, toMesh, relation.label);
                        connection.userData.fromId = relation.from;
                        connection.userData.toId = relation.to;
                        this.scene.add(connection);
                        this.connections.push(connection);
                    }
                }
            }
        }
    }

    /**
     * Set object highlight state with colored border
     */
    setObjectHighlight(object, highlighted) {
        if (highlighted) {
            this.addHighlightBorder(object);
        } else {
            this.removeHighlightBorder(object);
        }
    }

    /**
     * Add colored border highlight to object
     */
    addHighlightBorder(object) {
        // Remove existing highlight if any
        this.removeHighlightBorder(object);
        
        let borderColor, borderWidth;
        
        if (object.userData.type === 'container') {
            borderColor = 0x4CAF50; // Green for containers
            borderWidth = 3;
        } else {
            borderColor = 0x2196F3; // Blue for components
            borderWidth = 2;
        }
        
        // Create border based on object type
        let borderGeometry;
        if (object.userData.type === 'container') {
            // Use stored container size or default
            const size = object.userData.containerSize || {
                width: this.gridSize * 1.8,
                height: this.containerHeight,
                depth: this.gridSize * 1.2
            };
            borderGeometry = new THREE.BoxGeometry(
                size.width + 4, 
                size.height + 4, 
                size.depth + 4
            );
        } else {
            // Component border - slightly larger than the component
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            borderGeometry = new THREE.BoxGeometry(
                size.x + 4,
                size.y + 4,
                size.z + 4
            );
        }
        
        // Create wireframe border
        const wireframe = new THREE.WireframeGeometry(borderGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({ 
            color: borderColor,
            linewidth: borderWidth,
            transparent: true,
            opacity: 0.8
        });
        
        const border = new THREE.LineSegments(wireframe, borderMaterial);
        border.position.copy(object.position);
        border.name = 'highlightBorder';
        
        // Add border to scene
        this.scene.add(border);
        object.userData.highlightBorder = border;
    }

    /**
     * Remove highlight border from object
     */
    removeHighlightBorder(object) {
        if (object.userData.highlightBorder) {
            this.scene.remove(object.userData.highlightBorder);
            if (object.userData.highlightBorder.geometry) {
                object.userData.highlightBorder.geometry.dispose();
            }
            if (object.userData.highlightBorder.material) {
                object.userData.highlightBorder.material.dispose();
            }
            delete object.userData.highlightBorder;
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
        // Store reference to current diagram for drag updates
        this.currentDiagram = diagram;
        
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
                const containerSize = position.containerSize;
                const mesh = this.createContainerMesh(container, position, containerSize);
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
                connection.userData.fromId = relation.from;
                connection.userData.toId = relation.to;
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

        // Simple grid layout with increased spacing
        let x = 0, z = 0;
        const spacing = this.gridSize * 1.5;

        // Position containers first and calculate their required sizes
        for (const [id, container] of Object.entries(diagram.containers)) {
            if (!container.parent) { // Only top-level containers
                // Calculate required container size based on children
                const containerInfo = this.calculateContainerLayout(id, container, diagram, spacing);
                
                layout.containers[id] = { x, y: 0, z };
                
                // Position children within container bounds
                for (const [childId, childPos] of Object.entries(containerInfo.childPositions)) {
                    if (diagram.components[childId]) {
                        layout.components[childId] = {
                            x: x + childPos.x,
                            y: 5,
                            z: z + childPos.z
                        };
                    } else if (diagram.containers[childId]) {
                        layout.containers[childId] = {
                            x: x + childPos.x,
                            y: 5,
                            z: z + childPos.z
                        };
                    }
                }
                
                // Store container size for later use
                layout.containers[id].containerSize = containerInfo.size;
                
                x += containerInfo.size.width + spacing;
                if (x > spacing * 4) {
                    x = 0;
                    z += containerInfo.size.depth + spacing;
                }
            }
        }

        // Position components that don't belong to any container
        for (const [id, component] of Object.entries(diagram.components)) {
            if (!component.parent) { // Only top-level components
                layout.components[id] = { x, y: 0, z };
                x += spacing;
                if (x > spacing * 3) {
                    x = 0;
                    z += spacing;
                }
            }
        }

        return layout;
    }

    /**
     * Calculate optimal layout for a container and its children
     */
    calculateContainerLayout(containerId, container, diagram, spacing) {
        const children = container.children || [];
        const componentSpacing = spacing * 0.5;
        const margin = 30; // Margin inside container
        
        // Arrange children in a grid within the container
        let childX = -componentSpacing;
        let childZ = 0;
        let maxX = 0;
        let maxZ = 0;
        let currentRowHeight = 0;
        
        const childPositions = {};
        const itemsPerRow = Math.max(2, Math.ceil(Math.sqrt(children.length)));
        
        for (let i = 0; i < children.length; i++) {
            const childId = children[i];
            
            if (i % itemsPerRow === 0 && i > 0) {
                // Move to next row
                childX = -componentSpacing;
                childZ += currentRowHeight + componentSpacing;
                currentRowHeight = 0;
            } else if (i > 0) {
                childX += componentSpacing;
            }
            
            childPositions[childId] = { x: childX, z: childZ };
            
            // Track dimensions for container sizing
            maxX = Math.max(maxX, Math.abs(childX));
            maxZ = Math.max(maxZ, Math.abs(childZ));
            currentRowHeight = Math.max(currentRowHeight, componentSpacing * 0.8);
        }
        
        // Calculate container size with margins
        const containerWidth = Math.max(this.gridSize * 1.8, (maxX * 2) + margin * 2 + componentSpacing);
        const containerDepth = Math.max(this.gridSize * 1.2, maxZ + currentRowHeight + margin * 2);
        
        return {
            childPositions,
            size: {
                width: containerWidth,
                height: this.containerHeight,
                depth: containerDepth
            }
        };
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
            const label = this.createTextLabel(component.properties.label, 1, false); // Enhanced component label
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
    createContainerMesh(container, position, containerSize = null) {
        // Use calculated size or default
        const containerWidth = containerSize ? containerSize.width : this.gridSize * 1.8;
        const containerDepth = containerSize ? containerSize.depth : this.gridSize * 1.2;
        
        const geometry = new THREE.BoxGeometry(
            containerWidth, 
            this.containerHeight, 
            containerDepth
        );
        
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xcccccc,
            transparent: true,
            opacity: 0.1, // Much more transparent
            wireframe: false,
            depthWrite: false // Don't write to depth buffer to avoid blocking
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y + this.containerHeight/2, position.z);
        mesh.receiveShadow = true;

        // Store size information for boundary calculations
        mesh.userData.containerSize = {
            width: containerWidth,
            height: this.containerHeight,
            depth: containerDepth
        };

        // Remove wireframe outline for cleaner look
        // const wireframe = new THREE.WireframeGeometry(geometry);
        // const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0x888888 }));
        // mesh.add(line);

        // Add subtle outline only at the bottom edge
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x999999, 
            transparent: true, 
            opacity: 0.3 
        });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
        mesh.add(edgeLines);

        // Add label with enhanced styling
        if (container.properties.label) {
            const label = this.createTextLabel(container.properties.label, 1, true); // Enhanced label
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
            const labelSprite = this.createTextLabel(label, 0.5, false); // Enhanced connection label
            const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
            labelSprite.position.copy(midPoint);
            labelSprite.position.y += 10;
            line.add(labelSprite);
        }

        return line;
    }

    /**
     * Create text label sprite with enhanced styling
     */
    createTextLabel(text, scale = 1, isContainer = false) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = isContainer ? 28 : 32;
        
        canvas.width = 320;
        canvas.height = isContainer ? 80 : 64;
        
        // Enhanced background with gradient and border
        if (isContainer) {
            // Container labels get a more prominent style
            const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(100, 150, 200, 0.9)');
            gradient.addColorStop(1, 'rgba(70, 120, 170, 0.9)');
            context.fillStyle = gradient;
        } else {
            // Component labels get a subtle style
            context.fillStyle = 'rgba(255, 255, 255, 0.95)';
        }
        
        // Rounded rectangle background
        const borderRadius = 8;
        const x = 4;
        const y = 4;
        const width = canvas.width - 8;
        const height = canvas.height - 8;
        
        context.beginPath();
        context.moveTo(x + borderRadius, y);
        context.lineTo(x + width - borderRadius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
        context.lineTo(x + width, y + height - borderRadius);
        context.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
        context.lineTo(x + borderRadius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
        context.lineTo(x, y + borderRadius);
        context.quadraticCurveTo(x, y, x + borderRadius, y);
        context.closePath();
        context.fill();
        
        // Add border
        context.strokeStyle = isContainer ? 'rgba(255, 255, 255, 0.8)' : 'rgba(200, 200, 200, 0.8)';
        context.lineWidth = 2;
        context.stroke();
        
        // Text with shadow for better readability
        context.font = `bold ${fontSize}px Arial, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Text shadow
        context.fillStyle = 'rgba(0, 0, 0, 0.3)';
        context.fillText(text, canvas.width / 2 + 1, canvas.height / 2 + 1);
        
        // Main text
        context.fillStyle = isContainer ? '#ffffff' : '#333333';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(25 * scale, (isContainer ? 12 : 10) * scale, 1);

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
     * Clear all rendered objects
     */
    clear() {
        // Remove meshes and their highlight borders
        for (const mesh of this.meshes.values()) {
            // Remove highlight border if exists
            this.removeHighlightBorder(mesh);
            
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
        this.draggedObject = null;
        this.isDragging = false;
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
