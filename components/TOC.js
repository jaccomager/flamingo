/* 
 * Copyright (C) 2012 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * Overview component
 * Creates a overview map
 * @author <a href="mailto:meinetoonen@b3partners.nl">Meine Toonen</a>
 */
Ext.define ("viewer.components.TOC",{
    extend: "viewer.components.Component",
    panel: null,
    selectedContent : null,
    appLayers :  null,
    service : null,
    levels : null,
    checkClicked : false,
    popup:null,
    config: {
        groupCheck:true,
        layersChecked:true,
        showBaselayers:true,
        title: "Table of Contents"
    },
    constructor: function (config){
        viewer.components.TOC.superclass.constructor.call(this, config);
        this.initConfig(config);
        this.loadTree();
        this.loadInitLayers();
        this.viewerController.mapComponent.getMap().registerEvent(viewer.viewercontroller.controller.Event.ON_LAYER_VISIBILITY_CHANGED,this.syncLayers,this);
        this.viewerController.addListener(viewer.viewercontroller.controller.Event.ON_SELECTEDCONTENT_CHANGE,this.selectedContentChanged,this);
        return this;
    },
    // Build the tree
    loadTree : function(){        
        // Get the current state of the map
        this.selectedContent = this.viewerController.app.selectedContent;
        this.appLayers = this.viewerController.app.appLayers;
        this.levels = this.viewerController.app.levels;
        this.services = this.viewerController.app.services;
        Ext.QuickTips.init();
        var store = Ext.create('Ext.data.TreeStore', {
            root: {
                text: 'Root',
                expanded: true,
                checked: false,
                children: []
            }
        });
        
        var title = "";
        if(this.title && !this.viewerController.layoutManager.isTabComponent(this.name)) title = this.title;        
        this.panel =Ext.create('Ext.tree.Panel', {
            renderTo: this.getContentDiv(),
            title: title,
            height: "100%",
            useArrows: true,
            rootVisible: false,
            floating: false,
            listeners:{
                itemclick:{
                    toc: this,
                    fn: this.itemClicked,
                    scope: this
                },
                checkchange:{
                    toc: this,
                    fn: this.checkboxClicked,
                    scope: this
                }
            },
            store: store
        });
    },
    // Start the treetraversal
    loadInitLayers : function(){
        var nodes = new Array();
        for ( var i = 0 ; i < this.selectedContent.length ; i ++){
            var contentItem = this.selectedContent[i];
            if(contentItem.type ==  "level"){
                var level = this.addLevel(contentItem.id);
                if(level != null){
                    nodes.push(level.node);
                }
            }else if(contentItem.type == "appLayer"){
                var layer = this.addLayer(contentItem.id);
                nodes.push(layer.node);
            }
        }
        this.insertLayer(nodes);
    },
    // Add a level to the tree, and load all it's levels and applayers
    addLevel : function (levelId){
        var nodes = new Array();
        var level = this.levels[levelId];
        if(level.background && !this.showBaselayers ){
            return null;
        }
        var treeNodeLayer = {
            text: level.name, 
            id: "level-"+level.id,
            expanded: true,
            leaf: false,
            layerObj: {
                serviceId: level.id
            }
        };
        if(this.groupCheck){
            treeNodeLayer.checked=  false; // Todo: find children checkboxes
        }
        if(level.info != undefined){
            treeNodeLayer.qtip= "Informatie over de kaart";
            treeNodeLayer.layerObj.info = level.info;
        }
        
        var childsChecked = 0;
        var totalChilds = 0;
        
        if(level.children != undefined ){
            for(var i = 0 ; i < level.children.length; i++){
                var l = this.addLevel(level.children[i]);
                if(l.node != null) {
                    totalChilds++;
                    if(l.tristate === 0) {
                        totalChilds++;
                        childsChecked++;
                    } else if(l.tristate === 1) {
                        childsChecked++;
                    }
                    nodes.push(l.node);
                }
            }
        }
        if(level.layers != undefined ){
            for(var j = 0 ; j < level.layers.length ; j ++){
                var layer = this.addLayer(level.layers[j]);
                totalChilds++;
                if(layer.checked) childsChecked++;
                nodes.push(layer.node);
            }
        }
        if(this.groupCheck) {
            var tristate = this.updateTriStateClass(null, childsChecked, totalChilds);
            if(tristate === 1) {
                treeNodeLayer.checked = true;
            } else if (tristate === 0) {
                treeNodeLayer.cls = 'tristatenode';
            }
        }
        treeNodeLayer.children= nodes;
        return {
            node: treeNodeLayer,
            tristate: tristate
        };
    },
    // Add a layer to the level
    addLayer : function (layerId){
        var appLayerObj = this.appLayers[layerId];
        var service = this.services[appLayerObj.serviceId];
        var serviceLayer = service.layers[appLayerObj.layerName];
        var layerTitle = this.viewerController.getLayerTitle(service.id, appLayerObj.layerName); // TODO: Search title
        var treeNodeLayer = {
            text: layerTitle,
            id: "layer-"+appLayerObj.id,
            expanded: true,
            leaf: true,
            layerObj: {
                service: service.id,
                layerName : appLayerObj.layerName
            }
        };
        if(serviceLayer.details != undefined && serviceLayer.details ["metadata.stylesheet"] != undefined){
            treeNodeLayer.qtip= "Metadata voor de kaartlaag";
            treeNodeLayer.layerObj.metadata = serviceLayer.details ["metadata.stylesheet"];
        }
        var retChecked = false;
        if(this.layersChecked){
            treeNodeLayer.checked = appLayerObj.checked;
            retChecked = appLayerObj.checked;
        }
        return {
            node: treeNodeLayer,
            checked: retChecked
        };
    },
    insertLayer : function (config){
        var root = this.panel.getRootNode();
        root.appendChild(config);
        root.expand()
    },
    selectLayers : function (layers,checked){
        for(var i = 0 ; i< layers.length;i++){
            this.selectLayer(layers[i],checked);
        }
    },
    selectLayer : function (layer,checked){
        var node = this.panel.getStore().getNodeById(layer);
        if(node != null){
            if( node.data.checked != checked){
                node.data.checked= checked;
                if(node.raw != undefined){
                    node.raw.checked = checked;
                }
                this.checkboxClicked (node,checked,this);
                node.updateInfo();
                this.setNodeChecked(node,checked);
            }
        }
    },
    
    getAppLayerId : function (name){
        // Not the correct way to get the applayerID TODO: Fix it
        for ( var i in this.appLayers){
            var appLayer = this.appLayers[i];
            if(appLayer.layerName== name){
                return "layer-"+appLayer.id;
            }
        }
        return null;
    },
    
    setTriState: function(node) {
        var me = this;
        var checked = me.getNodeChecked(node);
        var updateTree = false;
        if(node.hasChildNodes()) {
            // It is a folder
            updateTree = true;
            me.updateTreeNodes = [];
            me.checkChildNodes(node, checked);
            if(checked) {
                me.updateTriStateClass(node, 1, 1);
            } else {
                me.updateTriStateClass(node, 0, 1);
            }
        }
        if(node.parentNode.parentNode != null) {
            me.updateTriState(node.parentNode);
        }
        // After the tree has been updated, update the map with all nodes involved
        if(updateTree) {
            for(var i = 0; i < me.updateTreeNodes.length; i++) {
                me.updateMap(me.updateTreeNodes[i], checked);
            }
        }
    },
    
    updateTriState: function(node) {
        var me = this;
        var totalChecked = 0;
        var totalNodes = 0;
        node.eachChild(function(childNode) {
            totalNodes++;
            if(me.getNodeChecked(childNode)) totalChecked++;
            /* If a child node has a tristate, the parent should also have a tristate,
             * thus we are adding extra nodes in the counter so the total number of nodes
             * and the number of checked nodes is always unequal and there is always a "checked" node,
             * for explanation why this is done, see the updateTriStateClass function for how the tristate is determined */
            if(me.hasTriState(childNode)) {
                totalNodes = totalNodes + 2;
                totalChecked++;
            }
        });
        me.updateTriStateClass(node, totalChecked, totalNodes);
        if(node.parentNode.parentNode != null) {
            me.updateTriState(node.parentNode);
        }
    },
    
    updateTriStateClass: function(node, totalChecked, totalNodes) {
        var tristate = 0;
        if(totalChecked == 0) {
            tristate = -1;
        } else if(totalChecked == totalNodes) {
            tristate = 1;
        }
        if(node != null) {
            if(tristate == -1) {
                node.data.tristate = -1;
                node.set('cls', '');
                node.set('checked', false);
            } else if(tristate == 1) {
                node.data.tristate = 1;
                node.set('cls', '');
                node.set('checked', true);
            } else {
                node.data.tristate = 0;
                node.set('cls', 'tristatenode');
                node.set('checked', false);
            }
        }
        return tristate;
    },
    
    checkChildNodes: function(node, checked) {
        var me = this;
        node.eachChild(function(childNode) {
            childNode.set('checked', checked);
            me.updateTreeNodes.push(childNode);
            if(childNode.hasChildNodes()) {
                childNode.set('cls', '');
                me.checkChildNodes(childNode, checked);
            }
        });
    },
    
    getNodeChecked: function(node) {
        if(Ext.isDefined(node.data) && Ext.isDefined(node.data.checked)) return node.data.checked;
        if(Ext.isDefined(node.raw) && Ext.isDefined(node.raw.checked)) return node.raw.checked;
        return false;
    },
    
    hasTriState: function(node) {
        if(Ext.isDefined(node.data) && Ext.isDefined(node.data.tristate)) {
            if(node.data.tristate === 0) return true;
        }
        return false;
    },
    
    updateMap: function(nodeObj, checked) {
        if(nodeObj.isLeaf()){
            var node = nodeObj.raw;
            if(node ===undefined){
                node = nodeObj.data;
            }
            var layer = node.layerObj;
    
            if(checked){
                this.viewerController.setLayerVisible(layer.service, layer.layerName, true);
            }else{
                this.viewerController.setLayerVisible(layer.service, layer.layerName, false);
            }
        }
    },
    
    /*************************  Event handlers ***********************************************************/
    syncLayers : function (map,object){
        var layer = object.layer;
        var visible = object.visible;
        var id = this.getAppLayerId(layer.id);
        this.selectLayer (id,visible);
    },
    
    checkboxClicked : function(nodeObj,checked,toc){
        this.checkClicked= true;
        this.setTriState(nodeObj);
        this.updateMap(nodeObj, checked);
    },
    // Open the popup with the metadata/info of the level/applayer
    itemClicked: function(thisObj, record, item, index, e, eOpts){
        if(this.checkClicked){
            this.checkClicked =false;
            return
        }
        var node = record.raw;
        if(node ===undefined){
            node = record.data;
        }
        var layerName = node.text;
        if(node.leaf){
            if(node.layerObj.metadata!= undefined){
                var config = {
                    details:{
                        width : 700,
                        height: 500
                    },
                    title: "Metadata"
                };
                
                if(this.popup != null){
                    this.popup.hide();
                }
                this.popup = Ext.create("viewer.components.ScreenPopup",config);
                var panelConfig={
                    renderTo : this.popup.getContentId(),
                    frame: false,
                    html: node.layerObj.metadata
                }
                var panel = Ext.create ("Ext.panel.Panel",panelConfig);
                this.popup.show();
            }
        }else if(!node.leaf){
            if(node.layerObj.info!= undefined){
                if(this.popup != null){
                    this.popup.hide();
                }
                var config = {
                    details:{
                        width : 700,
                        frame: false,
                        height: 500
                    },
                    title: "Info"
                };
                
                this.popup = Ext.create("viewer.components.ScreenPopup",config);
                var panelConfig={
                    renderTo : this.popup.getContentId(),
                    html: node.layerObj.info
                }
                var panel = Ext.create ("Ext.panel.Panel",panelConfig);
                this.popup.show();
            }
        }
    },
    setNodeChecked : function (item,visible){
            var a = 0;
    },
/*/
         * Set node Checked
         * <input class="x-tree-checkbox" type="button" role="checkbox">
>>> Ext.get(item).select ('input').elements[0]
<input class="x-tree-checkbox x-tree-checkbox-checked" type="button" aria-checked="true" role="checkbox">
        
         */
        // Entrypoint for when the selected content is changed: destroy the current tree and rebuild it.
    selectedContentChanged : function (){
        this.panel.destroy();
            
        this.loadTree();
        this.loadInitLayers();
    },
    
    getExtComponents: function() {
        return [ this.panel.getId() ];
    }
});
