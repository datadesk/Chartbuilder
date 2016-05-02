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
                <a href=""><img src={imgUrl}/></a>
                <h2 className="itemSlug">{this.props.slug}</h2>
            </div>
        );
    }
});

module.exports = Storage;

