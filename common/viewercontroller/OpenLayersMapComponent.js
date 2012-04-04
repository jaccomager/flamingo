/**
 * @class
 * @constructor
 * @augments MapComponent
 * @description MapComponent subclass for OpenLayers
 * @author <a href="mailto:meinetoonen@b3partners.nl">Meine Toonen</a>
 * @author <a href="mailto:roybraam@b3partners.nl">Roy Braam</a>
 */
Ext.define("viewer.viewercontroller.OpenLayersMapComponent",{
    extend: "viewer.viewercontroller.MapComponent",
    mapOptions:null,
    constructor :function (viewerController, domId){
        viewer.viewercontroller.OpenLayersMapComponent.superclass.constructor.call(this, viewerController,domId);
        this.viewerController = viewerController;
        this.domId = domId;
        this.pointButton = null;
        this.lineButton = null;
        this.polygonButton = null;
        this.mapOptions = {
            projection: new OpenLayers.Projection("EPSG:28992"),
            allOverlays: true,
            units :'m',
            resolutions: [512,256,128,64,32,16,8,4,2,1,0.5,0.25,0.125],
            controls : [new OpenLayers.Control.Navigation({
            zoomBoxEnabled: true
            }),new OpenLayers.Control.ArgParser()],
            events: []            
        };  
        
        return this;
    },

    /**
     * @function
     * @description Initializes the events
     */
    initEvents : function(){
        this.eventList[viewer.viewercontroller.controller.Event.ON_EVENT_DOWN]                             = "activate";
        this.eventList[viewer.viewercontroller.controller.Event.ON_EVENT_UP]                               = "deactivate";
        this.eventList[viewer.viewercontroller.controller.Event.ON_GET_CAPABILITIES]                       = "onGetCapabilities";
        this.eventList[viewer.viewercontroller.controller.Event.ON_CONFIG_COMPLETE]                        = "onConfigComplete";
        this.eventList[viewer.viewercontroller.controller.Event.ON_FEATURE_ADDED]                          = "featureadded";
        this.eventList[viewer.viewercontroller.controller.Event.ON_CLICK]                                  = "click";
        this.eventList[viewer.viewercontroller.controller.Event.ON_SET_TOOL]                               = "activate";
        this.eventList[viewer.viewercontroller.controller.Event.ON_ALL_LAYERS_LOADING_COMPLETE]            = "onUpdateComplete";
        this.eventList[viewer.viewercontroller.controller.Event.ON_LOADING_START]                          = "loadstart";
        this.eventList[viewer.viewercontroller.controller.Event.ON_LOADING_END]                            = "loadend";
        this.eventList[viewer.viewercontroller.controller.Event.ON_MEASURE]                                = "measure";
        this.eventList[viewer.viewercontroller.controller.Event.ON_FINISHED_CHANGE_EXTENT]                 = "zoomend";
        this.eventList[viewer.viewercontroller.controller.Event.ON_CHANGE_EXTENT]                          = "move";
    },
    /**
     * @description Gets the panel of this controller and OpenLayers.Map. If the panel is still null, the panel is created and added to the map.
     * @returns a OpenLayers.Control.Panel
     */
    getPanel : function(){
        if (this.panel==null){
            this.panel=new OpenLayers.Control.Panel();
            this.maps[0].getFrameworkMap().addControl(this.panel);
        }
        return this.panel;
    },
    /**
     * @description Creates a OpenLayers.Control.Panel and adds it to the map
     */
    createPanel : function (id){
        var paneel= new OpenLayers.Control.Panel();
        this.panel = paneel;
        this.maps[0].getFrameworkMap().addControl(this.panel);
    },
    /**
     * @description Creates a Openlayers.Map object for this framework. See the openlayers.map docs
     *@param id the id the DomElement where the map must be set
     *@param options extra options for the map. See the OpenLayers.Map docs.
     *@returns a OpenLayersMap
     */
    createMap : function(id, options){
        options = this.mapOptions;
        //set some default options:
        //if (!options["theme"])
            options["theme"]=OpenLayers._getScriptLocation()+'theme/default/style.css';
        //create the map.
       /* Ext.fly(id).replaceWith(
        {
            tag:'div',
            id: id,
            style: {
                border: '1px solid black'
            }
        }
        );*/
        options.mapComponent=this;
        var maxExtent = options["maxExtent"];
        //var maxBounds = new OpenLayers.Bounds(maxExtent.minx,maxExtent.miny,maxExtent.maxx,maxExtent.maxy);
        
        var maxBounds=new OpenLayers.Bounds(120000,304000,280000,620000);
      //  Ext.apply(options,this.mapOptions);
        options["maxExtent"] = maxBounds;
        var map=new OpenLayers.Map(this.domId,options);
        var olMap = Ext.create("viewer.viewercontroller.openlayers.OpenLayersMap",{
            viewerController:this.viewerController
        },map);
        //map.events.register("click",this, this.onIdentifyHandler);
        return olMap;
    },
    /**
     *See @link MapComponent.createWMSLayer
     */
    
    createWMSLayer : function(name, wmsurl,ogcParams,options){
        options["id"]=null;
        options["isBaseLayer"]=false;
        options["singleTile"]=true;
        options["transitionEffect"] = "resize";
        options["events"] = new Object();
        options["visibility"] = ogcParams["visible"];
        var olLayer= new OpenLayers.Layer.WMS(name,wmsurl,ogcParams,options);
        var wmsLayer = new viewer.viewercontroller.openlayers.OpenLayersWMSLayer(olLayer);
        if(ogcParams["query_layers"] != null && ogcParams["query_layers"] != ""){

            var info = new OpenLayers.Control.WMSGetFeatureInfo({
                url: wmsurl,
                title: 'Identify features by clicking',
                queryVisible: true,
                layers: [wmsLayer.getFrameworkLayer()],
                queryLayers : ogcParams["query_layers"],
                infoFormat : "text/xml"
            });
            info.request = doGetFeatureRequest;
            wmsLayer.setGetFeatureInfoControl(info);
        }
        if (options["maptip_layers"]!=null && options["maptip_layers"]!=""){
            var maptip = new OpenLayers.Control.WMSGetFeatureInfo({
                url: wmsurl,
                title: 'Identify features by clicking',
                queryVisible: true,
                layers: [wmsLayer.getFrameworkLayer()],
                queryLayers : options["maptip_layers"],
                infoFormat : "application/vnd.ogc.gml",
                hover: true
            });
            maptip.request = doGetFeatureRequest;
            wmsLayer.setMapTipControl(maptip);
        }
        return wmsLayer;
    },
    /**
     *see {@link MapComponent.createTMSLayer} sdf
     */
    createTMSLayer : function (name,url, options){
        var tmsLayer= new OpenLayersTMSLayer(new OpenLayers.Layer.TMS(name,url,options),name);
        return tmsLayer;
    },
    /**
     *See @link MapComponent.createTMSLayer
     */
    createImageLayer : function (name,url, bounds, size,options){
        var imageLayer = new OpenLayersImageLayer (new OpenLayers.Layer.Image( name,url,bounds,size,options ));

        return imageLayer;
    },
    createVectorLayer : function(id,options){
        if (options==undefined){
            options = new Object();
            options["isBaseLayer"]= false;
        }else{
            if(options["isBaseLayer"] == undefined){
                options["isBaseLayer"]= false;
            }
        }
        return new viewer.viewercontroller.openlayers.OpenLayersVectorLayer(new OpenLayers.Layer.Vector(id, options),id);
    },
    /**
     *Create a tool: the initializing of a piece of functionality to link to a button
     *@param id
     *@param type: the type of the tool. Possible values: DRAW_FEATURE, ...     *
     *@param options: the options used for initializing the Tool
     *  Posible options:
     *  handlerGetFeatureHandler: the handler for getFeatures
     *  handlerBeforeGetFeatureHandler: the handler for before getFeatures
     *  layer: the layer that is needed for some drawing tools
     *  All other openlayer options.
     **/
    createTool : function (id,type, options){
        if (type==viewer.viewercontroller.controller.Tool.DRAW_FEATURE){
            //TODO: Deze crap weg! Afzonderlijke buttons aanmaken en niet in de controller plaatsen! Maar in lijst van tools
            //  var container = params["container"];
            var layer=options["layer"];
            var toolbar= new OpenLayers.Control.EditingToolbar( layer.getFrameworkLayer() );
        
            // Voeg de individuele knoppen toe
            this.pointButton =new viewer.viewercontroller.openlayers.OpenLayersTool(id+"_point",toolbar.controls[1],type);
            this.lineButton =new viewer.viewercontroller.openlayers.OpenLayersTool(id+"_line",toolbar.controls[2],type);
            this.polygonButton =new viewer.viewercontroller.openlayers.OpenLayersTool(id+"_polygon",toolbar.controls[3],type);
        
            var openLayersTools = new Array();
            openLayersTools.push(this.pointButton);
            openLayersTools.push(this.lineButton);
            openLayersTools.push(this.polygonButton);
       
            return openLayersTools;
        }else if (type==viewer.viewercontroller.controller.Tool.DRAW_FEATURE_POINT){
            //  var container = params["container"];
            var layer=options["layer"];
            var toolbar= new OpenLayers.Control.EditingToolbar( layer.getFrameworkLayer() );

            // Voeg de individuele knoppen toe
            this.pointButton =new viewer.viewercontroller.openlayers.OpenLayersTool(id,toolbar.controls[1],type);

            return this.pointButton;
        }else if (type==viewer.viewercontroller.controller.Tool.DRAW_FEATURE_LINE){
            var layer=options["layer"];
            var toolbar= new OpenLayers.Control.EditingToolbar( layer.getFrameworkLayer() );
            this.lineButton =new viewer.viewercontroller.openlayers.OpenLayersTool(id,toolbar.controls[2],type);
            return this.lineButton;
        }else if (type==viewer.viewercontroller.controller.Tool.DRAW_FEATURE_POLYGON){
            var layer=options["layer"];
            var toolbar= new OpenLayers.Control.EditingToolbar( layer.getFrameworkLayer() );
            this.polygonButton =new viewer.viewercontroller.openlayers.OpenLayersTool(id,toolbar.controls[3],type);
            return this.polygonButton;
        }else if (type==viewer.viewercontroller.controller.Tool.NAVIGATION_HISTORY){
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control.NavigationHistory(options),type);
        }else if (type==viewer.viewercontroller.controller.Tool.ZOOM_BOX){
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control.ZoomBox(options),type);
        }else if (type==viewer.viewercontroller.controller.Tool.PAN){
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control.DragPan(options),type)
        }else if (type==viewer.viewercontroller.controller.Tool.BUTTON){
            if (!options){
                options=new Object();
            }
            options["displayClass"]="olControl"+id;
            options["type"]=OpenLayers.Control.TYPE_BUTTON;
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control(options),type);
        }else if (type==viewer.viewercontroller.controller.Tool.TOGGLE){
            if (!options){
                options=new Object();
            }
            options["displayClass"]="olControl"+id;
            options["type"]=OpenLayers.Control.TYPE_TOGGLE;
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control(options),type);
        }else if (type==viewer.viewercontroller.controller.Tool.CLICK){
            if (!options){
                options=new Object();
            }
            options["displayClass"]="olControl"+id;
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control.Click(options),type);
        }else if (type==viewer.viewercontroller.controller.Tool.LOADING_BAR){
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control.LoadingPanel(options),type);
        }else if (type == viewer.viewercontroller.controller.Tool.GET_FEATURE_INFO) {
            if (!options){
                options=new Object();
            }
            options["displayClass"]="olControl"+id;
            options["type"]=OpenLayers.Control.TYPE_TOOL;
            var identifyTool = new OpenLayersIdentifyTool(id,new OpenLayers.Control(options),type);
            identifyTool.getFrameworkTool().events.register("activate",this,this.activateGetFeatureControls);
            identifyTool.getFrameworkTool().events.register("deactivate",this,this.deactivateGetFeatureControls);

            identifyTool.setGetFeatureInfoHandler(options["handlerGetFeatureHandler"]);
            identifyTool.setBeforeGetFeatureInfoHandler(options["handlerBeforeGetFeatureHandler"]);

            //this.getMap().setGetFeatureInfoControl(identifyTool);
            return identifyTool;
        }else if(type == viewer.viewercontroller.controller.Tool.MEASURE){
            if (!options){
                options=new Object();
            }
            options["persist"]=true;
            options["callbacks"]={
                modify: function (evt){
                    //make a tooltip with the measured length
                    if (evt.parent){
                        var measureValueDiv=document.getElementById("olControlMeasureValue");
                        if (measureValueDiv==undefined){
                            measureValueDiv=document.createElement('div');
                            measureValueDiv.id="olControlMeasureValue";
                            measureValueDiv.style.position='absolute';
                            this.map.div.appendChild(measureValueDiv);
                            measureValueDiv.style.zIndex="10000";
                            measureValueDiv.className="olControlMaptip";
                            var measureValueText=document.createElement('div');
                            measureValueText.id='olControlMeasureValueText';
                            measureValueDiv.appendChild(measureValueText);
                        }
                        var px= this.map.getViewPortPxFromLonLat(new OpenLayers.LonLat(evt.x,evt.y));
                        measureValueDiv.style.top=px.y+"px";
                        measureValueDiv.style.left=px.x+10+'px'
                        measureValueDiv.style.display="block";
                        var measureValueText=document.getElementById('olControlMeasureValueText');
                        var bestLengthTokens=this.getBestLength(evt.parent);
                        measureValueText.innerHTML= bestLengthTokens[0].toFixed(3)+" "+bestLengthTokens[1];
                    }
                }
            }

            var measureTool= new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control.Measure( OpenLayers.Handler.Path, options),type);
            measureTool.getFrameworkTool().events.register('measure',measureTool.getFrameworkTool(),function(){
                var measureValueDiv=document.getElementById("olControlMeasureValue");
                if (measureValueDiv){                
                    measureValueDiv.style.display="none";
                }
                this.cancel();
            });
            measureTool.getFrameworkTool().events.register('deactivate',measureTool.getFrameworkTool(),function(){
                var measureValueDiv=document.getElementById("olControlMeasureValue");
                if (measureValueDiv){
                    measureValueDiv.style.display="none";
                }
            });
            return measureTool;
        }else if(type == viewer.viewercontroller.controller.Tool.SCALEBAR){
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id, new OpenLayers.Control.ScaleLine (options),type);
        }else if (type == viewer.viewercontroller.controller.Tool.ZOOM_BAR) {
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control.PanZoomBar(options),type)
        }else if (type == viewer.viewercontroller.controller.Tool.LAYER_SWITCH){
            return new viewer.viewercontroller.openlayers.OpenLayersTool(id,new OpenLayers.Control.LayerSwitcher(options),type);
        }else{
            throw ("Type >" + type + "< not recognized. Please use existing type.");
        }
    },
    activateGetFeatureControls : function(){
        var layers=this.getMap().getAllWMSLayers();
        //var controls = webMapController.getMap().getGetFeatureInfoControl().controls;
        for (var i = 0 ; i< layers.length ; i++ ){
            var con = layers[i].getGetFeatureInfoControl();
            if (con!=null)
                con.activate();
        }
    },
    deactivateGetFeatureControls : function(){
        var layers=this.getMap().getAllWMSLayers();
        //var controls = webMapController.getMap().getGetFeatureInfoControl().controls;
        for (var i = 0 ; i< layers.length ; i++ ){
            var con = layers[i].getGetFeatureInfoControl();
            if (con!=null)
                con.deactivate();
        }
    },
    /**
     *See @link MapComponent.addTool
     */
    addTool : function(tool){
        /* if (!(tool instanceof OpenLayersTool)){
        Ext.Error.raise({msg: "The given tool is not of type 'OpenLayersTool'"});
    }*/
        if (this.maps.length==0){
            Ext.Error.raise({msg: "No map in MapComponent!"});
        }
        if( tool instanceof Array){
            for(var i = 0 ; i < tool.length; i++){
                this.getMap().getFrameworkMap().addControl(tool[i].getFrameworkTool());
                this.addTool(tool[i]);
                MapComponent.prototype.addTool.call(this,tool[i]);
            }
        }else if (tool.getType()==viewer.viewercontroller.controller.Tool.NAVIGATION_HISTORY){
            this.maps[0].getFrameworkMap().addControl(tool.getFrameworkTool());
            this.getPanel().addControls([tool.getFrameworkTool().previous,tool.getFrameworkTool().next]);
        }else if (tool.getType() == viewer.viewercontroller.controller.Tool.CLICK){
            this.maps[0].getFrameworkMap().addControl(tool.getFrameworkTool());
            this.getPanel().addControls([tool.getFrameworkTool().button]);
        }else if (tool.getType() == viewer.viewercontroller.controller.Tool.LOADING_BAR){
            this.maps[0].getFrameworkMap().addControl(tool.getFrameworkTool());
        }else if( tool.getType() == viewer.viewercontroller.controller.Tool.GET_FEATURE_INFO ){
            this.getPanel().addControls([tool.getFrameworkTool()]);
            this.maps[0].getFrameworkMap().addControl(tool.getFrameworkTool());
        }else if (tool.getType() == viewer.viewercontroller.controller.Tool.SCALEBAR){
            this.maps[0].getFrameworkMap().addControl(tool.getFrameworkTool());
        }else if(tool.getType() == viewer.viewercontroller.controller.Tool.ZOOM_BAR){
            this.maps[0].getFrameworkMap().addControl(tool.getFrameworkTool());
        } else{
            var ft = tool.getFrameworkTool();
            this.getPanel().addControls([tool.getFrameworkTool()]);
        }

        if(!(tool instanceof Array) ){
            this.superclass.addTool.call(this,tool);
        }
    },
    removeToolById : function (id){
        var tool = this.getTool(id);
        this.removeTool(tool);
    },
    /**
     *See @link MapComponent.removeTool
     */
    removeTool : function (tool){
        if (!(tool instanceof OpenLayersTool)){
            Ext.Error.raise({msg: "The given tool is not of type 'OpenLayersTool'"});
        }    
        if (tool.type==Tool.NAVIGATION_HISTORY){
            OpenLayers.Util.removeItem(this.getPanel().controls, tool.getFrameworkTool().next);
            OpenLayers.Util.removeItem(this.getPanel().controls, tool.getFrameworkTool().previous);
            tool.getFrameworkTool().destroy();
        }else{
            OpenLayers.Util.removeItem(this.getPanel().controls, tool.getFrameworkTool());
        }
        this.maps[0].getFrameworkMap().removeControl(tool.getFrameworkTool());
        if (this.getPanel().controls.length==0){
            this.getPanel().destroy();
            this.panel=null
        }else{
            this.getPanel().redraw();
        }
        MapComponent.prototype.removeTool.call(this,tool);
    },
    /**Add a map to the controller.
     *For know only 1 map supported.
     */
    addMap : function (map){
        if (!(map instanceof viewer.viewercontroller.openlayers.OpenLayersMap)){
            Ext.Error.raise({msg: "The given map is not of the type 'OpenLayersMap'"});
        }
        if (this.maps.length>=1)
            Ext.Error.raise({msg: "Multiple maps not supported yet"});
        this.maps.push(map);
        
        map.getFrameworkMap().events.register("mousemove",this,this.removeMaptip);
    },
    /**
     *Get the map by id. For openlayers only 1 map....
     *@param mapId the mapId
     *@returns the Map with the id, or the only map.
     */
    getMap : function (mapId){
        return this.maps[0];
    },
    /**
     *Remove the map from the
     */
    removeMap : function (removeMap){
        removeMap.remove();
        this.maps=new Array();
    },
    activateTool : function (id){
        var tools = this.tools;
        for(var i = 0 ; i < tools.length ; i++){
            tools[i].getFrameworkTool().deactivate();
        }
        var tool = this.getTool(id);
        tool.getFrameworkTool().activate();
    },
    /****************************************************************Event handling***********************************************************/

    /**
     * Registers an event to a handler, on a object. Flamingo doesn't implement per component eventhandling,
     * so this controller stores the event in one big array (Object..).
     */
    registerEvent : function (event,object,handler,thisObj){
        object.register(event,handler,thisObj);
    },
    unRegisterEvent : function (event,object,handler,thisObj){
        object.unRegister(event,handler,thisObj);
    },
    /**
     * Register an event to the MapComponent. But only if the handler is not registerd for the
     * event yet.
     */
    register : function (event,handler,scope){
        var specificName = this.getSpecificEventName(event);
        if(this.events[specificName] == null){
            this.events[specificName] = new Array();
        }
        for (var i=0; i < this.events[specificName].length; i++){
            if(this.events[specificName][i]==handler){
                //alert("Handler >"+ handler + "< for event: "+specificName+" already registered");
                return;
            }
        }
        this.events[specificName].push({fn:handler,scope:scope});
    },
    /**
     *All registerd handlers for event 'event' that equals 'handler' are removed as listener.
     *This is because you don't want duplication of the same handler and event. This will
     *result in multiple call of a handler on the same event.
     *@param event the event
     *@param handler the handler you want to remove
     */
    unRegister : function (event,handler){
        var specificName = this.getSpecificEventName(event);
        var newEventHandlers=new Array();
        for (var i=0; i < this.events[specificName].length; i++){
            if(this.events[specificName][i]!=handler){
                newEventHandlers.push(this.events[specificName][i]);
            }
        }
        this.events[specificName]=newEventHandlers;
    },
    handleEvent : function(event){
        var handlers = this.events[event];
        for(var i = 0 ; i < handlers.length ; i++){
            var handlerObj = handlers[i];
            var fn = handlerObj.fn;
            var scope = handlerObj.scope;
            fn.call(scope);
        }
    },
    onMapTipHandler : function(data){
        //this is the Layer not the MapComponent
        var allMaptips="";
        for( var i = 0 ; i < data.features.length ; i++){
            var featureType=null;
            if (data.features[i].gml){
                featureType = data.features[i].gml.featureType;
            }else if (data.features[i].type){
                featureType = data.features[i].type;
            }
            var maptip=this.getMapTipByFeatureType(featureType);
            /*temp*/
            if (maptip==null){
                maptip=this.getMaptips()[0];
            }
            if (maptip!=null){
                var maptipField=maptip.mapTipField;
                for (var f in data.features[i].attributes){
                    if (data.features[i].attributes[f]!=null)
                        maptipField=maptipField.replace("["+f+"]",data.features[i].attributes[f]);
                }
                if (!(maptipField.indexOf("[")>=0)){
                    if (allMaptips.length!=0){
                        allMaptips+="<br/>";
                    }
                    allMaptips+=maptipField;
                }
            }
        }
        var maptipDiv=document.getElementById("olControlMapTip");
        if (allMaptips.length>0){
            if (maptipDiv==undefined){
                maptipDiv=document.createElement('div');
                maptipDiv.id="olControlMapTip";
                maptipDiv.style.position='absolute';
                data.object.map.div.appendChild(maptipDiv);
                maptipDiv.style.zIndex="10000";
                maptipDiv.className="olControlMaptip";
                var maptipText=document.createElement('div');
                maptipText.id='olControlMaptipText';
                maptipDiv.appendChild(maptipText);
            }
            maptipDiv.style.top=data.xy.y+"px";
            maptipDiv.style.left=data.xy.x+10+'px'
            maptipDiv.style.display="block";
            var maptipText=document.getElementById('olControlMaptipText');
            if (maptipText.innerHTML.length==0)
                maptipText.innerHTML=allMaptips;
            else{
                maptipText.innerHTML=maptipText.innerHTML+"<br/>"+allMaptips;
            }
        }
    },
    removeMaptip : function(object){
        var maptipDiv=document.getElementById("olControlMapTip");
        if (maptipDiv!=undefined){
            maptipDiv.style.display="none";
            var maptipText=document.getElementById('olControlMaptipText');
            maptipText.innerHTML="";
        }
    },
    onIdentifyDataHandler : function(data){
        var obj = new Object();
        for( var i = 0 ; i < data.features.length ; i++){
            var featureType = data.features[i].gml.featureType;
            if(obj[featureType] == undefined){
                obj [featureType] = new Array();
            }
            obj [featureType].push( data.features[i].attributes);
        }
        //get The identifyTool that is active to call the onIdentifyData handler
        var getFeatureTools=this.getToolsByType(Tool.GET_FEATURE_INFO);
        for (var i=0; i < getFeatureTools.length; i++){
            if (getFeatureTools[i].isActive()){
                getFeatureTools[i].getFeatureInfoHandler("onIdentifyData",obj);
                return;
            }
        }
    },
    // onIdentify event handling
    onIdentifyHandler : function(extent){
        //get The identifyTool that is active to call the onIdentify handler
        var getFeatureTools=this.getToolsByType(Tool.GET_FEATURE_INFO);
        for (var i=0; i < getFeatureTools.length; i++){
            if (getFeatureTools[i].isActive()){
                var pix = extent.xy;
                var lonlat = webMapController.getMap().getFrameworkMap().getLonLatFromPixel(pix);
                var genericExtent = new Extent(lonlat.lon,lonlat.lat,lonlat.lon,lonlat.lat);
                getFeatureTools[i].beforeGetFeatureInfoHandler("onIdentify",genericExtent);
                return;
            }
        }
    }
});


/**
    * The request function for WMSGetFeatureInfo redone, so that querylayers are properly set
    */
function doGetFeatureRequest(clickPosition, options) {
    var layers = this.findLayers();
    if(layers.length == 0) {
        this.events.triggerEvent("nogetfeatureinfo");
        // Reset the cursor.
        OpenLayers.Element.removeClass(this.map.viewPortDiv, "olCursorWait");
        return;
    }

    options = options || {};
    if(this.drillDown === false) {
        var wmsOptions = this.buildWMSOptions(this.url, layers, clickPosition, layers[0].params.FORMAT);
        (wmsOptions["params"])["STYLES"] = "";
        (wmsOptions["params"])["QUERY_LAYERS"] = this.queryLayers.split(",");
        var request = OpenLayers.Request.GET(wmsOptions);

        if (options.hover === true) {
            this.hoverRequest = request;
        }
    } else {
        this._requestCount = 0;
        this._numRequests = 0;
        this.features = [];
        // group according to service url to combine requests
        var services = {}, url;
        for(var i=0, len=layers.length; i<len; i++) {
            var layer = layers[i];
            var service, found = false;
            url = layer.url instanceof Array ? layer.url[0] : layer.url;
            if(url in services) {
                services[url].push(layer);
            } else {
                this._numRequests++;
                services[url] = [layer];
            }
        }
        var layers;
        for (var url in services) {
            layers = services[url];
            var wmsOptions = this.buildWMSOptions(url, layers,
                clickPosition, layers[0].params.FORMAT);
            OpenLayers.Request.GET(wmsOptions);
        }
    }
}