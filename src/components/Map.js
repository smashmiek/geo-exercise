import React, {Component} from 'react';
import L from 'leaflet';
import _ from 'lodash';
import 'leaflet/dist/leaflet.css';
import '../styles/Map.css';

const mapboxAccessToken = 'pk.eyJ1Ijoic21hc2htaWVrIiwiYSI6IjNkTUE1dUkifQ.j8UzktG7fQWjDO7f3Gt3xA';

class Map extends Component {

    constructor() {
        super();

        this.state = {
            thematicData: '',
            mapTitle: ''
        }

    }

    decodePoints = function (encoded) {

        var len = String(encoded).length;
        var index = 0;
        var ar = [];
        var lat = 0;
        var lng = 0;

        try {

            while (index < len) {

                var b;
                var shift = 0;
                var result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                }
                while (b >= 0x20);

                var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lng += dlng;

                shift = 0;
                result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                }
                while (b >= 0x20);

                var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lat += dlat;

                let latlng = L.latLng((lat * 1e-5), (lng * 1e-5));

                ar.push(latlng);
            }

        }


        catch (ex) {

            //error in encoding.

        }


        return ar;


    };

    getThematicData = () => {

        let polygons, polygonData;

        fetch('http://geo-exercise.id.com.au/api/geo')
            .then((response) => {
                    if (response.status !== 200) {
                        console.log('Looks like there was a problem. Status code: ', response);
                        return;
                    }

                    response.json().then((data) => {

                        // Decode the points data
                        let decodedData = _.map(data.shapes, (item) => {
                            item.points = this.decodePoints(item.points);
                            return item;
                        });

                        polygons = decodedData;

                    });
                }
            ).then(()=>{
            fetch('http://geo-exercise.id.com.au/api/data')
                .then((response) => {

                    if (response.status !== 200) {
                        console.log('Looks like there was a problem. Status code: ', response);
                        return;
                    }

                    response.json().then((data) => {

                        polygonData = data.data;

                        var merge = _.map(polygons, function(item) {
                            return _.merge(item, _.find(polygonData, { 'GeoID' : item.id }));
                        });

                        this.setState({thematicData: merge});

                        this.setState({mapTitle: data.mapTitle})

                    });

                })
        })
            .catch((err) => {
                console.log('Fetch Error', err)
            });
    };

    componentWillMount() {
        this.getThematicData();

    }

    componentDidMount() {

        this.leafletMap = L.map('Map').setView([37.8, -96], 4);

        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
            id: 'mapbox.light'
        }).addTo(this.leafletMap);

        this.polygonsLayer = L.featureGroup().addTo(this.leafletMap);

    }

    componentDidUpdate() {
        this.leafletMap.fitBounds(this.polygonsLayer.getBounds());
    }

    render() {

        _.each(this.state.thematicData, (item) => {

            let tooltipContent = '';

            _.forIn(item.InfoBox, (value, key) => {
               tooltipContent += key + ': ' + value + '<br>';
            });

            let style = {
                fillColor: item.color,
                weight: 1,
                color: 'black',
                fillOpacity: (item.cA / 255),
            };

            this.polygonsLayer.addLayer(L.polygon(item.points, style))
                .bindTooltip(tooltipContent);
        });

        return (
            <div id="Map">
                <div className="mapTitle">{this.state.mapTitle}</div>
            </div>
        );
    }
}

export default Map;
