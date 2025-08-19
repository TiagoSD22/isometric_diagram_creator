module IsometricRenderer exposing (renderDiagram, calculateLayout, toIsometric)

import Dict exposing (Dict)
import Types exposing (..)


-- Isometric projection constants
isometricAngle : Float
isometricAngle = pi / 6  -- 30 degrees

depthScale : Float
depthScale = 0.5

-- Convert 3D point to 2D isometric projection
toIsometric : Point3D -> Point
toIsometric point3d =
    let
        x = point3d.x + point3d.z * cos isometricAngle
        y = point3d.y + point3d.z * sin isometricAngle
    in
    { x = x, y = y }

-- Calculate layout for the entire diagram
calculateLayout : Diagram -> RenderDiagram
calculateLayout diagram =
    let
        -- First, position all components and containers
        positionedNodes = layoutNodes diagram
        
        -- Then create render edges
        renderEdges = createRenderEdges diagram.relations positionedNodes
        
        -- Calculate bounds
        bounds = calculateBounds positionedNodes
        
        transform = { scale = 1.0, angle = isometricAngle, depth = depthScale }
    in
    { nodes = positionedNodes
    , edges = renderEdges
    , bounds = bounds
    , transform = transform
    }

-- Layout nodes using a hierarchical approach
layoutNodes : Diagram -> List RenderNode
layoutNodes diagram =
    let
        -- Start with top-level components
        topLevelComponents = layoutComponents diagram.components diagram.styles 0 0 0
        
        -- Then layout containers
        topLevelContainers = layoutContainers diagram.containers diagram.styles 0 200 0
    in
    topLevelComponents ++ topLevelContainers

-- Layout components at a specific depth level
layoutComponents : List Component -> Dict String Style -> Float -> Float -> Float -> List RenderNode
layoutComponents components styles startX startY depth =
    let
        spacing = 150
        
        layoutComponent index component =
            let
                x = startX + toFloat index * spacing
                y = startY
                z = depth
                
                style = getStyleForComponent component styles
            in
            { id = component.id
            , label = component.label
            , position = { x = x, y = y, z = z }
            , size = component.size
            , style = style
            , nodeType = ComponentNode
            , children = []
            }
    in
    List.indexedMap layoutComponent components

-- Layout containers recursively
layoutContainers : List Container -> Dict String Style -> Float -> Float -> Float -> List RenderNode
layoutContainers containers styles startX startY depth =
    let
        spacing = 300
        
        layoutContainer index container =
            let
                x = startX + toFloat index * spacing
                y = startY
                z = depth
                
                -- Layout children inside the container
                childComponents = layoutComponents 
                    container.components 
                    styles 
                    (x + 20) 
                    (y + 40) 
                    (depth + 10)
                
                childContainers = layoutContainers 
                    container.containers 
                    styles 
                    (x + 20) 
                    (y + 100) 
                    (depth + 10)
                
                children = childComponents ++ childContainers
                
                -- Adjust container size based on children
                adjustedSize = calculateContainerSize container.size children
                
                style = getStyleForContainer container styles
            in
            { id = container.id
            , label = container.label
            , position = { x = x, y = y, z = z }
            , size = adjustedSize
            , style = style
            , nodeType = ContainerNode
            , children = children
            }
    in
    List.indexedMap layoutContainer containers

-- Calculate container size based on its children
calculateContainerSize : Size -> List RenderNode -> Size
calculateContainerSize baseSize children =
    if List.isEmpty children then
        baseSize
    else
        let
            childBounds = calculateBounds children
            minWidth = max baseSize.width (childBounds.maxX - childBounds.minX + 40)
            minHeight = max baseSize.height (childBounds.maxY - childBounds.minY + 80)
        in
        { width = minWidth, height = minHeight }

-- Get style for component
getStyleForComponent : Component -> Dict String Style -> Style
getStyleForComponent component styles =
    component.style
        |> Maybe.andThen (\styleName -> Dict.get styleName styles)
        |> Maybe.withDefault defaultComponentStyle

-- Get style for container
getStyleForContainer : Container -> Dict String Style -> Style
getStyleForContainer container styles =
    container.style
        |> Maybe.andThen (\styleName -> Dict.get styleName styles)
        |> Maybe.withDefault defaultContainerStyle

-- Default styles
defaultComponentStyle : Style
defaultComponentStyle =
    { icon = Nothing
    , color = "#4CAF50"
    , image = Nothing
    }

defaultContainerStyle : Style
defaultContainerStyle =
    { icon = Nothing
    , color = "#2196F3"
    , image = Nothing
    }

-- Create render edges from relations
createRenderEdges : List Relation -> List RenderNode -> List RenderEdge
createRenderEdges relations nodes =
    let
        nodeDict = List.foldl (\node dict -> Dict.insert node.id node dict) Dict.empty (flattenNodes nodes)
        
        createEdge relation =
            case (Dict.get relation.from nodeDict, Dict.get relation.to nodeDict) of
                (Just fromNode, Just toNode) ->
                    Just (createRenderEdge relation fromNode toNode)
                _ ->
                    Nothing
    in
    List.filterMap createEdge relations

-- Flatten nodes including children
flattenNodes : List RenderNode -> List RenderNode
flattenNodes nodes =
    let
        flattenNode node =
            node :: flattenNodes node.children
    in
    List.concatMap flattenNode nodes

-- Create a single render edge
createRenderEdge : Relation -> RenderNode -> RenderNode -> RenderEdge
createRenderEdge relation fromNode toNode =
    let
        fromPoint = getNodeConnectionPoint fromNode "output"
        toPoint = getNodeConnectionPoint toNode "input"
        
        -- Simple straight line for now, could be enhanced with routing
        path = [fromPoint, toPoint]
    in
    { from = relation.from
    , to = relation.to
    , label = relation.label
    , path = path
    }

-- Get connection point for a node
getNodeConnectionPoint : RenderNode -> String -> Point
getNodeConnectionPoint node connectionType =
    let
        centerX = node.position.x + node.size.width / 2
        centerY = node.position.y + node.size.height / 2
        
        point3d = case connectionType of
            "output" ->
                { x = node.position.x + node.size.width
                , y = centerY
                , z = node.position.z
                }
            "input" ->
                { x = node.position.x
                , y = centerY
                , z = node.position.z
                }
            _ ->
                { x = centerX
                , y = centerY
                , z = node.position.z
                }
    in
    toIsometric point3d

-- Calculate bounds of all nodes
calculateBounds : List RenderNode -> { minX : Float, maxX : Float, minY : Float, maxY : Float }
calculateBounds nodes =
    let
        allNodes = flattenNodes nodes
        
        getNodeBounds node =
            let
                isoPoint = toIsometric node.position
            in
            { minX = isoPoint.x
            , maxX = isoPoint.x + node.size.width
            , minY = isoPoint.y
            , maxY = isoPoint.y + node.size.height
            }
        
        nodeBounds = List.map getNodeBounds allNodes
        
        defaultBounds = { minX = 0, maxX = 800, minY = 0, maxY = 600 }
    in
    case nodeBounds of
        [] -> defaultBounds
        first :: rest ->
            List.foldl 
                (\bounds acc ->
                    { minX = min bounds.minX acc.minX
                    , maxX = max bounds.maxX acc.maxX
                    , minY = min bounds.minY acc.minY
                    , maxY = max bounds.maxY acc.maxY
                    }
                )
                first
                rest

-- Main render function
renderDiagram : Diagram -> RenderDiagram
renderDiagram diagram =
    calculateLayout diagram
