// Export chart to PNG or SVG

var React = require('react');
var update = require("react-addons-update");
var cx = require("classnames");
var PropTypes = React.PropTypes;
var d3 = require("d3");

var Button = require("chartbuilder-ui").Button;
var saveSvgAsPng = require("save-svg-as-png");

var ChartMetadataStore = require("../stores/ChartMetadataStore");
var ChartViewActions = require("../actions/ChartViewActions");

function outerHTML(el) {
	var outer = document.createElement("div");
	outer.appendChild(el);
	return outer.innerHTML;
}

/**
 * ### Buttons that allow the user to export a chart to an image or Svg.
 * @instance
 * @memberof editors
 */
var ChartExport = React.createClass({

	propTypes: {
		stepNumber: PropTypes.string,
		svgWrapperClassName: PropTypes.string.isRequired,
		enableJSONExport: PropTypes.bool,
		sendBase64String: PropTypes.func
	},

	getDefaultProps: function() {
		return {
			enableJSONExport: false,
			slugEditable: false,
		};
	},

	getInitialState: function() {
		return {
			enableSvgExport: true,
			slugEditable: true
		};
	},

	componentDidMount: function() {
		var enableSvgExport;
		var chartNode = null;

		// SVG output won't work on most non-Chrome browsers, so we try it first. If
		// `createSVGFile()` doesnt work we will disable svg download but still allow png.
		// TODO: figure out what exactly is breaking FF
		var chart = document
			.getElementsByClassName(this.props.svgWrapperClassName)[0]
			.getElementsByClassName("renderer-svg")[0];

		this.setState({
			chartNode: chart,
			enableSvgExport: true
		});
	},

	componentWillReceiveProps: function(nextProps) {
		var chart = document
			.getElementsByClassName(this.props.svgWrapperClassName)[0]
			.getElementsByClassName("renderer-svg")[0];

		this.setState({ chartNode: chart });
	},

	_addIDsForIllustrator: function(node) {
		var chart = d3.select(node);
		var classAttr = "";

		chart
			.attr("id","chartbuilder-export")
			.selectAll("g")
			.attr("id",function(d,i){
				try {
					classAttr = this.getAttribute("class").split(" ");
					return classAttr.join("::") + (classAttr == "tick" ? "::" + this.textContent : "");
				}
				catch(e) {
					return null;
				}
			});

		return chart[0][0];
	},

	_makeFilename: function(extension) {
		var filename = this.props.metadata.slug;
		return [
			filename,
			extension
		].join(".");
	},

	downloadPNG: function() {
		var self = this;
		var filename = this._makeFilename("png");
		var slug = this.props.metadata.slug;
		var svgFilename = this._makeFilename("svg");
		var chart = this._addIDsForIllustrator(this.state.chartNode);
		var sendToServer = this._sendToServer;

		saveSvgAsPng.saveSvgAsPng(this.state.chartNode, filename, { scale: 2.0 });

		// Save PNG to server
		saveSvgAsPng.svgAsPngUri(self.state.chartNode, { scale: 2.0 }, function(pngUri){
			sendToServer(filename, slug, pngUri, function () {
				// Save SVG to server
				saveSvgAsPng.svgAsDataUri(chart, { responsive: true }, function(uri) {
					sendToServer(svgFilename, slug, uri, function() {
						self.downloadJSON(true);
					});
				});
			});
		});

	},

	_autoClickDownload: function(filename, href) {
		var a = document.createElement('a');
		a.download = filename;
		a.href = href;
		document.body.appendChild(a);
		a.addEventListener("click", function(e) {
			a.parentNode.removeChild(a);
		});
		a.click();
	},

	_sendToServer: function(filename, slug, uri, cb) {
		var params = "name=" + filename + "&slug=" + slug + "&filedata=" + encodeURIComponent(uri);
		var postrequest = new XMLHttpRequest();
		postrequest.open("POST", "http://stockserver.usa.tribune.com/chartbuilder-lat/chartbuilder-writer-2.0.php", true);
		postrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		postrequest.onreadystatechange = function() {
			if (postrequest.readyState == 4 && postrequest.status == 200) {
				if (cb && typeof(cb) === "function") {
					cb();
				}
			}
		}

		postrequest.send(params);
	},

	_sendToP2P: function(slug, uri, cb) {
		console.log("sending to p2p");
		var params = "slug=" + slug + "&data=" +  encodeURIComponent(uri);
		var postrequest = new XMLHttpRequest();
		postrequest.open("POST", "/send-to-p2p/", true);
		postrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		postrequest.onreadystatechange = function() {
			if (postrequest.readyState == 4 && postrequest.status == 200) {
				// Probably should have something render on success

				if (cb && typeof(cb) === "function") {
					cb();
				}
			}
		}
		postrequest.send(params);

	},


	// renamed from downloadSVG
	// Saves chart as a blurb in P2P, and saves to stockserver as SVG, PNG and JSON
	exportChart: function() {
		var self = this;
		var filename = this._makeFilename("svg");
		var pngFilename = this._makeFilename("png");
		var slug = this.props.metadata.slug;
		var chart = this._addIDsForIllustrator(this.state.chartNode);
		var autoClickDownload = this._autoClickDownload;
		var sendToServer = this._sendToServer;
		var sendToP2P = this._sendToP2P;
		var instructions = document.getElementById('export-instructions');

		// Set the slug to be not editable and show the final instructions
		ChartViewActions.updateMetadata('slugEditable', false);
		instructions.classList.remove("hidden");

		saveSvgAsPng.svgAsDataUri(chart, { responsive: true }, function(uri) {
			sendToP2P(slug, uri);

			sendToServer(filename, slug, uri, function() {
				saveSvgAsPng.svgAsPngUri(chart, { scale: 2.0 }, function(pngUri){
					sendToServer(pngFilename, slug, pngUri, function() {
						self.downloadJSON(true);
					});
				});
			});
		});


	},

	downloadJSON: function(sendToServer) {
		json_string = JSON.stringify({
			chartProps: this.props.model.chartProps,
			metadata: this.props.model.metadata
		}, null, "\t");

		var filename = this._makeFilename("json");

		// If sendToServer is specified, save it to our server.
		// Otherwise, simply download the file (which we won't normally do.)
		if (sendToServer) {
			var base64json = btoa(json_string);
			this._sendToServer(filename, this.props.metadata.slug, encodeURIComponent(base64json));
		} else {
			var href = "data:text/json;charset=utf-8," + encodeURIComponent(json_string);
			this._autoClickDownload(filename, href);
		}

	},

	setAdvancedOptionState: function() {
		this.setState({
			showAdvancedOptions: !this.state.showAdvancedOptions
		});
	},

	render: function() {
		var self = this;

		var chartExportButtons = [];

		if (this.state.enableSvgExport) {
			chartExportButtons.push(
				<Button
					key="svg-export"
					className="export-button"
					onClick={this.exportChart}
					text="Export to P2P"
				/>
			);
		}

		if (this.props.enableJSONExport) {
			chartExportButtons.push(
				<Button
					key="json-export"
					className="export-button"
					onClick={this.downloadJSON}
					text="JSON"
				/>
			);
		}

		return (
			<div className="editor-options">
				<h2><span className="step-number">{this.props.stepNumber}</span><span>Export your chart</span></h2>
					<div className="export-button-wrapper">
						{chartExportButtons}
					</div>
				<div className="instructions hidden" id="export-instructions">
			        <p>That's it, you're done! You can find your chart in P2P under the slug<br/><span className='slug-label'><a target="_blank" href={'/get-p2p-admin-url/?slug=' + this.props.metadata.slug}>{this.props.metadata.slug}-chartbuilder</a></span>.</p>
		        </div>
		        <p>ChartBuilder is an open source project created by <a href="https://github.com/Quartz/Chartbuilder/">Quartz</a>. Let us know if you <a href="mailto:yyartist@latimes.com?Subject=ChartBuilder bug report">find any bugs</a>.</p>
			</div>
		);
	}
})

module.exports = ChartExport;
