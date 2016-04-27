var React = require("react");

var Instructions = React.createClass({

	render: function() {
		var self = this;
		return (
		        <div className="page-header">
			        <h1 className="chartbuilder-title">Chartbuilder</h1>
			        <div className="instructions">
				        <p>Chartbuilder is a web application designed to streamline the production of simple charts.</p>
				        <p>First time here? Please take a moment and read the <a href="http://stockserver.usa.tribune.com/chartbuilder-lat/instructions.html">instructions</a>.</p>
		        	</div>
		        </div>
		        );
	}
});

module.exports = Instructions;
