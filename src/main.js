/**
 * Main Application Entry Point
 * Coordinates the DSL parser and 3D renderer
 */

import DSLParser from './parser.js';
import IsometricRenderer from './renderer.js';

class IsometricDiagramApp {
    constructor() {
        this.parser = new DSLParser();
        this.renderer = null;
        this.currentDiagram = null;
        
        this.initializeUI();
        this.setupEventListeners();
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Get DOM elements
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            dslEditor: document.getElementById('dslEditor'),
            parseButton: document.getElementById('parseButton'),
            errorMessage: document.getElementById('errorMessage'),
            canvasContainer: document.getElementById('canvasContainer'),
            loading: document.getElementById('loading'),
            zoomSlider: document.getElementById('zoomSlider'),
            rotationSlider: document.getElementById('rotationSlider'),
            resetViewButton: document.getElementById('resetView'),
            exportButton: document.getElementById('exportBtn'),
            loadSampleButton: document.getElementById('loadSample'),
            sampleDsl: document.getElementById('sampleDsl')
        };

        // Initialize renderer
        this.renderer = new IsometricRenderer(this.elements.canvasContainer);
        
        // Set initial sample DSL
        this.elements.dslEditor.value = this.elements.sampleDsl.textContent.trim();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // File input
        this.elements.fileInput.addEventListener('change', this.handleFileLoad.bind(this));
        
        // Parse button
        this.elements.parseButton.addEventListener('click', this.handleParse.bind(this));
        
        // Editor auto-parse on change (debounced)
        let parseTimeout;
        this.elements.dslEditor.addEventListener('input', () => {
            clearTimeout(parseTimeout);
            parseTimeout = setTimeout(() => {
                this.handleParse();
            }, 1000);
        });

        // Controls
        this.elements.zoomSlider.addEventListener('input', (e) => {
            this.renderer.setZoom(parseFloat(e.target.value));
        });

        this.elements.rotationSlider.addEventListener('input', (e) => {
            this.renderer.setRotation(parseFloat(e.target.value));
        });

        this.elements.resetViewButton.addEventListener('click', () => {
            this.renderer.resetView();
            this.elements.zoomSlider.value = '1';
            this.elements.rotationSlider.value = '0';
        });

        this.elements.exportButton.addEventListener('click', () => {
            this.renderer.exportPNG();
        });

        this.elements.loadSampleButton.addEventListener('click', () => {
            this.elements.dslEditor.value = this.elements.sampleDsl.textContent.trim();
            this.handleParse();
        });

        // Drag and drop for file input
        this.setupDragAndDrop();

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const dropZone = this.elements.fileInput.parentElement;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.background = '#f0f8ff';
                dropZone.style.borderColor = '#667eea';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.background = 'white';
                dropZone.style.borderColor = '#ddd';
            }, false);
        });

        dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
    }

    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle file drop
     */
    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadFile(files[0]);
        }
    }

    /**
     * Handle file input change
     */
    handleFileLoad(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadFile(file);
        }
    }

    /**
     * Load file content into editor
     */
    loadFile(file) {
        if (!file.name.endsWith('.dsl') && !file.name.endsWith('.txt')) {
            this.showError('Please select a .dsl or .txt file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.elements.dslEditor.value = e.target.result;
            this.handleParse();
        };
        reader.onerror = () => {
            this.showError('Error reading file');
        };
        reader.readAsText(file);
    }

    /**
     * Handle parse button click
     */
    async handleParse() {
        const dslContent = this.elements.dslEditor.value.trim();
        
        if (!dslContent) {
            this.showError('Please enter DSL content or load a file');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            // Parse DSL
            const diagram = this.parser.parse(dslContent);
            
            // Validate diagram
            this.parser.validate(diagram);
            
            // Store current diagram
            this.currentDiagram = diagram;
            
            // Render diagram
            await this.renderDiagram(diagram);
            
            // Save to localStorage
            this.saveDiagram(dslContent);
            
            console.log('Diagram parsed and rendered successfully:', diagram);
            
        } catch (error) {
            console.error('Parse error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Render parsed diagram
     */
    async renderDiagram(diagram) {
        return new Promise((resolve) => {
            // Small delay to show loading
            setTimeout(() => {
                this.renderer.render(diagram);
                resolve();
            }, 100);
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        // Ctrl+Enter or Cmd+Enter to parse
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.handleParse();
        }
        
        // Escape to clear selection
        if (e.key === 'Escape') {
            this.renderer.selectedObject = null;
        }
        
        // Ctrl+S to save (export)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.renderer.exportPNG();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    /**
     * Hide error message
     */
    hideError() {
        this.elements.errorMessage.style.display = 'none';
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
        this.elements.parseButton.disabled = show;
    }

    /**
     * Save diagram to localStorage
     */
    saveDiagram(dslContent) {
        try {
            localStorage.setItem('isometric-diagram-dsl', dslContent);
            localStorage.setItem('isometric-diagram-timestamp', Date.now().toString());
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }

    /**
     * Load diagram from localStorage
     */
    loadSavedDiagram() {
        try {
            const savedDsl = localStorage.getItem('isometric-diagram-dsl');
            if (savedDsl) {
                this.elements.dslEditor.value = savedDsl;
                this.handleParse();
                return true;
            }
        } catch (error) {
            console.warn('Could not load from localStorage:', error);
        }
        return false;
    }

    /**
     * Get diagram statistics
     */
    getDiagramStats() {
        if (!this.currentDiagram) return null;

        return {
            components: Object.keys(this.currentDiagram.components).length,
            containers: Object.keys(this.currentDiagram.containers).length,
            relations: this.currentDiagram.relations.length,
            annotations: Object.keys(this.currentDiagram.annotations).length,
            styles: Object.keys(this.currentDiagram.styles).length
        };
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Sample DSL definitions for different use cases
const sampleDSLs = {
    microservices: `layout direction=LR ranksep=80 nodesep=50

style user icon=👤 color=#4CAF50 shape=rectangle
style api icon=⚙️ color=#2196F3 shape=pyramid
style db icon=🗄️ color=#9C27B0 shape=cylinder
style queue icon=📬 color=#FF9800 shape=cylinder
style cache icon=⚡ color=#F44336 shape=rectangle

component frontend {
  label "React Frontend"
  type user
}

container backend {
  label "Microservices"
  
  component auth_api {
    label "Auth Service"
    type api
  }
  
  component user_api {
    label "User Service"
    type api
  }
  
  component order_api {
    label "Order Service"
    type api
  }
}

container data {
  label "Data Layer"
  
  component user_db {
    label "User DB"
    type db
  }
  
  component order_db {
    label "Order DB"
    type db
  }
  
  component redis {
    label "Redis Cache"
    type cache
  }
  
  component queue {
    label "Message Queue"
    type queue
  }
}

relation frontend -> auth_api : "Login"
relation frontend -> user_api : "Profile"
relation frontend -> order_api : "Orders"
relation auth_api -> user_db : "Validate"
relation user_api -> user_db : "CRUD"
relation user_api -> redis : "Cache"
relation order_api -> order_db : "Store"
relation order_api -> queue : "Events"

annotation auth_api {
  tooltip "JWT-based authentication"
  link "https://auth.example.com/docs"
}

annotation redis {
  tooltip "Session and data caching"
}`,

    aws: `layout direction=TB ranksep=60 nodesep=40

style user icon=👤 color=#4CAF50 shape=rectangle
style lb icon=⚖️ color=#FF9800 shape=pyramid
style server icon=🖥️ color=#2196F3 shape=rectangle
style db icon=🗄️ color=#9C27B0 shape=cylinder
style storage icon=💾 color=#607D8B shape=cylinder

component users {
  label "Users"
  type user
}

component alb {
  label "Application Load Balancer"
  type lb
}

container ec2_cluster {
  label "EC2 Auto Scaling Group"
  
  component web1 {
    label "Web Server 1"
    type server
  }
  
  component web2 {
    label "Web Server 2"
    type server
  }
}

container database {
  label "RDS MySQL"
  
  component primary_db {
    label "Primary DB"
    type db
  }
  
  component replica_db {
    label "Read Replica"
    type db
  }
}

component s3 {
  label "S3 Storage"
  type storage
}

relation users -> alb : "HTTPS"
relation alb -> web1 : "HTTP"
relation alb -> web2 : "HTTP"
relation web1 -> primary_db : "Write"
relation web2 -> replica_db : "Read"
relation web1 -> s3 : "Assets"
relation web2 -> s3 : "Assets"

annotation alb {
  tooltip "Distributes traffic across instances"
  link "https://aws.amazon.com/elasticloadbalancing"
}

annotation s3 {
  tooltip "Static assets and file storage"
  link "https://aws.amazon.com/s3"
}`
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new IsometricDiagramApp();
    
    // Try to load saved diagram, otherwise show sample
    if (!app.loadSavedDiagram()) {
        // Load sample DSL and render it
        setTimeout(() => {
            app.handleParse();
        }, 500);
    }
    
    // Make app globally available for debugging
    window.diagramApp = app;
    window.sampleDSLs = sampleDSLs;
    
    console.log('🏗️ Isometric Diagram Creator initialized');
    console.log('Available sample DSLs:', Object.keys(sampleDSLs));
    console.log('Load samples with: diagramApp.elements.dslEditor.value = sampleDSLs.microservices');
});

export default IsometricDiagramApp;
