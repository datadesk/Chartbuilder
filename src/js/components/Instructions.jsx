var React = require("react");

var Instructions = React.createClass({

	render: function() {
		var self = this;
		return (
		        <div className="page-header">
			        <h1 className="chartbuilder-title">Chartbuilder</h1>
			        <div className="instructions">
				        <p>Welcome to the Los Angeles Times version of ChartBuilder, a web application designed to streamline the production of simple charts for the web. The charts have been customized with Times styles and optimized for mobile readers.</p>
				        <p>We deployed this tool so that we can respond more quickly to your requests for web charts. Please send a spreadsheet with your data to <a href="mailto:yyartist@latimes.com">yyartist@latimes.com</a> and we will try to respond within 30 minutes.</p>
				        <p>If you want to make charts, jump in and we will help you edit them. Our goal is to help you smartly leverage the language of graphics for your stories.</p>
				        <p>First time here? Please take a moment and read the <a href="http://stockserver.usa.tribune.com/chartbuilder-lat/instructions.html">instructions</a>.</p>
				        <p>ChartBuilder is an open source project created by <a href="https://github.com/Quartz/Chartbuilder/">Quartz</a>. Let us know if you <a href="mailto:yyartist@latimes.com?Subject=ChartBuilder bug report">find any bugs</a>.</p>
		        	</div>
		        </div>
		        );
	}
});

module.exports = Instructions;
