module Types exposing (..)

import Dict exposing (Dict)


-- Core data structures for the architecture diagram

type alias Point =
    { x : Float
    , y : Float
    }

type alias Point3D =
    { x : Float
    , y : Float
    , z : Float
    }

type alias Size =
    { width : Float
    , height : Float
    }

type alias Style =
    { icon : Maybe String
    , color : String
    , image : Maybe String
    }

type alias Component =
    { id : String
    , label : String
    , componentType : String
    , style : Maybe String
    , position : Maybe Point3D
    , size : Size
    , metadata : Dict String String
    }

type alias Container =
    { id : String
    , label : String
    , position : Maybe Point3D
    , size : Size
    , components : List Component
    , containers : List Container
    , style : Maybe String
    , metadata : Dict String String
    }

type alias Relation =
    { from : String
    , to : String
    , label : Maybe String
    , relationStyle : Maybe String
    }

type alias Annotation =
    { target : String
    , tooltip : Maybe String
    , link : Maybe String
    , position : Maybe Point
    }

type alias Layout =
    { direction : String
    , ranksep : Float
    , nodesep : Float
    }

type alias Diagram =
    { layout : Layout
    , styles : Dict String Style
    , components : List Component
    , containers : List Container
    , relations : List Relation
    , annotations : List Annotation
    }

-- Parser types
type DSLToken
    = LayoutToken
    | StyleToken
    | ComponentToken
    | ContainerToken
    | RelationToken
    | AnnotationToken
    | Identifier String
    | StringLiteral String
    | Number Float
    | Arrow
    | Colon
    | LeftBrace
    | RightBrace
    | Equals
    | Newline
    | EOF

type ParseError
    = UnexpectedToken DSLToken
    | UnexpectedEndOfInput
    | InvalidSyntax String
    | DuplicateId String

type alias ParseResult a =
    Result ParseError a

-- Rendering types
type alias IsometricTransform =
    { scale : Float
    , angle : Float
    , depth : Float
    }

type alias RenderNode =
    { id : String
    , label : String
    , position : Point3D
    , size : Size
    , style : Style
    , nodeType : NodeType
    , children : List RenderNode
    }

type NodeType
    = ComponentNode
    | ContainerNode

type alias RenderEdge =
    { from : String
    , to : String
    , label : Maybe String
    , path : List Point
    }

type alias RenderDiagram =
    { nodes : List RenderNode
    , edges : List RenderEdge
    , bounds : { minX : Float, maxX : Float, minY : Float, maxY : Float }
    , transform : IsometricTransform
    }
