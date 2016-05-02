if (process.env.NODE_ENV == "dev") {
    // Include React as a global variable if we are in dev environment.
    // This makes the app useable with React dev tools
    global.React = require("react");
    console.log("Dev environment");
}

var React = require("react");
var ReactDOM = require("react-dom");
var container = document.querySelector(".chartbuilder-container");

var Storage = React.createClass({
    getInitialState: function() {
        return {data: []};
    },
    // Ajax request to fetch data
    componentDidMount: function() {
        var self = this;
        var client = new XMLHttpRequest();
        client.open('GET', this.props.url);
        client.onreadystatechange = function() {
            if (client.readyState === 4) {
                var data = client.responseText.split('\n');
                self.setState({data:data});
            }
        };
        client.send();
    },
    render: function() {
        return(
            <div className="chartbuilder-storage">
                <div className="page-header">
                    <h1 className="chartbuilder-title">Chartbuilder archive</h1>
                </div>
                <StorageList data={this.state.data} />
            </div>
        )
    }
})

var StorageList = React.createClass({
    render: function() {
        // Create an item node for each element returned in the data
        var itemNodes = this.props.data.map(function(item) {
            return (
                <StorageItem slug={item} />
            );
        });

        return(
            <div className="storageList">
                {itemNodes}
            </div>
        );
    }
});

var StorageItem = React.createClass({
    render: function() {
        var imgUrl = "data/" + this.props.slug + "/" + this.props.slug + ".png";
        return (
            <div className="storageItem">
                <img src={imgUrl}/>
                <p className="itemSlug">{this.props.slug}</p>
            </div>
        );
    }
});


document.addEventListener("DOMContentLoaded", function() {
    // Render the storage unit
    ReactDOM.render(
        <Storage url='data/chart-slugs.txt' />,
        container
    );
});

// console.log(dirs);