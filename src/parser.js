/**
 * DSL Parser for Isometric Architecture Diagrams
 * Parses the custom DSL syntax into a structured diagram model
 */

export class DSLParser {
    constructor() {
        this.tokens = [];
        this.position = 0;
        this.currentToken = null;
    }

    /**
     * Tokenize the input DSL string
     */
    tokenize(input) {
        const tokenRegex = /(->|\w+|"[^"]*"|[{}:=]|#[0-9A-Fa-f]{6}|[^\s{}:">=\-]+)/g;
        const lines = input.split('\n');
        this.tokens = [];

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum].trim();
            if (line === '' || line.startsWith('//')) continue;

            let match;
            tokenRegex.lastIndex = 0; // Reset regex state
            while ((match = tokenRegex.exec(line)) !== null) {
                const value = match[1];
                const type = this.getTokenType(value);
                
                this.tokens.push({
                    type,
                    value: value.replace(/^"|"$/g, ''), // Remove quotes from strings
                    line: lineNum + 1,
                    column: match.index + 1
                });
            }
        }

        return this.tokens;
    }

    /**
     * Determine token type based on value
     */
    getTokenType(value) {
        const keywords = ['layout', 'style', 'component', 'container', 'relation', 'annotation'];
        const properties = ['direction', 'ranksep', 'nodesep', 'icon', 'color', 'shape', 'label', 'type', 'image', 'tooltip', 'link'];
        
        if (keywords.includes(value)) return 'KEYWORD';
        if (properties.includes(value)) return 'PROPERTY';
        if (value === '{') return 'LBRACE';
        if (value === '}') return 'RBRACE';
        if (value === ':') return 'COLON';
        if (value === '->') return 'ARROW';
        if (value === '=') return 'EQUALS';
        if (value.startsWith('#') && value.length === 7) return 'COLOR';
        if (value.startsWith('"') && value.endsWith('"')) return 'STRING';
        if (/^\d+$/.test(value)) return 'NUMBER';
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) return 'IDENTIFIER';
        
        return 'UNKNOWN';
    }

    /**
     * Parse the tokenized input into a diagram model
     */
    parse(input) {
        this.tokenize(input);
        this.position = 0;
        this.currentToken = this.tokens[0];

        const diagram = {
            layout: { direction: 'TB', ranksep: 50, nodesep: 30 },
            styles: {},
            components: {},
            containers: {},
            relations: [],
            annotations: {}
        };

        try {
            while (this.currentToken) {
                this.parseStatement(diagram);
            }
        } catch (error) {
            throw new Error(`Parse error at line ${this.currentToken?.line || 'EOF'}: ${error.message}`);
        }

        return diagram;
    }

    /**
     * Parse a top-level statement
     */
    parseStatement(diagram) {
        if (!this.currentToken) return;

        switch (this.currentToken.value) {
            case 'layout':
                this.parseLayout(diagram);
                break;
            case 'style':
                this.parseStyle(diagram);
                break;
            case 'component':
                this.parseComponent(diagram);
                break;
            case 'container':
                this.parseContainer(diagram);
                break;
            case 'relation':
                this.parseRelation(diagram);
                break;
            case 'annotation':
                this.parseAnnotation(diagram);
                break;
            default:
                throw new Error(`Unexpected token: ${this.currentToken.value}`);
        }
    }

    /**
     * Parse layout statement
     */
    parseLayout(diagram) {
        this.consume('KEYWORD'); // layout
        
        while (this.currentToken && this.currentToken.type === 'PROPERTY') {
            const property = this.currentToken.value;
            this.consume('PROPERTY');
            this.consume('EQUALS');
            
            const value = this.currentToken.value;
            this.consume(); // consume value
            
            if (property === 'direction') {
                diagram.layout.direction = value;
            } else if (property === 'ranksep') {
                diagram.layout.ranksep = parseInt(value);
            } else if (property === 'nodesep') {
                diagram.layout.nodesep = parseInt(value);
            }
        }
    }

    /**
     * Parse style definition
     */
    parseStyle(diagram) {
        this.consume('KEYWORD'); // style
        const styleName = this.currentToken.value;
        this.consume('IDENTIFIER');

        const style = {};
        
        while (this.currentToken && this.currentToken.type === 'PROPERTY') {
            const property = this.currentToken.value;
            this.consume('PROPERTY');
            this.consume('EQUALS');
            
            const value = this.currentToken.value;
            this.consume();
            
            style[property] = value;
        }

        diagram.styles[styleName] = style;
    }

    /**
     * Parse component definition
     */
    parseComponent(diagram, parentContainer = null) {
        this.consume('KEYWORD'); // component
        const componentId = this.currentToken.value;
        this.consume('IDENTIFIER');
        this.consume('LBRACE');

        const component = {
            id: componentId,
            type: 'component',
            properties: {},
            parent: parentContainer
        };

        while (this.currentToken && this.currentToken.type !== 'RBRACE') {
            if (this.currentToken.type === 'PROPERTY') {
                const property = this.currentToken.value;
                this.consume('PROPERTY');
                
                const value = this.currentToken.value;
                this.consume();
                
                component.properties[property] = value;
            } else {
                this.consume(); // skip unknown tokens
            }
        }

        this.consume('RBRACE');

        if (parentContainer) {
            // Ensure parent container exists
            if (!diagram.containers[parentContainer]) {
                throw new Error(`Parent container '${parentContainer}' not found`);
            }
            if (!diagram.containers[parentContainer].children) {
                diagram.containers[parentContainer].children = [];
            }
            diagram.containers[parentContainer].children.push(componentId);
        }

        diagram.components[componentId] = component;
    }

    /**
     * Parse container definition
     */
    parseContainer(diagram, parentContainer = null) {
        this.consume('KEYWORD'); // container
        const containerId = this.currentToken.value;
        this.consume('IDENTIFIER');
        this.consume('LBRACE');

        const container = {
            id: containerId,
            type: 'container',
            properties: {},
            children: [],
            parent: parentContainer
        };

        // Add container to diagram immediately so child components can reference it
        diagram.containers[containerId] = container;

        while (this.currentToken && this.currentToken.type !== 'RBRACE') {
            if (this.currentToken.type === 'PROPERTY') {
                const property = this.currentToken.value;
                this.consume('PROPERTY');
                
                const value = this.currentToken.value;
                this.consume();
                
                container.properties[property] = value;
            } else if (this.currentToken.value === 'component') {
                this.parseComponent(diagram, containerId);
            } else if (this.currentToken.value === 'container') {
                this.parseContainer(diagram, containerId);
            } else {
                this.consume(); // skip unknown tokens
            }
        }

        this.consume('RBRACE');

        if (parentContainer) {
            // Ensure parent container exists and has children array
            if (!diagram.containers[parentContainer]) {
                throw new Error(`Parent container '${parentContainer}' not found`);
            }
            if (!diagram.containers[parentContainer].children) {
                diagram.containers[parentContainer].children = [];
            }
            diagram.containers[parentContainer].children.push(containerId);
        }
    }

    /**
     * Parse relation statement
     */
    parseRelation(diagram) {
        this.consume('KEYWORD'); // relation
        
        const from = this.currentToken.value;
        this.consume('IDENTIFIER');
        this.consume('ARROW');
        const to = this.currentToken.value;
        this.consume('IDENTIFIER');
        
        let label = '';
        if (this.currentToken && this.currentToken.type === 'COLON') {
            this.consume('COLON');
            label = this.currentToken.value;
            this.consume();
        }

        diagram.relations.push({
            from,
            to,
            label
        });
    }

    /**
     * Parse annotation statement
     */
    parseAnnotation(diagram) {
        this.consume('KEYWORD'); // annotation
        const targetId = this.currentToken.value;
        this.consume('IDENTIFIER');
        this.consume('LBRACE');

        const annotation = {};

        while (this.currentToken && this.currentToken.type !== 'RBRACE') {
            if (this.currentToken.type === 'PROPERTY') {
                const property = this.currentToken.value;
                this.consume('PROPERTY');
                
                const value = this.currentToken.value;
                this.consume();
                
                annotation[property] = value;
            } else {
                this.consume(); // skip unknown tokens
            }
        }

        this.consume('RBRACE');
        diagram.annotations[targetId] = annotation;
    }

    /**
     * Consume current token and advance to next
     */
    consume(expectedType = null) {
        if (expectedType && this.currentToken?.type !== expectedType) {
            throw new Error(`Expected ${expectedType}, got ${this.currentToken?.type || 'EOF'} (value: '${this.currentToken?.value || ''}')`);
        }

        this.position++;
        this.currentToken = this.position < this.tokens.length ? this.tokens[this.position] : null;
    }

    /**
     * Validate the parsed diagram for consistency
     */
    validate(diagram) {
        const errors = [];

        // Check if all relation endpoints exist
        for (const relation of diagram.relations) {
            if (!diagram.components[relation.from] && !diagram.containers[relation.from]) {
                errors.push(`Relation source '${relation.from}' not found`);
            }
            if (!diagram.components[relation.to] && !diagram.containers[relation.to]) {
                errors.push(`Relation target '${relation.to}' not found`);
            }
        }

        // Check if all annotations target existing components/containers
        for (const targetId of Object.keys(diagram.annotations)) {
            if (!diagram.components[targetId] && !diagram.containers[targetId]) {
                errors.push(`Annotation target '${targetId}' not found`);
            }
        }

        // Check if all component types have corresponding styles
        for (const component of Object.values(diagram.components)) {
            const type = component.properties.type;
            if (type && !diagram.styles[type]) {
                errors.push(`Style '${type}' not found for component '${component.id}'`);
            }
        }

        if (errors.length > 0) {
            throw new Error(`Validation errors:\n${errors.join('\n')}`);
        }

        return true;
    }
}

export default DSLParser;