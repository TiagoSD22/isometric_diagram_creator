module DSLParser exposing (parseDSL, parseResult)

import Dict exposing (Dict)
import Parser exposing (..)
import Types exposing (..)


-- Main parser function
parseDSL : String -> ParseResult Diagram
parseDSL input =
    case Parser.run diagramParser input of
        Ok diagram ->
            Ok diagram
        Err deadEnds ->
            Err (InvalidSyntax (deadEndsToString deadEnds))

parseResult : String -> Result String Diagram
parseResult input =
    case parseDSL input of
        Ok diagram ->
            Ok diagram
        Err error ->
            Err (parseErrorToString error)


-- Parser combinators
diagramParser : Parser Diagram
diagramParser =
    succeed buildDiagram
        |= many statementParser
        |. end

statementParser : Parser Statement
statementParser =
    oneOf
        [ layoutStatement
        , styleStatement
        , componentStatement
        , containerStatement
        , relationStatement
        , annotationStatement
        ]
        |. spaces

type Statement
    = LayoutStmt Layout
    | StyleStmt String Style
    | ComponentStmt Component
    | ContainerStmt Container
    | RelationStmt Relation
    | AnnotationStmt Annotation

-- Layout parser
layoutStatement : Parser Statement
layoutStatement =
    succeed (\attrs -> LayoutStmt (buildLayout attrs))
        |. keyword "layout"
        |. spaces
        |= many attributeParser

buildLayout : List (String, String) -> Layout
buildLayout attrs =
    let
        attrDict = Dict.fromList attrs
        direction = Dict.get "direction" attrDict |> Maybe.withDefault "TB"
        ranksep = Dict.get "ranksep" attrDict 
            |> Maybe.andThen String.toFloat 
            |> Maybe.withDefault 50
        nodesep = Dict.get "nodesep" attrDict 
            |> Maybe.andThen String.toFloat 
            |> Maybe.withDefault 30
    in
    { direction = direction, ranksep = ranksep, nodesep = nodesep }

-- Style parser
styleStatement : Parser Statement
styleStatement =
    succeed StyleStmt
        |. keyword "style"
        |. spaces
        |= identifier
        |. spaces
        |= styleAttributesParser

styleAttributesParser : Parser Style
styleAttributesParser =
    succeed buildStyle
        |= many attributeParser

buildStyle : List (String, String) -> Style
buildStyle attrs =
    let
        attrDict = Dict.fromList attrs
    in
    { icon = Dict.get "icon" attrDict
    , color = Dict.get "color" attrDict |> Maybe.withDefault "#4CAF50"
    , image = Dict.get "image" attrDict
    }

-- Component parser
componentStatement : Parser Statement
componentStatement =
    succeed ComponentStmt
        |. keyword "component"
        |. spaces
        |= componentParser

componentParser : Parser Component
componentParser =
    succeed buildComponent
        |= identifier
        |. spaces
        |= blockParser

buildComponent : String -> List (String, String) -> Component
buildComponent id attrs =
    let
        attrDict = Dict.fromList attrs
        label = Dict.get "label" attrDict |> Maybe.withDefault id
        componentType = Dict.get "type" attrDict |> Maybe.withDefault "component"
        style = Dict.get "style" attrDict
    in
    { id = id
    , label = label
    , componentType = componentType
    , style = style
    , position = Nothing
    , size = { width = 120, height = 60 }
    , metadata = attrDict
    }

-- Container parser
containerStatement : Parser Statement
containerStatement =
    succeed ContainerStmt
        |. keyword "container"
        |. spaces
        |= containerParser

containerParser : Parser Container
containerParser =
    succeed buildContainer
        |= identifier
        |. spaces
        |= containerBlockParser

buildContainer : String -> (List (String, String), List Statement) -> Container
buildContainer id (attrs, statements) =
    let
        attrDict = Dict.fromList attrs
        label = Dict.get "label" attrDict |> Maybe.withDefault id
        style = Dict.get "style" attrDict
        (components, containers) = extractComponentsAndContainers statements
    in
    { id = id
    , label = label
    , position = Nothing
    , size = { width = 200, height = 150 }
    , components = components
    , containers = containers
    , style = style
    , metadata = attrDict
    }

-- Relation parser
relationStatement : Parser Statement
relationStatement =
    succeed RelationStmt
        |= relationParser

relationParser : Parser Relation
relationParser =
    succeed Relation
        |. keyword "relation"
        |. spaces
        |= identifier
        |. spaces
        |. symbol "->"
        |. spaces
        |= identifier
        |. spaces
        |= optional (symbol ":" |> andThen (\_ -> spaces |> andThen (\_ -> stringLiteral)))

-- Annotation parser
annotationStatement : Parser Statement
annotationStatement =
    succeed AnnotationStmt
        |. keyword "annotation"
        |. spaces
        |= annotationParser

annotationParser : Parser Annotation
annotationParser =
    succeed buildAnnotation
        |= identifier
        |. spaces
        |= blockParser

buildAnnotation : String -> List (String, String) -> Annotation
buildAnnotation target attrs =
    let
        attrDict = Dict.fromList attrs
    in
    { target = target
    , tooltip = Dict.get "tooltip" attrDict
    , link = Dict.get "link" attrDict
    , position = Nothing
    }

-- Helper parsers
attributeParser : Parser (String, String)
attributeParser =
    succeed Tuple.pair
        |= identifier
        |. symbol "="
        |= attributeValue
        |. spaces

attributeValue : Parser String
attributeValue =
    oneOf
        [ stringLiteral
        , identifier
        , numberAsString
        ]

numberAsString : Parser String
numberAsString =
    Parser.number
        { int = Ok << String.fromInt
        , hex = Ok << String.fromInt
        , octal = Ok << String.fromInt
        , binary = Ok << String.fromInt
        , float = Ok << String.fromFloat
        }

stringLiteral : Parser String
stringLiteral =
    succeed identity
        |. symbol "\""
        |= (getChompedString <| chompWhile (\c -> c /= '"'))
        |. symbol "\""

identifier : Parser String
identifier =
    variable
        { start = Char.isAlpha
        , inner = \c -> Char.isAlphaNum c || c == '_'
        , reserved = Set.fromList ["layout", "style", "component", "container", "relation", "annotation"]
        }

blockParser : Parser (List (String, String))
blockParser =
    succeed identity
        |. symbol "{"
        |. spaces
        |= many (attributeParser |. spaces)
        |. symbol "}"

containerBlockParser : Parser (List (String, String), List Statement)
containerBlockParser =
    succeed Tuple.pair
        |. symbol "{"
        |. spaces
        |= many (attributeParser |. spaces)
        |= many statementParser
        |. symbol "}"

-- Utility functions
many : Parser a -> Parser (List a)
many parser =
    loop [] (manyHelp parser)

manyHelp : Parser a -> List a -> Parser (Step (List a) (List a))
manyHelp parser acc =
    oneOf
        [ succeed (\item -> Loop (item :: acc))
            |= parser
        , succeed (Done (List.reverse acc))
        ]

optional : Parser a -> Parser (Maybe a)
optional parser =
    oneOf
        [ map Just parser
        , succeed Nothing
        ]

extractComponentsAndContainers : List Statement -> (List Component, List Container)
extractComponentsAndContainers statements =
    let
        extractHelper stmt (comps, conts) =
            case stmt of
                ComponentStmt comp -> (comp :: comps, conts)
                ContainerStmt cont -> (comps, cont :: conts)
                _ -> (comps, conts)
    in
    List.foldl extractHelper ([], []) statements

buildDiagram : List Statement -> Diagram
buildDiagram statements =
    let
        extractStatements stmt acc =
            case stmt of
                LayoutStmt layout -> { acc | layout = Just layout }
                StyleStmt name style -> { acc | styles = (name, style) :: acc.styles }
                ComponentStmt comp -> { acc | components = comp :: acc.components }
                ContainerStmt cont -> { acc | containers = cont :: acc.containers }
                RelationStmt rel -> { acc | relations = rel :: acc.relations }
                AnnotationStmt ann -> { acc | annotations = ann :: acc.annotations }
        
        result = List.foldl extractStatements 
            { layout = Nothing
            , styles = []
            , components = []
            , containers = []
            , relations = []
            , annotations = []
            } statements
    in
    { layout = result.layout |> Maybe.withDefault { direction = "TB", ranksep = 50, nodesep = 30 }
    , styles = Dict.fromList result.styles
    , components = List.reverse result.components
    , containers = List.reverse result.containers
    , relations = List.reverse result.relations
    , annotations = List.reverse result.annotations
    }

-- Error handling
deadEndsToString : List DeadEnd -> String
deadEndsToString deadEnds =
    deadEnds
        |> List.map deadEndToString
        |> String.join "; "

deadEndToString : DeadEnd -> String
deadEndToString deadEnd =
    "Line " ++ String.fromInt deadEnd.row ++ ", Column " ++ String.fromInt deadEnd.col ++ ": " ++ problemToString deadEnd.problem

problemToString : Problem -> String
problemToString problem =
    case problem of
        Expecting expected -> "Expected " ++ expected
        ExpectingInt -> "Expected integer"
        ExpectingHex -> "Expected hexadecimal"
        ExpectingOctal -> "Expected octal"
        ExpectingBinary -> "Expected binary"
        ExpectingFloat -> "Expected float"
        ExpectingNumber -> "Expected number"
        ExpectingVariable -> "Expected variable"
        ExpectingSymbol symbol -> "Expected '" ++ symbol ++ "'"
        ExpectingKeyword keyword -> "Expected keyword '" ++ keyword ++ "'"
        ExpectingEnd -> "Expected end of input"
        UnexpectedChar -> "Unexpected character"
        Problem description -> description
        BadRepeat -> "Bad repeat"

parseErrorToString : ParseError -> String
parseErrorToString error =
    case error of
        UnexpectedToken token -> "Unexpected token: " ++ Debug.toString token
        UnexpectedEndOfInput -> "Unexpected end of input"
        InvalidSyntax msg -> "Invalid syntax: " ++ msg
        DuplicateId id -> "Duplicate identifier: " ++ id
