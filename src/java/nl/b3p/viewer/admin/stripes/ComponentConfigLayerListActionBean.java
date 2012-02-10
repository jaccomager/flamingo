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
package nl.b3p.viewer.admin.stripes;

import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.EntityManager;
import net.sourceforge.stripes.action.*;
import net.sourceforge.stripes.validation.Validate;
import nl.b3p.viewer.config.app.Application;
import nl.b3p.viewer.config.app.ApplicationLayer;
import nl.b3p.viewer.config.app.Level;
import nl.b3p.viewer.config.services.Layer;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.JSONArray;
import org.json.JSONException;
import org.stripesstuff.stripersist.Stripersist;

/**
 *
 * @author Roy Braam
 */
@UrlBinding("/action/componentConfigLayerList")
@StrictBinding
public class ComponentConfigLayerListActionBean implements ActionBean {
    private static final Log log = LogFactory.getLog(ComponentConfigLayerListActionBean.class);
    private ActionBeanContext context;

    public ActionBeanContext getContext() {
        return context;
    }

    public void setContext(ActionBeanContext context) {
        this.context = context;
    }
    
    @Validate
    private Long appId;
    private Boolean filterable=false;
    private Boolean bufferable=false;
    
    //<editor-fold defaultstate="collapsed" desc="Getters and setters">
    public Long getAppId() {
        return appId;
    }
    public void setAppId(Long appId) {
        this.appId = appId;
    }
    public Boolean getFilterAble() {
        return filterable;
    }
    public void setFilterAble(Boolean filterAble) {
        this.filterable = filterAble;
    }
    public Boolean getBufferAble() {
        return bufferable;
    }
    public void setBufferAble(Boolean bufferAble) {
        this.bufferable = bufferAble;
    }
    //</editor-fold>
    
    public Resolution source() {
        EntityManager em = Stripersist.getEntityManager();
        JSONArray jsonArray = new JSONArray();
        
        if (appId!=null){
            Application app = em.find(Application.class, appId);

            List<Layer> layers= getLayers(app.getRoot());

            for (Layer layer : layers){
                try{
                    jsonArray.put(layer.toJSONObject());
                }catch(JSONException je){
                    log.error("Error while getting JSONObject of Layer with id: "+layer.getId(),je);
                }
            }           
        }
        return new StreamingResolution("application/json",new StringReader(jsonArray.toString()));        
    }
    /**
     * Get a list of Layers from the level and its subLevels
     * @param level 
     * @return A list of Layer objects
     */
    private List<Layer> getLayers(Level level) {
        List<Layer> layers= new ArrayList<Layer>();
        //get all the layers of this level
        for (ApplicationLayer appLayer: level.getLayers()){
            Layer l=appLayer.getService().getLayer(appLayer.getLayerName());
            if (filterable && !l.isFilterable() ||
                    bufferable && !l.isBufferable()){                    
                continue;
            }                
            layers.add(l);
        }
        //get all the layers of the level children.
        for (Level childLevel: level.getChildren()){
            layers.addAll(getLayers(childLevel));
        }
        return layers;
    }
}
