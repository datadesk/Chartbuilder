var React = require("react");

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
                if (data[data.length - 1] === "") {
                    data.pop();
                }
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
        var baseUrl = "http://stockserver.usa.tribune.com/chartbuilder-lat/chartbuilder-storage/" + this.props.slug + "/";
        var fileUrl = "http://stockserver.usa.tribune.com/chartbuilder-lat/chartbuilder-storage/" + this.props.slug + "/" + this.props.slug;

        return (
            <div className="storageItem">
                <img src={fileUrl + ".png"}/>
                <h2 className="itemSlug">{this.props.slug}</h2>
                <p className="links"><a href={fileUrl +  ".svg"}>SVG</a> | <a href={fileUrl + ".png"}>PNG</a> | <a href={"/?jsonurl=" + encodeURIComponent(fileUrl) + ".json"}>JSON</a></p>
            </div>
        );
    }
});

module.exports = Storage;

