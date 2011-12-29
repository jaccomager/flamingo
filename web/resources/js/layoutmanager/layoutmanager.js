/*
 * Copyright (C) 2011 B3Partners B.V.
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

Ext.Loader.setConfig({enabled:true});
Ext.require([
    'Ext.view.*',
    'Ext.data.*',
    'Ext.dd.*',
    'Ext.layout.*'
]);

Ext.onReady(function() {
    var components = [
        {id:'flamingo',name:'Flamingo Map',shortName:'Fm',restrictions:['content'],addOnce:true,linkedComponents:['openlayers'],addedToRegions:['content']},
        {id:'openlayers',name:'OpenLayers Map',shortName:'Om',restrictions:['content'],addOnce:true,linkedComponents:['flamingo']},
        {id:'tabs',name:'Tabs',shortName:'Tb',restrictions:['leftmargin_top', 'rightmargin_top'],addOnce:false,linkedComponents:[]},
        {id:'zoom',name:'Zoom',shortName:'Zm',restrictions:['top_menu'],addOnce:true,linkedComponents:[]},
        {id:'pan',name:'Pan',shortName:'Pa',restrictions:['top_menu'],addOnce:true,linkedComponents:[]},
        {id:'streetview',name:'Streetview',shortName:'Sv',restrictions:['top_menu'],addOnce:true,linkedComponents:[]},
        {id:'identify',name:'Identify',shortName:'Id',restrictions:['top_menu'],addOnce:true,linkedComponents:[]}
    ];

    var layoutRegions = [
        {id:'header', htmlId:'layout_header', useShortName:false, floatComponents: false},
        {id:'leftmargin_top', htmlId:'layout_left_top', useShortName:false, floatComponents: false},
        {id:'leftmargin_bottom', htmlId:'layout_left_bottom', useShortName:false, floatComponents: false},
        {id:'left_menu', htmlId:'layout_left_menu', useShortName:false, floatComponents: false},
        {id:'top_menu', htmlId:'layout_top_menu', useShortName:true, floatComponents: true},
        {id:'content', htmlId:'layout_content', useShortName:false, floatComponents: false},
        {id:'popupwindow', htmlId:'layout_popupwindow', useShortName:false, floatComponents: false},
        {id:'rightmargin_top', htmlId:'layout_right_top', useShortName:false, floatComponents: false},
        {id:'rightmargin_bottom', htmlId:'layout_right_bottom', useShortName:false, floatComponents: false},
        {id:'footer', htmlId:'layout_footer', useShortName:false, floatComponents: false}
    ];

    Ext.define('Component', {
        extend: 'Ext.data.Model',
        idProperty: 'id',
        fields: [
            {name: 'id', type: 'string'},
            {name: 'name', type: 'string'},
            {name: 'shortName', type: 'string'},
            {name: 'restrictions', type: 'array'},
            {name: 'addOnce', type: 'boolean'},
            {name: 'linkedComponents', type: 'array'},
            {name: 'addedToRegions', type: 'array'}
        ],
        isAddedToRegion: function(regionid) {
            var isAdded = false;
            Ext.Array.each(this.get('addedToRegions'), function(region, index) {
                if(region == regionid) {
                    isAdded = true;
                }
            });
            return isAdded;
        }
    });
    
    var componentStore = Ext.create('Ext.data.Store', {
        model: 'Component',
        data: components
    });
    
    Ext.define('LayoutRegion', {
        extend: 'Ext.data.Model',
        idProperty: 'id',
        fields: [
            {name: 'id', type: 'string'},
            {name: 'htmlId', type: 'string'},
            {name: 'useShortName', type: 'boolean'},
            {name: 'floatComponents', type: 'boolean'},
            {name: 'addedComponents', type: 'array'}
        ],
        isComponentAdded: function(compid) {
            var isAdded = false;
            Ext.Array.each(this.get('addedComponents'), function(comp, index) {
                if(comp == compid) {
                    isAdded = true;
                }
            });
            return isAdded;
        }
    });
    
    var layoutRegionsStore = Ext.create('Ext.data.Store', {
        model: 'LayoutRegion',
        data: layoutRegions
    });
    
    Ext.create('Ext.view.View', {
        cls: 'component-view',
        tpl: '<tpl for=".">' +
                '<div class="component-block">' +
                    '<div class="remove"></div>' +
                    '<div class="wrangler"></div>' +
                    '<div class="title">{name}</div>' +
                '</div>' +
             '</tpl>',
        itemSelector: 'div.component-block',
        overItemCls: 'component-over',
        selectedItemClass: 'component-selected',
        singleSelect: true,
        store: componentStore,
        renderTo: 'component-container',
        listeners: {
            render: function(v) {
                v.dragZone = Ext.create('Ext.dd.DragZone', v.getEl(), {
                    getDragData: function(e) {
                        var sourceEl = e.getTarget(v.itemSelector, 10);
                        if (sourceEl && !Ext.fly(sourceEl).hasCls('component-added')) {
                            var d = sourceEl.cloneNode(true);
                            d.id = Ext.id();
                            return v.dragData = {
                                sourceEl: sourceEl,
                                repairXY: Ext.fly(sourceEl).getXY(),
                                ddel: d,
                                componentData: v.getRecord(sourceEl).data
                            };
                        }
                        return null;
                    },
                    getRepairXY: function() {
                        return this.dragData.repairXY;
                    }
                });
            },
            viewready: function(view, e) {
                initRegions();
                initConfig(view);
            }
        }
    });

    function initRegions() {
        layoutRegionsStore.each(function(layoutRegion) {
            Ext.create('Ext.dd.DropZone', Ext.get(layoutRegion.get('htmlId')), {
                getTargetFromEvent: function(e) {
                    return e.getTarget('.content-container');
                },
                onNodeEnter : function(target, dd, e, data){
                    Ext.fly(target).addCls('content-container-hover');
                },
                onNodeOut : function(target, dd, e, data){
                    Ext.fly(target).removeCls('content-container-hover');
                },
                onNodeOver : function(target, dd, e, data){
                    if(this.checkDropAllowed(data)) {
                        return Ext.dd.DropZone.prototype.dropAllowed;
                    }
                    return Ext.dd.DropZone.prototype.dropNotAllowed;
                },
                onNodeDrop : function(target, dd, e, data){
                    if(this.checkDropAllowed(data)) {
                        addComponentToRegion(target, data, layoutRegion);
                        return true;
                    }
                    return false;
                },
                checkDropAllowed: function(data) {
                    var restrictions = data.componentData.restrictions;
                    var linkedComponents = data.componentData.linkedComponents;
                    var dropId = layoutRegion.get('id');
                    if(Ext.isEmpty(restrictions) || (Ext.isArray(restrictions) && Ext.Array.contains(restrictions, dropId))) {
                        if(!Ext.isEmpty(linkedComponents)) {
                            if(Ext.isArray(linkedComponents)) {
                                var linkedComponentAdded = false;
                                Ext.Array.each(linkedComponents, function(comp, index) {
                                    if(layoutRegion.isComponentAdded(comp)) {
                                        linkedComponentAdded = true;
                                    }
                                });
                                if(linkedComponentAdded) return false;
                            }
                        }
                        return true;
                    }
                    return false;
                }
            });
        });
    }
    
    // Initial config. Adds all previously added components to the right regions
    function initConfig(view) {
        componentStore.each(function(component){
            if(!Ext.isEmpty(component.get('addedToRegions'))) {
                Ext.Array.each(component.get('addedToRegions'), function(regionid, index) {
                    var region = layoutRegionsStore.findRecord('id', regionid);
                    var sourceEl = view.getNode(component);
                    if(sourceEl && region) {
                        var d = sourceEl.cloneNode(true);
                        d.id = Ext.id();
                        var data = {
                            sourceEl: sourceEl,
                            repairXY: Ext.fly(sourceEl).getXY(),
                            ddel: d,
                            componentData: component.data
                        }
                        addComponentToRegion(region.get('htmlId'), data, region);
                    }
                });
            }
        });
    }
    
    function addComponentToRegion(target, data, layoutRegion) {
        Ext.fly(target).appendChild(data.ddel);
        var droppedEl = Ext.get(data.ddel);
        if(layoutRegion.get('useShortName')) {
            droppedEl.child('.title').update(data.componentData.shortName);
        }
        if(layoutRegion.get('floatComponents')) {
            droppedEl.addCls('float-component');
        }
        droppedEl.child('.wrangler').on('click', function() {
            editComponent(data.componentData);
        });
        droppedEl.child('.remove').on('click', function() {
            Ext.MessageBox.confirm(
                "Component uit layout verwijderen?",
                "Weet u zeker dat dit component uit de layout wilt verwijderen?<br />" +
                "Bij het opslaan van de layout gaat eventuele configuratie van<br />" +
                "dit component verloren als u dit component verwijderd",
                function(btnClicked) {
                    if(btnClicked == 'yes') {
                        Ext.fly(data.sourceEl).removeCls("component-added");
                        droppedEl.remove();
                        var addedToRegions = data.componentData.addedToRegions;
                        if(!Ext.isEmpty(addedToRegions) && Ext.isArray(addedToRegions)) {
                            Ext.Array.remove(addedToRegions, layoutRegion.get('id'));
                        }
                        var addedComponents = layoutRegion.get('addedComponents');
                        if(!Ext.isEmpty(addedComponents) && Ext.isArray(addedComponents)) {
                            Ext.Array.remove(addedToRegions, data.componentData.id);
                        }
                    }
                }
            );
        });
        if(data.componentData.addOnce) {
            Ext.fly(data.sourceEl).addCls("component-added");
        }

        // Add region to component, so it knows the regions its added to
        var addedToRegions = data.componentData.addedToRegions;
        if(Ext.isEmpty(addedToRegions)) {
            addedToRegions = [layoutRegion.get('id')];
        } else {
            // check if it is not added already
            if(!Ext.Array.contains(data.componentData.addedToRegions, layoutRegion.get('id'))) {
                addedToRegions.push(layoutRegion.get('id'));
            }
        }
        data.componentData.addedToRegions = addedToRegions;

        // Add component to region, so it knows which components are added
        var addedComponents = layoutRegion.get('addedComponents');
        if(Ext.isEmpty(addedComponents)) {
            addedComponents = new Array();
        }
        addedComponents.push(data.componentData.id);
        layoutRegion.set('addedComponents', addedComponents);
    }
});

function editComponent(componentData) {
    console.log('Edit!', componentData);
}