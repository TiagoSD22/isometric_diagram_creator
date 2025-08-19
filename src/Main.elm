module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Json.Decode as Decode
import Json.Encode as Encode
import Types exposing (..)
import DSLParser exposing (parseResult)
import IsometricRenderer exposing (renderDiagram)


-- MAIN

main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , subscriptions = subscriptions
        , view = view
        }


-- MODEL

type alias Model =
    { dslInput : String
    , diagram : Maybe Diagram
    , renderDiagram : Maybe RenderDiagram
    , error : Maybe String
    , hoveredNode : Maybe String
    }

init : () -> (Model, Cmd Msg)
init _ =
    let
        initialDSL = """layout direction=LR ranksep=50 nodesep=30

style user icon=👤 color=#4CAF50 image="user.png"
style api icon=🔧 color=#2196F3
style db icon=🗄️ color=#FF9800

component user {
  label "Application User"
  type actor
}

container k8s_cluster {
  label "Kubernetes Cluster"
  
  container pod {
    label "API Pod"
    
    component python_api {
      label "Python API"
      type service
    }
  }
  
  container db_pod {
    label "Database Pod"
    
    component postgres {
      label "PostgreSQL"
      type database
    }
  }
}

relation user -> python_api : "HTTP requests"
relation python_api -> postgres : "SQL queries"

annotation user {
  tooltip "External users accessing the system"
  link "https://docs.example.com/users"
}"""
    in
    ( { dslInput = initialDSL
      , diagram = Nothing
      , renderDiagram = Nothing
      , error = Nothing
      , hoveredNode = Nothing
      }
    , Cmd.none
    )


-- UPDATE

type Msg
    = DSLInputChanged String
    | ParseDSL
    | NodeHovered (Maybe String)
    | ExportSVG

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        DSLInputChanged input ->
            ( { model | dslInput = input }, Cmd.none )
        
        ParseDSL ->
            case parseResult model.dslInput of
                Ok diagram ->
                    let
                        renderDiag = IsometricRenderer.renderDiagram diagram
                    in
                    ( { model 
                      | diagram = Just diagram
                      , renderDiagram = Just renderDiag
                      , error = Nothing
                      }
                    , sendDiagramToJS renderDiag
                    )
                
                Err error ->
                    ( { model | error = Just error }, Cmd.none )
        
        NodeHovered nodeId ->
            ( { model | hoveredNode = nodeId }, Cmd.none )
        
        ExportSVG ->
            ( model, exportSVGCmd )


-- PORTS

port sendDiagramToJS : RenderDiagram -> Cmd msg
port exportSVGCmd : Cmd msg


-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none


-- VIEW

view : Model -> Html Msg
view model =
    div [ class "elm-app" ]
        [ viewControls model
        , viewError model.error
        , viewDiagramInfo model
        ]

viewControls : Model -> Html Msg
viewControls model =
    div [ class "controls" ]
        [ button 
            [ class "btn"
            , onClick ParseDSL
            ] 
            [ text "Parse & Render" ]
        , button 
            [ class "btn secondary"
            , onClick ExportSVG
            ] 
            [ text "Export SVG" ]
        ]

viewError : Maybe String -> Html Msg
viewError maybeError =
    case maybeError of
        Nothing ->
            text ""
        
        Just error ->
            div [ class "error" ]
                [ h4 [] [ text "Parse Error:" ]
                , p [] [ text error ]
                ]

viewDiagramInfo : Model -> Html Msg
viewDiagramInfo model =
    case (model.diagram, model.renderDiagram) of
        (Just diagram, Just renderDiag) ->
            div [ class "diagram-info" ]
                [ h3 [] [ text "Diagram Information" ]
                , viewDiagramStats diagram renderDiag
                ]
        
        _ ->
            div [ class "diagram-info" ]
                [ p [] [ text "No diagram loaded. Enter DSL and click 'Parse & Render'." ] ]

viewDiagramStats : Diagram -> RenderDiagram -> Html Msg
viewDiagramStats diagram renderDiag =
    div [ class "stats" ]
        [ p [] [ text ("Components: " ++ String.fromInt (List.length diagram.components)) ]
        , p [] [ text ("Containers: " ++ String.fromInt (List.length diagram.containers)) ]
        , p [] [ text ("Relations: " ++ String.fromInt (List.length diagram.relations)) ]
        , p [] [ text ("Styles: " ++ String.fromInt (Dict.size diagram.styles)) ]
        , p [] [ text ("Render Nodes: " ++ String.fromInt (List.length renderDiag.nodes)) ]
        , p [] [ text ("Render Edges: " ++ String.fromInt (List.length renderDiag.edges)) ]
        ]
