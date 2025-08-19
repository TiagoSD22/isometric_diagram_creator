// JavaScript D3.js integration for isometric diagram rendering

// Global variables
let svg, g, zoom, tooltip;
let currentDiagram = null;

// Initialize the application
function initializeApp() {
    setupSVG();
    setupTooltip();
    setupElmIntegration();
}

// Setup SVG and zoom behavior
function setupSVG() {
    svg = d3.select("#diagram-svg");
    
    // Clear any existing content
    svg.selectAll("*").remove();
    
    // Add defs for markers and patterns
    const defs = svg.append("defs");
    
    // Arrow marker
    defs.append("marker")
        .attr("id", "arrowhead")
        .attr("markerWidth", 10)
        .attr("markerHeight", 7)
        .attr("refX", 9)
        .attr("refY", 3.5)
        .attr("orient", "auto")
        .append("polygon")
        .attr("points", "0 0, 10 3.5, 0 7")
        .attr("fill", "#666");
    
    // Container pattern for isometric depth
    defs.append("pattern")
        .attr("id", "containerPattern")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 4)
        .attr("height", 4)
        .append("rect")
        .attr("width", 4)
        .attr("height", 4)
        .attr("fill", "rgba(33, 150, 243, 0.1)");
    
    // Setup zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on("zoom", handleZoom);
    
    svg.call(zoom);
    
    // Main group for all diagram elements
    g = svg.append("g").attr("class", "diagram-group");
}

// Setup tooltip
function setupTooltip() {
    tooltip = d3.select("#tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("id", "tooltip")
            .attr("class", "tooltip")
            .style("display", "none");
    }
}

// Handle zoom events
function handleZoom(event) {
    g.attr("transform", event.transform);
}

// Main function to parse and render diagram
function parseAndRender() {
    const dslInput = document.getElementById("dsl-input").value;
    const errorDisplay = document.getElementById("error-display");
    
    try {
        // Clear previous errors
        errorDisplay.innerHTML = "";
        
        // Parse DSL (simplified parser for demo)
        const diagram = parseSimpleDSL(dslInput);
        
        // Render the diagram
        renderDiagram(diagram);
        
    } catch (error) {
        console.error("Parse error:", error);
        errorDisplay.innerHTML = `<div class="error">Parse Error: ${error.message}</div>`;
    }
}

// Simplified DSL parser (for demo purposes)
function parseSimpleDSL(dslText) {
    const lines = dslText.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));
    
    const diagram = {
        layout: { direction: "LR", ranksep: 50, nodesep: 30 },
        styles: {},
        components: [],
        containers: [],
        relations: [],
        annotations: []
    };
    
    let containerStack = [];
    let currentContext = { type: 'root', target: diagram };
    let inBlock = false;
    let blockContent = [];
    let blockType = null;
    let blockTarget = null;
    
    for (let line of lines) {
        if (line === '{') {
            inBlock = true;
            blockContent = [];
            continue;
        } else if (line === '}') {
            if (inBlock) {
                // Process block content
                if (blockType && blockTarget) {
                    processBlock(blockType, blockTarget, blockContent, diagram);
                }
                inBlock = false;
                blockContent = [];
                blockType = null;
                blockTarget = null;
                
                // Pop container from stack if we're closing a container
                if (containerStack.length > 0) {
                    containerStack.pop();
                    currentContext = containerStack.length > 0 ? 
                        containerStack[containerStack.length - 1] : 
                        { type: 'root', target: diagram };
                }
            }
            continue;
        }
        
        if (inBlock) {
            blockContent.push(line);
        } else {
            if (line.startsWith('layout ')) {
                parseLayout(line, diagram);
            } else if (line.startsWith('style ')) {
                parseStyle(line, diagram);
            } else if (line.startsWith('component ')) {
                const comp = parseComponentHeader(line);
                blockType = 'component';
                blockTarget = comp;
            } else if (line.startsWith('container ')) {
                const cont = parseContainerHeader(line);
                blockType = 'container';
                blockTarget = cont;
            } else if (line.startsWith('relation ')) {
                parseRelation(line, diagram);
            } else if (line.startsWith('annotation ')) {
                const ann = parseAnnotationHeader(line);
                blockType = 'annotation';
                blockTarget = ann;
            }
        }
    }
    
    return diagram;
}

// Parse layout directive
function parseLayout(line, diagram) {
    const matches = line.match(/layout\s+(.+)/);
    if (matches) {
        const attrs = parseAttributes(matches[1]);
        diagram.layout = {
            direction: attrs.direction || "LR",
            ranksep: parseFloat(attrs.ranksep) || 50,
            nodesep: parseFloat(attrs.nodesep) || 30
        };
    }
}

// Parse style directive
function parseStyle(line, diagram) {
    const matches = line.match(/style\s+(\w+)\s+(.+)/);
    if (matches) {
        const styleName = matches[1];
        const attrs = parseAttributes(matches[2]);
        diagram.styles[styleName] = {
            icon: attrs.icon,
            color: attrs.color || "#4CAF50",
            image: attrs.image
        };
    }
}

// Parse component
function parseComponent(line, diagram, container) {
    const matches = line.match(/component\s+(\w+)/);
    if (matches) {
        const component = {
            id: matches[1],
            label: matches[1],
            type: "component",
            style: null,
            position: null,
            size: { width: 120, height: 60 }
        };
        
        if (container) {
            if (!container.components) container.components = [];
            container.components.push(component);
        } else {
            diagram.components.push(component);
        }
    }
}

// Parse component header (for block processing)
function parseComponentHeader(line) {
    const matches = line.match(/component\s+(\w+)/);
    if (matches) {
        return {
            id: matches[1],
            label: matches[1],
            type: "component",
            style: null,
            position: null,
            size: { width: 120, height: 60 }
        };
    }
    return null;
}

// Parse container
function parseContainer(line, diagram) {
    const matches = line.match(/container\s+(\w+)/);
    if (matches) {
        const container = {
            id: matches[1],
            label: matches[1],
            position: null,
            size: { width: 200, height: 150 },
            components: [],
            containers: [],
            style: null
        };
        
        diagram.containers.push(container);
        return container;
    }
    return null;
}

// Parse container header (for block processing)
function parseContainerHeader(line) {
    const matches = line.match(/container\s+(\w+)/);
    if (matches) {
        return {
            id: matches[1],
            label: matches[1],
            position: null,
            size: { width: 200, height: 150 },
            components: [],
            containers: [],
            style: null
        };
    }
    return null;
}

// Parse relation
function parseRelation(line, diagram) {
    const matches = line.match(/relation\s+(\w+)\s+->\s+(\w+)(?:\s*:\s*"([^"]*)")?/);
    if (matches) {
        diagram.relations.push({
            from: matches[1],
            to: matches[2],
            label: matches[3] || null
        });
    }
}

// Parse annotation
function parseAnnotation(line, diagram) {
    const matches = line.match(/annotation\s+(\w+)/);
    if (matches) {
        diagram.annotations.push({
            target: matches[1],
            tooltip: null,
            link: null
        });
    }
}

// Parse annotation header (for block processing)
function parseAnnotationHeader(line) {
    const matches = line.match(/annotation\s+(\w+)/);
    if (matches) {
        return {
            target: matches[1],
            tooltip: null,
            link: null
        };
    }
    return null;
}

// Process block content
function processBlock(blockType, blockTarget, blockContent, diagram) {
    const attributes = {};
    
    // Parse attributes from block content
    for (let line of blockContent) {
        if (line.startsWith('label ')) {
            const labelMatch = line.match(/label\s+"([^"]+)"/);
            if (labelMatch) {
                attributes.label = labelMatch[1];
            }
        } else if (line.startsWith('type ')) {
            const typeMatch = line.match(/type\s+(\w+)/);
            if (typeMatch) {
                attributes.type = typeMatch[1];
            }
        } else if (line.startsWith('tooltip ')) {
            const tooltipMatch = line.match(/tooltip\s+"([^"]+)"/);
            if (tooltipMatch) {
                attributes.tooltip = tooltipMatch[1];
            }
        } else if (line.startsWith('link ')) {
            const linkMatch = line.match(/link\s+"([^"]+)"/);
            if (linkMatch) {
                attributes.link = linkMatch[1];
            }
        } else if (line.startsWith('style ')) {
            const styleMatch = line.match(/style\s+(\w+)/);
            if (styleMatch) {
                attributes.style = styleMatch[1];
            }
        }
    }
    
    // Apply attributes to target
    Object.assign(blockTarget, attributes);
    
    // Add target to appropriate collection
    if (blockType === 'component') {
        diagram.components.push(blockTarget);
    } else if (blockType === 'container') {
        diagram.containers.push(blockTarget);
    } else if (blockType === 'annotation') {
        diagram.annotations.push(blockTarget);
    }
}

// Parse attributes from string
function parseAttributes(attrString) {
    const attrs = {};
    const regex = /(\w+)=([^=\s]+|"[^"]*")/g;
    let match;
    
    while ((match = regex.exec(attrString)) !== null) {
        let value = match[2];
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        attrs[match[1]] = value;
    }
    
    return attrs;
}

// Main render function
function renderDiagram(diagram) {
    currentDiagram = diagram;
    
    // Clear existing diagram
    g.selectAll("*").remove();
    
    // Calculate layout
    const layout = calculateIsometricLayout(diagram);
    
    // Render containers first (background)
    renderContainers(layout.containers);
    
    // Render components
    renderComponents(layout.components);
    
    // Render relations
    renderRelations(layout.relations);
    
    // Fit diagram to view
    fitDiagramToView(layout.bounds);
}

// Calculate isometric layout
function calculateIsometricLayout(diagram) {
    const isometricAngle = Math.PI / 6; // 30 degrees
    const spacing = 150;
    const containerSpacing = 300;
    
    // Function to convert 3D to 2D isometric
    const toIsometric = (point3d) => ({
        x: point3d.x + point3d.z * Math.cos(isometricAngle),
        y: point3d.y + point3d.z * Math.sin(isometricAngle)
    });
    
    const layout = {
        components: [],
        containers: [],
        relations: [],
        bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 }
    };
    
    // Layout top-level components
    diagram.components.forEach((comp, i) => {
        const pos3d = { x: i * spacing, y: 0, z: 0 };
        const pos2d = toIsometric(pos3d);
        
        layout.components.push({
            ...comp,
            position: pos2d,
            position3d: pos3d,
            isometric: pos2d
        });
    });
    
    // Layout containers
    diagram.containers.forEach((cont, i) => {
        const pos3d = { x: i * containerSpacing, y: 200, z: 0 };
        const pos2d = toIsometric(pos3d);
        
        const containerLayout = {
            ...cont,
            position: pos2d,
            position3d: pos3d,
            isometric: pos2d,
            children: []
        };
        
        // Layout components inside container
        if (cont.components) {
            cont.components.forEach((comp, j) => {
                const childPos3d = { 
                    x: pos3d.x + 20 + j * 100, 
                    y: pos3d.y + 40, 
                    z: pos3d.z + 10 
                };
                const childPos2d = toIsometric(childPos3d);
                
                containerLayout.children.push({
                    ...comp,
                    position: childPos2d,
                    position3d: childPos3d,
                    isometric: childPos2d
                });
                
                layout.components.push({
                    ...comp,
                    position: childPos2d,
                    position3d: childPos3d,
                    isometric: childPos2d
                });
            });
        }
        
        layout.containers.push(containerLayout);
    });
    
    // Create relation paths
    diagram.relations.forEach(rel => {
        const fromNode = findNode(rel.from, layout);
        const toNode = findNode(rel.to, layout);
        
        if (fromNode && toNode) {
            layout.relations.push({
                ...rel,
                from: fromNode,
                to: toNode,
                path: calculateRelationPath(fromNode, toNode)
            });
        }
    });
    
    // Calculate bounds
    const allNodes = [...layout.components, ...layout.containers];
    if (allNodes.length > 0) {
        const xs = allNodes.map(n => n.position.x);
        const ys = allNodes.map(n => n.position.y);
        layout.bounds = {
            minX: Math.min(...xs) - 50,
            maxX: Math.max(...xs) + 200,
            minY: Math.min(...ys) - 50,
            maxY: Math.max(...ys) + 150
        };
    }
    
    return layout;
}

// Find node by ID
function findNode(id, layout) {
    return layout.components.find(c => c.id === id) || 
           layout.containers.find(c => c.id === id);
}

// Calculate relation path
function calculateRelationPath(fromNode, toNode) {
    const fromPoint = {
        x: fromNode.position.x + fromNode.size.width,
        y: fromNode.position.y + fromNode.size.height / 2
    };
    
    const toPoint = {
        x: toNode.position.x,
        y: toNode.position.y + toNode.size.height / 2
    };
    
    return [fromPoint, toPoint];
}

// Render containers with isometric effect
function renderContainers(containers) {
    const containerGroup = g.append("g").attr("class", "containers");
    
    containers.forEach(container => {
        const containerG = containerGroup.append("g")
            .attr("class", "container")
            .attr("transform", `translate(${container.position.x}, ${container.position.y})`);
        
        // Draw isometric container box
        drawIsometricBox(containerG, container.size, "#2196F3", 0.1);
        
        // Container label
        containerG.append("text")
            .attr("class", "container-label")
            .attr("x", container.size.width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("fill", "#2196F3")
            .text(container.label);
    });
}

// Render components
function renderComponents(components) {
    const componentGroup = g.append("g").attr("class", "components");
    
    components.forEach(component => {
        const compG = componentGroup.append("g")
            .attr("class", "component")
            .attr("transform", `translate(${component.position.x}, ${component.position.y})`)
            .on("mouseover", (event) => showTooltip(event, component))
            .on("mouseout", hideTooltip);
        
        // Get style
        const style = currentDiagram.styles[component.style] || 
                     currentDiagram.styles[component.type] || 
                     { color: "#4CAF50", icon: null };
        
        // Draw isometric component box
        drawIsometricBox(compG, component.size, style.color, 0.8);
        
        // Component icon
        if (style.icon) {
            compG.append("text")
                .attr("class", "component-icon")
                .attr("x", component.size.width / 2)
                .attr("y", component.size.height / 2 - 10)
                .attr("text-anchor", "middle")
                .attr("font-size", "24px")
                .text(style.icon);
        }
        
        // Component label
        compG.append("text")
            .attr("class", "component-label")
            .attr("x", component.size.width / 2)
            .attr("y", component.size.height / 2 + 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text(component.label);
    });
}

// Draw isometric box
function drawIsometricBox(parent, size, color, opacity) {
    const depth = 10;
    const angle = Math.PI / 6; // 30 degrees
    
    // Front face
    parent.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("fill", color)
        .attr("fill-opacity", opacity)
        .attr("stroke", color)
        .attr("stroke-width", 2);
    
    // Top face (parallelogram)
    const topPath = `M 0,0 L ${depth * Math.cos(angle)},${-depth * Math.sin(angle)} L ${size.width + depth * Math.cos(angle)},${-depth * Math.sin(angle)} L ${size.width},0 Z`;
    parent.append("path")
        .attr("d", topPath)
        .attr("fill", color)
        .attr("fill-opacity", opacity * 0.7)
        .attr("stroke", color)
        .attr("stroke-width", 1);
    
    // Right face (parallelogram)
    const rightPath = `M ${size.width},0 L ${size.width + depth * Math.cos(angle)},${-depth * Math.sin(angle)} L ${size.width + depth * Math.cos(angle)},${size.height - depth * Math.sin(angle)} L ${size.width},${size.height} Z`;
    parent.append("path")
        .attr("d", rightPath)
        .attr("fill", color)
        .attr("fill-opacity", opacity * 0.5)
        .attr("stroke", color)
        .attr("stroke-width", 1);
}

// Render relations
function renderRelations(relations) {
    const relationGroup = g.append("g").attr("class", "relations");
    
    relations.forEach(relation => {
        const path = relation.path;
        if (path.length >= 2) {
            // Draw line
            relationGroup.append("line")
                .attr("class", "relation-line")
                .attr("x1", path[0].x)
                .attr("y1", path[0].y)
                .attr("x2", path[1].x)
                .attr("y2", path[1].y)
                .attr("stroke", "#666")
                .attr("stroke-width", 2)
                .attr("marker-end", "url(#arrowhead)");
            
            // Draw label if exists
            if (relation.label) {
                const midX = (path[0].x + path[1].x) / 2;
                const midY = (path[0].y + path[1].y) / 2;
                
                relationGroup.append("text")
                    .attr("class", "relation-label")
                    .attr("x", midX)
                    .attr("y", midY - 5)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "11px")
                    .attr("fill", "#333")
                    .text(relation.label);
            }
        }
    });
}

// Show tooltip
function showTooltip(event, component) {
    const annotation = currentDiagram.annotations.find(a => a.target === component.id);
    const tooltipText = annotation?.tooltip || `${component.label} (${component.type})`;
    
    tooltip
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .html(tooltipText);
}

// Hide tooltip
function hideTooltip() {
    tooltip.style("display", "none");
}

// Fit diagram to view
function fitDiagramToView(bounds) {
    const svgElement = svg.node();
    const svgRect = svgElement.getBoundingClientRect();
    
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    const scale = Math.min(
        (svgRect.width - 100) / width,
        (svgRect.height - 100) / height,
        1
    );
    
    const translateX = (svgRect.width - width * scale) / 2 - bounds.minX * scale;
    const translateY = (svgRect.height - height * scale) / 2 - bounds.minY * scale;
    
    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity
            .translate(translateX, translateY)
            .scale(scale));
}

// Export SVG
function exportSVG() {
    const svgElement = document.getElementById("diagram-svg");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "architecture-diagram.svg";
    link.click();
    
    URL.revokeObjectURL(url);
}

// Setup Elm integration (if using Elm)
function setupElmIntegration() {
    // This would be used if we compile the Elm app
    // For now, we'll use the pure JS version
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", function() {
    initializeApp();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            parseAndRender();
        } else if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            exportSVG();
        }
    });
    
    // Auto-render on input change (debounced)
    const dslInput = document.getElementById('dsl-input');
    let renderTimeout;
    dslInput.addEventListener('input', function() {
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            parseAndRender();
        }, 1000); // Auto-render after 1 second of no typing
    });
    
    // Parse and render the initial diagram
    setTimeout(() => {
        parseAndRender();
    }, 100);
});

// Load example DSL files
function loadExample(exampleName) {
    if (!exampleName) return;
    
    const examples = {
        'simple-web-app': `// Simple Web Application Architecture
layout direction=LR ranksep=80 nodesep=40

style user icon=👤 color=#4CAF50
style frontend icon=🌐 color=#2196F3
style backend icon=⚙️ color=#FF9800
style database icon=🗄️ color=#9C27B0

component user {
  label "User"
  type actor
}

component frontend {
  label "React Frontend"
  type web
}

component backend {
  label "Node.js API"
  type service
}

component database {
  label "PostgreSQL"
  type database
}

relation user -> frontend : "browses"
relation frontend -> backend : "API calls"
relation backend -> database : "queries"

annotation user {
  tooltip "End users of the web application"
}`,
        
        'microservices': `// Microservices Architecture
layout direction=TB ranksep=100 nodesep=60

style user icon=👤 color=#4CAF50
style gateway icon=🚪 color=#2196F3
style service icon=⚙️ color=#FF9800
style database icon=🗄️ color=#9C27B0

component user {
  label "Mobile App"
  type client
}

component api_gateway {
  label "API Gateway"
  type gateway
}

container microservices {
  label "Microservices Cluster"
  
  component user_api {
    label "User Service"
    type service
  }
  
  component order_api {
    label "Order Service"
    type service
  }
}

relation user -> api_gateway : "HTTP/HTTPS"
relation api_gateway -> user_api : "routes"
relation api_gateway -> order_api : "routes"`,
        
        'cloud-infrastructure': `// Cloud Infrastructure Architecture
layout direction=LR ranksep=120 nodesep=80

style user icon=👥 color=#4CAF50
style cdn icon=🌐 color=#2196F3
style lb icon=⚖️ color=#FF9800
style server icon=🖥️ color=#9C27B0

component users {
  label "Users"
  type actor
}

component cdn {
  label "CloudFront CDN"
  type cdn
}

container aws_cloud {
  label "AWS Cloud Infrastructure"
  
  component load_balancer {
    label "Load Balancer"
    type lb
  }
  
  component web_server {
    label "Web Server"
    type server
  }
}

relation users -> cdn : "requests"
relation cdn -> load_balancer : "cache miss"
relation load_balancer -> web_server : "distributes"`
    };
    
    const dslInput = document.getElementById('dsl-input');
    if (examples[exampleName]) {
        dslInput.value = examples[exampleName];
        parseAndRender();
    }
    
    // Reset select
    document.querySelector('.example-selector').value = '';
}

// Load DSL file from user's computer
function loadFile(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('dsl-input').value = e.target.result;
            parseAndRender();
        };
        reader.readAsText(file);
    }
}
