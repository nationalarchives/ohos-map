// Define custom icon
var customIcon = L.icon({
  iconUrl: './images/icon-red.svg',
  iconSize: [31, 39],
  iconAnchor: [15, 39],
});

// Function to create HTML for cluster markers
function createClusterHtml(count) {
  return `
    <div>
      <span>${count}</span>
    </div>
  `;
}

// Create marker cluster group
var markers = L.markerClusterGroup({
  iconCreateFunction: function (cluster) {
    const count = cluster.getChildCount();

    return L.divIcon({
      html: createClusterHtml(count),
      className: 'leaflet-marker-icon marker-cluster',
      iconSize: L.point(54, 54),
    });
  },
});

// Filter data to include only items with lat and lon
var dataWithLatLon = rawData.data.filter(item => {
  const details = item['@template'].details;
  return details.lat && details.lon;
});

var dataWithoutLatLon = rawData.data.filter(item => {
  const details = item['@template'].details;
  return !details.lat && !details.lon;
});

// Convert data to GeoJSON format
var dataToGeoJson = {
  type: 'FeatureCollection',
  features: dataWithLatLon.map(item => {
    const details = item['@template'].details;
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [details.lon, details.lat],
      },
      properties: {
        title: details.title,
        description: details.description,
        itemURL: details.itemURL,
        collection: details.collection,
      },
    };
  }),
};

let params = new URLSearchParams(document.location.search);

const hasLatAndLng = params.get("lat") && params.get("lng");

const initialLat = hasLatAndLng ? params.get("lat") : 53.043041;
const initialLng = hasLatAndLng ? params.get("lng") : -2.992494;
const initialZoom = params.get("zoom") ?? 7;

// Initialize map
const map = L.map('map', {
  center: [initialLat, initialLng],
  zoom: initialZoom,
  zoomControl: false,
});


// Add zoom control
L.control.zoom({
  position: 'topright',
}).addTo(map);

// Create dataset overlay control
const datasetOverlay = L.control({ position: 'topleft' });

// Add content to dataset overlay control
datasetOverlay.onAdd = function (map) {
  var div = L.DomUtil.create('div');
  div.innerHTML = `
    <div class="map-data-overlay">
      <dl>
        <dt class="map-tag map-tag-red">PCW</dt>
        <dd>People's Collection Wales</dd>
      </dl>
    </div>
  `;
  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);
  return div;
};

// Add dataset overlay control to the map
datasetOverlay.addTo(map);

// Add tile layer to the map
L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Create GeoJSON layer with popups
const placesLeaflet = L.geoJSON(dataToGeoJson, {
  onEachFeature: function (feature, layer) {
    // Popup content
    const templateTitle = feature.properties.title ? `<h2><a href="${feature.properties.itemURL}">${feature.properties.title}</a></h2>` : '';
    const templateDescription = feature.properties.description ? `<p>${feature.properties.description}</p>` : '';
    const templateCollection = feature.properties.collection ? `Collection: <a href="#">${feature.properties.collection}</a>` : '';

    const popupTemplate = `
      <div>
        <img src="./images/icon-file.svg" alt="" />
      </div>
      <div class="custom-popup-content">
        ${templateTitle}
        ${templateDescription}
        ${templateCollection}
      </div>
    `;

    // Popup options
    const popupOptions = {
      maxWidth: 400,
      offset: [0, -35],
      className: 'custom-popup',
    }

    // Bind popup to layer
    layer.bindPopup(popupTemplate, popupOptions);
  },
  // Create markers and add to marker cluster group
  pointToLayer: function (feature, latlng) {
    const marker = L.marker(latlng, { icon: customIcon });
    markers.addLayer(marker);
    return marker;
  }
});

// Add marker cluster group to the map
map.addLayer(markers);

// Add moveend event listener to map and update queryParams for link sharing
map.on('moveend', function() {
  const {lat, lng} = map.getCenter();
  const zoom = map.getZoom();

  const state = { lat, lng, zoom };
  const url = new URL(location);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lng", lng);
  url.searchParams.set("zoom", zoom);

  history.pushState(state, "", url);
});
