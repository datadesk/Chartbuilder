var storageUrl = 'slugs-list.txt';

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
