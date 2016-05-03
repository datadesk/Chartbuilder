var storageUrl;
if (process.env.NODE_ENV == "dev") {
    // Include React as a global variable if we are in dev environment.
    // This makes the app useable with React dev tools
    global.React = require("react");
    storageUrl = 'data/chart-slugs.txt';
} else {
    storageUrl = 'http://stockserver.usa.tribune.com/chartbuilder-lat/slugs-list.txt';
}

var React = require("react");
var ReactDOM = require("react-dom");
var container = document.querySelector(".chartbuilder-container");
var Storage = require("../js/components/Storage.jsx");

document.addEventListener("DOMContentLoaded", function() {
    // Render the storage unit
    ReactDOM.render(
        <Storage url={storageUrl} />,
        container
    );
});
