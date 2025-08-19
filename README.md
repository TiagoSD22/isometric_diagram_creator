# 🏗️ Isometric Architecture Diagram Creator

A web-based tool for creating interactive, isometric architecture diagrams using a custom Domain Specific Language (DSL) and Three.js rendering.

## ✨ Features

- **Custom DSL**: Intuitive syntax for describing architecture components, containers, and relationships
- **Isometric 3D Rendering**: Fixed perspective 3D view optimized for architecture diagrams
- **Interactive Canvas**: Click, hover, zoom, and pan functionality
- **Live Editor**: Real-time parsing and rendering with syntax validation
- **Multiple Shapes**: Support for rectangles, pyramids, and cylinders
- **Nested Containers**: Visual grouping of components with depth
- **Annotations**: Tooltips and external links for documentation
- **Export Functionality**: Save diagrams as PNG images
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone or download the project
cd isometric_diagram_creator

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:3000`

### Using with Bun (Optional)

If you prefer using Bun:

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

## 📝 DSL Syntax

### Basic Structure

```dsl
layout direction=LR ranksep=60 nodesep=40

style styleName icon=📦 color=#2196F3 shape=rectangle

component componentId {
  label "Component Label"
  type styleName
  image "optional-image.png"
}

container containerId {
  label "Container Label"
  
  component nestedComponent {
    label "Nested Component"
    type styleName
  }
}

relation componentId -> containerId : "Connection Label"

annotation componentId {
  tooltip "Helpful description"
  link "https://documentation.link"
}
```

### Keywords

| Keyword | Description | Example |
|---------|-------------|---------|
| `layout` | Global layout configuration | `layout direction=LR ranksep=60` |
| `style` | Define reusable visual styles | `style api icon=⚙️ color=#2196F3` |
| `component` | Atomic diagram element | `component userService { ... }` |
| `container` | Group of components | `container backend { ... }` |
| `relation` | Connection between elements | `relation user -> api : "HTTP"` |
| `annotation` | Tooltips and links | `annotation api { tooltip "..." }` |

### Supported Shapes

- `rectangle` - Default box shape for services and components
- `pyramid` - Triangular shape for control systems and load balancers  
- `cylinder` - Cylindrical shape for databases and storage

### Layout Directions

- `LR` - Left to Right
- `RL` - Right to Left  
- `TB` - Top to Bottom
- `BT` - Bottom to Top

## 🎨 Examples

The `examples/` directory contains sample DSL files:

- `microservices.dsl` - Modern microservices architecture
- `aws-architecture.dsl` - AWS cloud infrastructure
- `kubernetes.dsl` - Kubernetes deployment architecture

## 🎛️ Controls

### Mouse Controls

- **Left Click**: Select components and follow links
- **Right Click**: Context menu (future feature)
- **Mouse Wheel**: Zoom in/out
- **Middle Click + Drag**: Pan the view

### Keyboard Shortcuts

- **Ctrl/Cmd + Enter**: Parse and render DSL
- **Ctrl/Cmd + S**: Export diagram as PNG
- **Escape**: Clear selection

### UI Controls

- **Zoom Slider**: Control camera zoom level
- **Rotation Slider**: Rotate camera around diagram
- **Reset View**: Return to default camera position
- **Export PNG**: Download diagram as image

## 🏗️ Architecture

The application consists of three main components:

### 1. DSL Parser (`src/parser.js`)
- Tokenizes DSL input using regex patterns
- Parses tokens into structured diagram model
- Validates relationships and references
- Provides detailed error messages

### 2. Isometric Renderer (`src/renderer.js`)
- Creates 3D scene using Three.js
- Renders components as geometric primitives
- Handles user interaction and selection
- Manages lighting, shadows, and materials
- Supports export functionality

### 3. Main Application (`src/main.js`)
- Coordinates parser and renderer
- Manages UI state and interactions
- Handles file loading and saving
- Provides real-time editing experience

## 🎯 Customization

### Adding New Shapes

To add new component shapes, modify the `createComponentMesh` method in `src/renderer.js`:

```javascript
switch (shape) {
  case 'sphere':
    geometry = new THREE.SphereGeometry(15);
    break;
  case 'pyramid':
    geometry = new THREE.ConeGeometry(15, this.componentHeight, 4);
    break;
  // Add your custom shape here
}
```

### Custom Styling

Modify the CSS in `index.html` to customize the UI appearance. The design uses a glassmorphism aesthetic with gradients and backdrop filters.

### Extending the DSL

To add new DSL keywords:

1. Update the `getTokenType` method in `parser.js`
2. Add parsing logic in the `parseStatement` method
3. Update the diagram model structure
4. Implement rendering support in `renderer.js`

## 🐛 Troubleshooting

### Common Issues

**DSL Parse Errors**
- Check for missing braces `{` `}`
- Ensure proper keyword spelling
- Verify arrow syntax `->` for relations

**Rendering Issues**
- Clear browser cache and refresh
- Check browser console for WebGL errors
- Ensure graphics drivers are up to date

**Performance Issues**
- Limit diagram complexity (< 50 components)
- Use containers to group related components
- Avoid excessive nesting levels

### Browser Compatibility

- Chrome 80+ (Recommended)
- Firefox 75+
- Safari 13+
- Edge 80+

WebGL support is required for 3D rendering.

## 📦 Building for Production

```bash
# Build optimized version
npm run build

# Preview production build
npm run preview
```

The built files will be in the `dist/` directory.

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Additional component shapes and styles
- Advanced layout algorithms
- Real-time collaboration features
- Animation and transitions
- Mobile touch controls
- SVG export functionality

## 📄 License

MIT License - feel free to use and modify for your projects.

## 🔗 Related Projects

- [Three.js](https://threejs.org/) - 3D rendering library
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [JointJS](https://www.jointjs.com/) - Diagramming library inspiration

---

**Happy Diagramming! 🎨📊**
