import { leafletCss, leafletJavaScript } from "./leafletAssets";

export type MapRoutePoint = { latitude: number; longitude: number };

// Only numeric coordinates cross the bridge; no profile, tokens or route history
// are sent to the map provider. The provider receives visible tile requests.
export function routeCoordinates(points: MapRoutePoint[]) {
  return points
    .filter(
      (p) =>
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.latitude) <= 90 &&
        Math.abs(p.longitude) <= 180,
    )
    .map((p) => [p.latitude, p.longitude]);
}

export function routeUpdateScript(points: MapRoutePoint[]) {
  return `window.setFitTrackRoute && window.setFitTrackRoute(${JSON.stringify(routeCoordinates(points))}); true;`;
}

export const openStreetMapHtml = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://tile.openstreetmap.org data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${leafletCss}
html,body,#map{height:100%;width:100%;margin:0;background:#101A2E;font-family:Arial,sans-serif}
.leaflet-control-zoom a{background:#101A2E;color:#fff;border-color:#94A3B8}
.leaflet-control-attribution{background:#080D1B;color:#fff;font-size:11px;padding:4px 7px}
.leaflet-control-attribution a{color:#00E5A0}
#center{position:absolute;right:12px;top:12px;z-index:1000;border:0;border-radius:18px;background:#080D1B;color:#fff;padding:10px 14px;font-size:13px}
</style></head><body><div id="map" aria-label="Mapa de tu recorrido"></div><button id="center" type="button">Centrar ruta</button>
<script>${leafletJavaScript.replace(/<\/script/gi, "<\\/script")}</script>
<script>
(function(){
  function send(type){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:type}));}
  var map=L.map('map',{zoomControl:true,attributionControl:true});
  map.attributionControl.setPrefix(false);
  var tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,keepBuffer:0,updateWhenIdle:true,updateWhenZooming:false,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  tiles.on('tileerror',function(){send('tile-error');});
  tiles.on('tileload',function(){send('tile-loaded');});
  var route=L.polyline([],{color:'#00E5A0',weight:4}).addTo(map);
  var first=null,last=null,hasView=false,follow=true,automatic=false,coordinates=[];
  function position(action){automatic=true;try{action();}finally{automatic=false;}}
  function fitRoute(){if(!coordinates.length)return;position(function(){
    if(coordinates.length===1)map.setView(coordinates[0],17,{animate:false});
    else map.fitBounds(route.getBounds(),{padding:[24,24],maxZoom:18,animate:false});
  });}
  map.on('dragstart',function(){follow=false;});
  map.on('zoomstart',function(){if(!automatic)follow=false;});
  document.getElementById('center').onclick=function(){follow=true;fitRoute();};
  window.setFitTrackRoute=function(points){
    coordinates=points;route.setLatLngs(points);
    if(!points.length){if(first){map.removeLayer(first);map.removeLayer(last);first=last=null;}return;}
    if(!first){first=L.circleMarker(points[0],{radius:6,color:'#fff',weight:2,fillColor:'#00E5A0',fillOpacity:1}).addTo(map);
      last=L.circleMarker(points[points.length-1],{radius:7,color:'#fff',weight:2,fillColor:'#FF7A30',fillOpacity:1}).addTo(map);}
    first.setLatLng(points[0]);last.setLatLng(points[points.length-1]);
    if(!hasView){fitRoute();tiles.addTo(map);hasView=true;}
    else if(follow&&!map.getBounds().pad(-0.2).contains(points[points.length-1]))position(function(){map.panTo(points[points.length-1],{animate:false});});
  };
  document.addEventListener('click',function(event){var anchor=event.target.closest('a');if(anchor){event.preventDefault();send('attribution');}});
  window.addEventListener('resize',function(){map.invalidateSize();});
  send('ready');
})();
</script></body></html>`;
